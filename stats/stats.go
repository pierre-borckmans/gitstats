package stats

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gitstats/events"
	"gitstats/git"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

// CommitDay represents the number of commits on a specific day.
type CommitDay struct {
	Date         string `json:"date"`
	Count        int    `json:"count"`
	LinesAdded   int    `json:"lines_added"`
	LinesRemoved int    `json:"lines_removed"`
}

// Contributor represents a contributor with their name, commit count, lines added, lines removed, and daily commit counts.
type Contributor struct {
	Name          string      `json:"name"`
	CommitCount   int         `json:"commit_count"`
	LinesAdded    int         `json:"lines_added"`
	LinesRemoved  int         `json:"lines_removed"`
	CommitsPerDay []CommitDay `json:"commits_per_day"`
}

type Commits struct {
	CommitsPerDay []CommitDay `json:"commits_per_day"`
	Total         int         `json:"total"`
}

type Stats struct {
	Commits      Commits
	Contributors []Contributor `json:"contributors"`
}

// getContributors returns a list of all contributors in the repository.
func getContributors(repoPath string) ([]string, error) {
	branchOut, err := git.RunGitCommand(repoPath, "symbolic-ref", "--short", "refs/remotes/origin/HEAD")
	if err != nil {
		return nil, fmt.Errorf("error running git symbolic-ref: %v", err)
	}
	branch := strings.TrimSpace(string(branchOut))

	out, err := git.RunGitCommand(repoPath, "shortlog", branch, "-sn")
	if err != nil {
		return nil, fmt.Errorf("error running git shortlog: %v", err)
	}

	var contributors []string
	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		line := scanner.Text()
		// Remove leading commit count and any extra whitespace
		name := strings.TrimSpace(line[strings.Index(line, "\t")+1:])
		contributors = append(contributors, name)
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return contributors, nil
}

func getCommits(repoPath string) (*Commits, error) {
	out, err := git.RunGitCommand(repoPath, "log", "--date=short", "--pretty=format:%ad")
	if err != nil {
		return nil, fmt.Errorf("error running git log: %v", err)
	}

	commits := make([]CommitDay, 0)

	commitsPerDayMap := make(map[string]int)
	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		line := scanner.Text()
		date := line
		commitsPerDayMap[date]++
	}

	total := 0
	for date, count := range commitsPerDayMap {
		total += count
		commits = append(commits, CommitDay{Date: date, Count: count})
	}

	return &Commits{CommitsPerDay: commits, Total: total}, nil
}

func getContributorStats(repoPath, contributor string) (int, int, int, []CommitDay, error) {
	// Get commits and their dates
	outCommits, err := git.RunGitCommand(repoPath, "log", "--author="+contributor, "--pretty=format:%H %cd", "--date=short")
	if err != nil {
		return 0, 0, 0, nil, fmt.Errorf("error running git log for commits: %v", err)
	}

	commitCount := 0
	commitsPerDayMap := make(map[string]*CommitDay)
	scanner := bufio.NewScanner(bytes.NewReader(outCommits))
	for scanner.Scan() {
		commitCount++
		line := scanner.Text()
		parts := strings.Split(line, " ")
		if len(parts) < 2 {
			continue
		}
		date := parts[1]
		if _, exists := commitsPerDayMap[date]; !exists {
			commitsPerDayMap[date] = &CommitDay{Date: date}
		}
		commitsPerDayMap[date].Count++
	}

	if err := scanner.Err(); err != nil {
		return 0, 0, 0, nil, err
	}

	// Get lines added and removed
	outLines, err := git.RunGitCommand(repoPath, "log", "--author="+contributor, "--pretty=format:%cd", "--date=short", "--numstat")
	if err != nil {
		return 0, 0, 0, nil, fmt.Errorf("error running git log for lines: %v", err)
	}

	var linesAdded, linesRemoved int
	scanner = bufio.NewScanner(bytes.NewReader(outLines))
	var currentDate string
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			currentDate = ""
			continue
		}
		if len(line) == 10 { // Date line
			currentDate = strings.TrimSpace(line)
			continue
		}

		if currentDate != "" {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				var added, removed int
				fmt.Sscanf(fields[0], "%d", &added)
				fmt.Sscanf(fields[1], "%d", &removed)
				linesAdded += added
				linesRemoved += removed
				if _, exists := commitsPerDayMap[currentDate]; exists {
					commitsPerDayMap[currentDate].LinesAdded += added
					commitsPerDayMap[currentDate].LinesRemoved += removed
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return 0, 0, 0, nil, err
	}

	// Convert map to sorted slice
	var commitsPerDay []CommitDay
	for _, stats := range commitsPerDayMap {
		commitsPerDay = append(commitsPerDay, *stats)
	}
	sort.Slice(commitsPerDay, func(i, j int) bool {
		di, _ := time.Parse("2006-01-02", commitsPerDay[i].Date)
		dj, _ := time.Parse("2006-01-02", commitsPerDay[j].Date)
		return di.Before(dj)
	})

	return commitCount, linesAdded, linesRemoved, commitsPerDay, nil
}

func GetStats(ctx context.Context, repoPath string) (*Stats, error) {

	// Verify that the repoPath is a valid directory
	if _, err := os.Stat(repoPath); os.IsNotExist(err) {
		fmt.Printf("Repository path %s does not exist.\n", repoPath)
		return nil, err
	}

	contributors, err := getContributors(repoPath)
	if err != nil {
		fmt.Println("Error getting contributors:", err)
		return nil, err
	}
	runtime.EventsEmit(ctx, string(events.Contributors), contributors)

	commits, err := getCommits(repoPath)
	if err != nil {
		fmt.Println("Error getting commits:", err)
		return nil, err
	}
	runtime.EventsEmit(ctx, string(events.Commits), commits)

	var wg sync.WaitGroup
	var mu sync.Mutex

	stats := make([]Contributor, 0, len(contributors))
	for _, contributor := range contributors {
		wg.Add(1)
		go func(contributor string) {
			defer wg.Done()
			commitCount, linesAdded, linesRemoved, commitsPerDay, err := getContributorStats(repoPath, contributor)
			if err != nil {
				fmt.Printf("Error getting stats for %s: %s\n", contributor, err)
				return
			}
			mu.Lock()
			contribStats := Contributor{
				Name:          contributor,
				CommitCount:   commitCount,
				LinesAdded:    linesAdded,
				LinesRemoved:  linesRemoved,
				CommitsPerDay: commitsPerDay,
			}
			stats = append(stats, contribStats)
			runtime.EventsEmit(ctx, string(events.ContributorStats), contribStats)
			mu.Unlock()
		}(contributor)
	}

	wg.Wait()

	fmt.Println("All stats computed")

	runtime.EventsEmit(ctx, string(events.AllStats), stats)

	return &Stats{Contributors: stats}, nil
}
