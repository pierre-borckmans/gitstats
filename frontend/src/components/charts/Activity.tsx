import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { HeatmapRect } from "@visx/heatmap";
import { getDay, getWeek, getYear } from "date-fns";

const cool1 = "#b4fbde33";
const cool2 = "#b4fbde";
const cool3 = "#122549";

function max<Datum>(data: Datum[], value: (d: Datum) => number): number {
  return Math.max(...data.map(value));
}
const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
const weekDaysWidth = 20;

const defaultMargin = { top: 20, left: 25, right: 25, bottom: 20 };

type ActivityBin = {
  week: number;
  days: WeekBin[];
};

type WeekBin = {
  day: number;
  count: number;
};
const getDaysBins = (d: ActivityBin) => d.days;
const getDayCount = (d: WeekBin) => d.count;

export type DataPoint = { x: number; y: number; id?: string };

export type HeatmapProps = {
  width: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  separation?: number;
  events?: boolean;
  data: DataPoint[];
  gap?: number;
  minWeeks?: number;
  maxWeeks?: number;
};

function ActivityChart({
  width,
  data,
  minWeeks = 52,
  maxWeeks = 52,
  gap = 3,
  margin = defaultMargin,
}: HeatmapProps) {
  // create bin data from data
  // the output must be an array of { week: number, days: { day: number, count: string }[] }
  // use d3-date to get the week number and the day of the week

  const minYear = Math.min(...data.map((d) => getYear(d.x)));
  const minWeek = Math.min(
    ...data.filter((d) => getYear(d.x) === minYear).map((d) => getWeek(d.x)),
  );
  const weekNumber = (year: number, week: number) => {
    return (year - minYear) * 52 + week - minWeek;
  };

  const binData = data.reduce((acc, d) => {
    const year = getYear(d.x);
    const week = getWeek(d.x);
    const day = getDay(d.x);
    const weekNr = weekNumber(year, week);
    if (!acc.find((b) => b.week === weekNr)) {
      acc.push({ week: weekNr, days: [] });
    }
    const weekBin = acc.find((b) => b.week === weekNr)!;
    if (!weekBin.days.find((d) => d.day === day)) {
      weekBin.days.push({ day, count: 0 });
    }
    const dayBin = weekBin.days.find((d) => d.day === day)!;
    dayBin.count += d.y;
    return acc;
  }, [] as ActivityBin[]);
  binData.sort((a, b) => a.week - b.week);
  binData.forEach((week) => {
    week.days.sort((a, b) => a.day - b.day);
  });

  const nbWeeks = binData.length;
  const nbWeeksVisible = Math.min(Math.max(nbWeeks, minWeeks), maxWeeks);

  const height =
    ((width - margin.left - margin.right) / nbWeeksVisible) * 7 +
    margin.top +
    margin?.bottom;

  // bounds
  const xMaxVisible = width - weekDaysWidth - margin.left - margin.right;
  const binWidth = xMaxVisible / nbWeeksVisible;
  const xMax = binWidth * nbWeeks;
  const svgWidth = xMax + margin.left + margin.right;
  const yMax = height - margin.bottom - margin.top;

  // scales
  const xScale = scaleLinear<number>({
    range: [0, xMax],
    domain: [0, nbWeeks],
  });
  const yScale = scaleLinear<number>({
    domain: [0, 7],
    range: [0, yMax],
  });
  const colorMax = max(binData, (d) => max(getDaysBins(d), getDayCount));
  const colorScale = scaleLinear<string>({
    range: [cool1, cool2, cool3],
    domain: [0, 1, colorMax],
  });

  const binHeight = yMax / 7;

  return (
    <div className="flex items-center ">
      <div style={{ height, width: margin?.left + weekDaysWidth }}>
        <svg width={"100%"} height={height}>
          <Group top={margin.top} left={margin.left}>
            {weekDays.map((d, i) => (
              <text
                key={d}
                x={weekDaysWidth / 2}
                y={yScale(i + 1) - binHeight / 2 + gap / 2}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize={12}
                fill="var(--gray-500)"
                className="font-bold font-mono"
              >
                {d}
              </text>
            ))}
          </Group>
        </svg>
      </div>

      <div
        style={{ height, width: width - margin?.left - weekDaysWidth }}
        className="overflow-scroll"
      >
        <svg width={svgWidth} height={height}>
          <Group top={margin.top} left={weekDaysWidth / 2}>
            <HeatmapRect
              data={binData}
              bins={getDaysBins}
              count={getDayCount}
              xScale={(d) => xScale(d) ?? 0}
              yScale={(d) => yScale(d) ?? 0}
              colorScale={colorScale}
              binWidth={binWidth}
              binHeight={binHeight}
              gap={3}
            >
              {(heatmap) => {
                return heatmap.map((heatmapBins) =>
                  heatmapBins.map((bin) => (
                    <rect
                      key={`heatmap-rect-${bin.row}-${bin.column}`}
                      className="cursor-pointer"
                      width={bin.width}
                      height={bin.height}
                      x={bin.x}
                      y={bin.y}
                      fill={bin.color}
                      rx={3}
                    />
                  )),
                );
              }}
            </HeatmapRect>
          </Group>
        </svg>
      </div>
    </div>
  );
}

export default ActivityChart;
