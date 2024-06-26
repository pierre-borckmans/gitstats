import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { scaleTime, scaleLinear } from "@visx/scale";
import {
  defaultStyles as tooltipDefaultStyles,
  TooltipWithBounds,
  useTooltip,
} from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";
import { AreaClosed, Bar, Line } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { addDays, eachDayOfInterval } from "date-fns";
import { useMemo, useRef, useState } from "react";

export type DataPoint = { x: number; y: number; id?: string };

interface AreaCurveProps {
  data: DataPoint[];
  dateMin: number;
  dateMax: number;
  width?: number;
  height?: number;
  maxCount?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  integerYTicks?: boolean;
  axisLeft?: boolean;
  lines?: number[];

  color?: string;
  tooltipRender?: (data: DataPoint) => JSX.Element;
  onBarClick?: (data: DataPoint) => void;

  barColor?: string;
  axisLineColor?: string;
  tickLabelColor?: string;
  lineColor?: string;

  draggable?: boolean;
  onDragChange?: (start: number | null, end: number | null) => void;
}

const AreaCurve = ({
  data,
  dateMin,
  dateMax,
  maxCount,
  width,
  height,
  margin = { top: 20, right: 20, bottom: 160, left: 60 },
  integerYTicks,
  axisLeft,
  tooltipRender,
  color,
  onDragChange,
  lines = [],
  axisLineColor = "#999",
  lineColor = "#959ba288",
  tickLabelColor = "#999",
  draggable = false,
}: AreaCurveProps) => {
  const {
    tooltipOpen,
    tooltipLeft = 0,
    tooltipTop = 0,
    tooltipData,
    showTooltip,
    hideTooltip,
  } = useTooltip<DataPoint>({
    // initial tooltip state
    tooltipOpen: true,
    tooltipLeft: width! / 3,
    tooltipTop: height! / 3,
    tooltipData: undefined,
  });

  const ref = useRef<SVGRectElement>(null);

  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const aggregatedData = useMemo(() => aggregateData(data, 7), [data]);

  // Bounds
  const xMax = width! - margin.left - margin.right;
  const yMax = height! - margin.top - margin.bottom;

  // Scales
  const xScale = scaleTime({
    range: [0, xMax],
    domain: [dateMin, dateMax],
  });
  const countMax = maxCount ?? Math.max(...aggregatedData.map((d) => d.y));
  const yScale = scaleLinear<number>({
    range: [yMax, 0],
    round: true,
    domain: [0, countMax],
  });
  const integerYTickValues = yScale.ticks().filter(Number.isInteger);

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <Group
          left={margin.left}
          top={margin.top}
          width={width! - margin.left - margin.right}
          height={height! - margin.top - margin.bottom}
          className={draggable ? "cursor-crosshair" : ""}
          onMouseDown={(e) => {
            if (!draggable) return;
            hideTooltip();
            setDragging(true);
            setDragStart(null);
            setDragEnd(null);
            // onDragChange?.(null, null);
            setDragStart(
              e.clientX -
                e.currentTarget.getBoundingClientRect().left -
                margin.right,
            );
          }}
          onMouseLeave={() => {
            hideTooltip();
          }}
          onMouseMove={(e) => {
            const left = e.clientX - ref.current!.getBoundingClientRect().left;
            const x = xScale.invert(left).getTime();
            const y =
              aggregatedData.find(
                (d, i) => x >= d.x && x < aggregatedData[i + 1]?.x,
              )?.y ?? 0;

            if (x < 0) {
              hideTooltip();
              return;
            }

            if (!dragging) {
              showTooltip({
                tooltipTop: yScale(y) - 30,
                tooltipLeft: left + 50,
                tooltipData: {
                  x,
                  y,
                },
              });
            }

            if (!dragging) return;
            setDragEnd(
              e.clientX -
                e.currentTarget.getBoundingClientRect().left -
                margin.right,
            );
          }}
          onMouseUp={() => {
            setDragging(false);
            if (dragEnd === dragStart || !dragEnd) {
              setDragEnd(null);
              setDragStart(null);
              onDragChange?.(null, null);
              return;
            }

            onDragChange?.(
              Math.min(
                xScale.invert(dragStart!).getTime(),
                xScale.invert(dragEnd!).getTime(),
              ),
              Math.max(
                xScale.invert(dragStart!).getTime(),
                xScale.invert(dragEnd!).getTime(),
              ),
            );
          }}
        >
          {axisLeft && (
            <AxisLeft
              tickFormat={(value) =>
                integerYTicks
                  ? Number.isInteger(value)
                    ? value.toString()
                    : ""
                  : value.toString()
              }
              scale={yScale}
              top={0}
              left={0}
              stroke={axisLineColor}
              tickStroke={axisLineColor}
              tickValues={integerYTicks ? integerYTickValues : undefined}
              tickLabelProps={() => ({
                fill: tickLabelColor,
                fontSize: 11,
                textAnchor: "end",
                verticalAnchor: "middle",
                transform: "translate(-5, 0)",
              })}
            />
          )}
          <AxisBottom
            scale={xScale}
            top={yMax}
            stroke={axisLineColor}
            numTicks={5}
            tickStroke={axisLineColor}
            tickLabelProps={() => ({
              fill: tickLabelColor,
              fontSize: 11,
              textAnchor: "end",
              // transform: `rotate(-40)  translate(-10, 0)`,
            })}
          />

          <rect
            ref={ref}
            x={0}
            y={0}
            width={xMax}
            height={yMax}
            fill="transparent"
          />

          <AreaClosed
            data={aggregatedData}
            x={(d) => xScale(new Date(d.x ?? 0))}
            y={(d) => yScale(d.y)}
            yScale={yScale}
            strokeWidth={1}
            stroke={color}
            fill={color}
            curve={curveMonotoneX}
          />

          {lines.map((l) => (
            <Line
              key={l}
              x1={0}
              x2={xMax}
              y1={yScale(l)}
              y2={yScale(l)}
              stroke={lineColor}
              strokeWidth={1}
            />
          ))}

          {tooltipData?.x && tooltipData?.y && (
            <>
              <circle
                cx={xScale(tooltipData.x)}
                cy={yScale(tooltipData.y)}
                r={4}
                fill={`${color}55`}
                stroke={color}
              />
              <line
                x1={xScale(tooltipData.x)}
                x2={xScale(tooltipData.x)}
                y1={0}
                y2={yMax}
                stroke={color}
                strokeWidth={1}
                opacity={0.3}
              />
              <line
                y1={yScale(tooltipData.y)}
                y2={yScale(tooltipData.y)}
                x1={0}
                x2={xMax}
                stroke={color}
                strokeWidth={1}
                opacity={0.3}
              />
            </>
          )}

          {dragStart && dragEnd && (
            <Bar
              x={Math.min(dragStart, dragEnd)}
              y={-margin.top}
              width={Math.abs(dragEnd - dragStart)}
              height={yMax + margin.top}
              stroke={"#9999"}
              fill={"#9992"}
              strokeDasharray={"3,3"}
            />
          )}
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          key={tooltipData.id}
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            ...tooltipDefaultStyles,
            backgroundColor: "#333",
            color: "white",
            zIndex: 100,
          }}
        >
          {tooltipRender ? (
            tooltipRender(tooltipData)
          ) : (
            <div className="p-1 flex flex-col gap-1">
              <span className="font-bold">
                {new Date(tooltipData.x).toLocaleDateString()}
              </span>
              <span>{tooltipData.y.toFixed(integerYTicks ? 0 : 2)}</span>
            </div>
          )}
        </TooltipWithBounds>
      )}
    </div>
  );
};
export default AreaCurve;

export const ResponsiveChart = (props: AreaCurveProps) => {
  return (
    <div
      style={{
        height: props.height ? `${props.height}px` : "",
        width: props.width ? `${props.width}px` : "100%",
      }}
      className={props.height ? "" : "h-80"}
    >
      <ParentSize>
        {({ width, height }) => (
          <AreaCurve {...props} width={width} height={height} />
        )}
      </ParentSize>
    </div>
  );
};

const aggregateData = (data: DataPoint[], days: number): DataPoint[] => {
  if (data.length === 0) return [];

  const dateMin = new Date(Math.min(...data.map((d) => d.x)));
  const dateMax = new Date(Math.max(...data.map((d) => d.x)));
  const intervals = eachDayOfInterval(
    { start: dateMin, end: dateMax },
    { step: days },
  );

  return intervals
    .map((start) => {
      const end = addDays(start, days - 1);
      const intervalData = data.filter((d) => {
        const date = new Date(d.x);
        return date >= start && date <= end;
      });

      const totalY = intervalData.reduce((sum, d) => sum + d.y, 0);

      return { x: start.getTime(), y: totalY };
    })
    .filter(Boolean) as DataPoint[];
};
