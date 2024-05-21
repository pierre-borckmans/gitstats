import { Button } from "@/components/ui/button";
import { GetStats } from "../wailsjs/go/main/App";
import { useEffect, useState } from "react";
import { EventsOff, EventsOn } from "../wailsjs/runtime";
import { events, stats } from "../wailsjs/go/models.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DataPoint,
  ResponsiveChart as AreaCurve,
} from "@/components/charts/AreaCurve.tsx";
import { Progress } from "@/components/ui/progress";

import { addDays } from "date-fns";
import ActivityChart from "@/components/charts/Activity.tsx";
type CommitDay = stats.CommitDay;
type Commits = stats.Commits;
type Contributor = stats.Contributor;

function App() {
  const [repoPath, setRepoPath] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [contributors, setContributors] = useState<string[]>([]);
  const [contributorsReceived, setContributorsReceived] = useState(0);
  const [commits, setCommits] = useState<Commits | null>(null);
  const [contributorsStats, setContributorsStats] = useState<Contributor[]>([]);

  useEffect(() => {
    EventsOn(events.Event.Contributors, function (contributors: any) {
      setContributors(contributors);
    });

    EventsOn(events.Event.Commits, function (commits: any) {
      setCommits(commits);
      setDateMin(
        Math.min(
          ...commits?.commits_per_day.map((d: CommitDay) =>
            new Date(d.date).getTime(),
          ),
        ),
      );
      setDateMax(
        Math.max(
          ...commits?.commits_per_day.map((d: CommitDay) =>
            new Date(d.date).getTime(),
          ),
        ),
      );
    });

    EventsOn(events.Event.ContributorStats, function () {
      setContributorsReceived((old) => old + 1);
      // setContributorsStats((stats) => [...stats, contribStats]);
    });

    EventsOn(events.Event.AllStats, function (stats: Contributor[]) {
      setContributorsStats(stats);
    });

    return () => {
      EventsOff(events.Event.Contributors);
      EventsOff(events.Event.ContributorStats);
    };
  }, []);

  const [dateMin, setDateMin] = useState(0);
  const [dateMax, setDateMax] = useState(0);

  const contribData = contributorsStats.map((contributor) => {
    const commits = contributor.commits_per_day.reduce((acc, day) => {
      const date = new Date(day.date).getTime();
      if (date >= dateMin && date <= dateMax) acc += day.count;
      return acc;
    }, 0);

    const added = contributor.commits_per_day.reduce((acc, day) => {
      const date = new Date(day.date).getTime();
      if (date >= dateMin && date <= dateMax) acc += day.lines_added;
      return acc;
    }, 0);

    const removed = contributor.commits_per_day.reduce((acc, day) => {
      const date = new Date(day.date).getTime();
      if (date >= dateMin && date <= dateMax) acc += day.lines_removed;
      return acc;
    }, 0);
    return { contributor, commits, added, removed };
  });

  return (
    <div className="min-h-screen grid place-items-center mx-auto py-8 w-full select-none">
      <div className="text-blue-900 flex flex-col items-center space-y-4 w-full">
        <div className="flex items-center justify-between w-[900px]">
          <div className="flex flex-col items-start space-y-2">
            <span className="text-xl font-bold">Git repo stats</span>
            <input
              type="text"
              className="w-[300px] border-2 border-gray-300 rounded-md p-2"
              value={repoPath}
              placeholder="Path to the repository..."
              onChange={(e) => setRepoPath(e.target.value)}
            />
          </div>
          {dateMin !== 0 && dateMax !== 0 && (
            <span className="text-xl font-bold">
              {new Date(dateMin).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              -{" "}
              {new Date(dateMax).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
          <Button
            disabled={repoPath === ""}
            onClick={async () => {
              setError(null);
              setContributors([]);
              setCommits(null);
              setContributorsReceived(0);
              setContributorsStats([]);
              try {
                await GetStats(repoPath);
              } catch (e: any) {
                setError(JSON.stringify(e));
              }
            }}
          >
            Compute stats...
          </Button>
        </div>
        {error && (
          <div className="text-red-500">Could not compute stats: {error}</div>
        )}
        {commits && (
          <>
            <Commits
              commits={commits}
              onDragChange={(start, end) => {
                setDateMin(
                  start ??
                    Math.min(
                      ...commits?.commits_per_day.map((d) =>
                        new Date(d.date).getTime(),
                      ),
                    ),
                );
                setDateMax(
                  end ??
                    Math.max(
                      ...commits?.commits_per_day.map((d) =>
                        new Date(d.date).getTime(),
                      ),
                    ),
                );
              }}
            />
            <Activity commits={commits} />
          </>
        )}
        <div className="flex flex-col items-center justify-center w-full h-full">
          {contributorsStats.length < contributors.length &&
            contributors.length > 0 && (
              <div className="flex flex-col items-center justify-center w-full h-full gap-2">
                <div>
                  Computing stats for contributor {contributorsReceived}/
                  {contributors.length}
                </div>
                <Progress
                  value={(contributorsReceived / contributors.length) * 100}
                  className="w-40"
                />
              </div>
            )}
          {contributorsStats && (
            <div className="grid grid-cols-2 gap-4 w-fit">
              {contribData
                ?.sort((c1, c2) => (c1.commits < c2.commits ? 1 : -1))
                .map((contributor) => (
                  <Contributor
                    dateMin={dateMin}
                    dateMax={dateMax}
                    key={contributor.contributor.name}
                    name={contributor.contributor.name}
                    contributor={contributor.contributor}
                    commits={contributor.commits}
                    added={contributor.added}
                    removed={contributor.removed}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

const Commits = ({
  commits,
  onDragChange,
}: {
  commits: Commits;
  onDragChange?: (start: number | null, end: number | null) => void;
}) => {
  const data: DataPoint[] = commits.commits_per_day.map((day) => ({
    x: new Date(day.date).getTime(),
    y: day.count,
    color: "var(--blue-300)",
  }));
  const dateMin = Math.min(
    ...commits?.commits_per_day.map((d) => new Date(d.date).getTime()),
  );
  const dateMax = Math.max(
    ...commits?.commits_per_day.map((d) => new Date(d.date).getTime()),
  );

  return (
    <div className="flex flex-col items-center justify-center w-fit h-full bg-[#f6f8fa] rounded">
      <AreaCurve
        height={200}
        width={900}
        margin={{ top: 40, right: 30, bottom: 30, left: 50 }}
        axisLeft
        data={data}
        integerYTicks
        color="#93c09d"
        lines={[50, 100, 150]}
        dateMin={new Date(dateMin).getTime()}
        dateMax={new Date(dateMax).getTime()}
        draggable
        onDragChange={onDragChange}
      />
    </div>
  );
};

const Activity = ({ commits }: { commits: Commits }) => {
  const data: DataPoint[] = commits.commits_per_day.map((day) => ({
    x: new Date(day.date).getTime(),
    y: day.count,
  }));
  return (
    <div className="flex flex-col items-center justify-center w-fit h-full bg-[#f6f8fa] rounded">
      <ActivityChart width={900} data={data} />
    </div>
  );
};

const Contributor = ({
  dateMin,
  dateMax,
  name,
  contributor,
  commits,
  added,
  removed,
}: {
  dateMin: number;
  dateMax: number;
  name: string;
  contributor: Contributor;
  commits: number;
  added: number;
  removed: number;
}) => {
  if (!contributor) return null;
  // map over all dates between 2020-01-01 and today

  const data: DataPoint[] = contributor.commits_per_day.map((day) => ({
    x: new Date(day.date).getTime(),
    y: day.count,
  }));

  data.push({
    x: addDays(new Date(dateMax).getTime(), 1).getTime(),
    y: 0,
  });

  return (
    <Card className="w-[440px] min-h-0 flex flex-col">
      <CardHeader className="space-y-0 py-2">
        <CardTitle className="text-xl cursor-pointer">{name}</CardTitle>
        <CardDescription>
          <span className="flex items-center gap-4">
            <span>{commits.toLocaleString("en-US")} commits</span>
            <span className="text-green-500">
              {added.toLocaleString("en-US")} ++
            </span>
            <span className="text-red-500">
              {removed.toLocaleString("en-US")} --
            </span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className={"flex w-full h-full bg-[#f6f8fa] py-2"}>
        <div className="flex flex-col items-center justify-center w-full h-full">
          <AreaCurve
            margin={{ top: 40, right: 0, bottom: 30, left: 0 }}
            height={180}
            data={data}
            integerYTicks
            color="#f68900"
            dateMin={new Date(dateMin).getTime()}
            dateMax={new Date(dateMax).getTime()}
            maxCount={50}
            lines={[20, 40]}
          />
        </div>
      </CardContent>
    </Card>
  );
};
