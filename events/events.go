package events

type Event string

const (
	Contributors     Event = "Contributors"
	Commits          Event = "Commits"
	ContributorStats Event = "ContributorStats"
	AllStats         Event = "AllStats"
)

var Events = []struct {
	Value  Event
	TSName string
}{
	{Contributors, "Contributors"},
	{Commits, "Commits"},
	{ContributorStats, "ContributorStats"},
	{AllStats, "AllStats"},
}
