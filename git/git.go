package git

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func RunGitCommand(repoPath string, args ...string) ([]byte, error) {
	cmd := exec.Command("git", append([]string{"-C", repoPath}, args...)...)
	cmd.Env = append(os.Environ(), "GIT_PAGER=cat") // Disable the pager
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out // Capture stderr as well for debugging

	fmt.Printf("Running command: git %s\n", strings.Join(cmd.Args[1:], " ")) // Debug print
	err := cmd.Run()
	if err != nil {
		fmt.Printf("Error running command: %s\n", err) // Print error for debugging
		fmt.Printf("Output: %s\n", out.String())       // Print command output for debugging
		return nil, err
	}

	if out.Len() == 0 {
		return nil, fmt.Errorf("no output from git %s", strings.Join(args, " "))
	}

	return out.Bytes(), nil
}
