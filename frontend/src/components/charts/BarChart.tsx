import { useState } from "react";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { scaleBand, scaleLinear } from "@visx/scale";
import {
  defaultStyles as tooltipDefaultStyles,
  TooltipWithBounds,
  useTooltip,
} from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";

export type DataPoint = { x: string; y: number; id?: string };

interface BarChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  selected?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
  integerYTicks?: boolean;

  median?: number;
  quartile1?: number;
  quartile3?: number;

  color?: string;
  tooltipRender?: (data: DataPoint) => JSX.Element;
  onBarClick?: (data: DataPoint) => void;

  barColor?: string;
  axisLineColor?: string;
  tickLabelColor?: string;
}

const selectedBarColor = "var(--pink-400)";
const selectedBarStroke = "var(--pink-600)";

const BarChart = ({
  data,
  width,
  height,
  margin = { top: 20, right: 20, bottom: 160, left: 60 },
  selected,
  integerYTicks,
  median,
  quartile1,
  quartile3,
  tooltipRender,
  color,
  onBarClick,
  barColor = "var(--blue-300)",
  axisLineColor = "var(--gray-200)",
  tickLabelColor = "var(--gray-500)",
}: BarChartProps) => {
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipLeft = 0,
    tooltipTop = 0,
    tooltipData,
  } = useTooltip<DataPoint>({
    // initial tooltip state
    tooltipOpen: true,
    tooltipLeft: width! / 3,
    tooltipTop: height! / 3,
    tooltipData: undefined,
  });

  const [hoveredBar, setHoveredBar] = useState<DataPoint | undefined>(
    undefined,
  );

  // Bounds
  const xMax = width! - margin.left - margin.right;
  const yMax = height! - margin.top - margin.bottom;

  // Scales
  const xScale = scaleBand<string>({
    range: [0, xMax],
    round: true,
    domain: data.map((d) => d.x),
    padding: 0.4,
  });
  const yScale = scaleLinear<number>({
    range: [yMax, 0],
    round: true,
    domain: [0, Math.max(...data.map((d) => d.y))],
  });
  const integerYTickValues = yScale.ticks().filter(Number.isInteger);

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
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
            // numTicks={Math.max(...data.map(d => d.y))}
            tickLabelProps={() => ({
              fill: tickLabelColor,
              fontSize: 11,
              textAnchor: "end",
              verticalAnchor: "middle",
              transform: "translate(-5, 0)",
            })}
          />
          <AxisBottom
            scale={xScale}
            top={yMax}
            stroke={axisLineColor}
            numTicks={35}
            tickStroke={axisLineColor}
            tickLabelProps={(value) => ({
              fill: tickLabelColor,
              fontSize: 11,
              textAnchor: "end",
              transform: `rotate(-40 ${
                xScale(value)! + xScale.bandwidth() / 2
              }, ${0}) translate(-10, 0)`,
            })}
          />
          {data.map((d) => (
            <Bar
              key={d.x}
              x={xScale(d.x)}
              y={yScale(d.y)}
              height={yMax - yScale(d.y)}
              width={xScale.bandwidth()}
              rx={3}
              cursor="pointer"
              stroke={selected === d.x ? selectedBarStroke : "none"}
              strokeWidth={selected === d.x ? 3 : 0}
              fill={selected === d.x ? selectedBarColor : color ?? barColor}
              opacity={hoveredBar?.x === d.x ? 1 : 0.8}
              onMouseMove={(e) => {
                if (!e.currentTarget?.ownerSVGElement) return;
                const svgRect =
                  e.currentTarget.ownerSVGElement.getBoundingClientRect();
                const tooltipX = e.clientX - svgRect.left; // Adjust for exact positioning
                const tooltipY = e.clientY - svgRect.top; // Adjust for exact positioning
                setHoveredBar(d);
                showTooltip({
                  tooltipLeft: tooltipX,
                  tooltipTop: tooltipY,
                  tooltipData: d,
                });
              }}
              onMouseLeave={() => {
                hideTooltip();
                setHoveredBar(undefined);
              }}
              onClick={() => onBarClick?.(d)}
            />
          ))}

          {median && (
            <>
              <line
                x1={0}
                x2={xMax}
                y1={yScale(median)}
                y2={yScale(median)}
                stroke="var(--gray-200)"
                strokeDasharray="4 4"
              />
              <text
                x={xMax}
                y={yScale(median)}
                dx={-5}
                dy={-5}
                fill="var(--gray-300)"
                fontSize={11}
                textAnchor="end"
              >
                {`Median: ${median.toFixed(1)}`}
              </text>
            </>
          )}

          {quartile1 && (
            <>
              <line
                x1={0}
                x2={xMax}
                y1={yScale(quartile1)}
                y2={yScale(quartile1)}
                stroke="var(--gray-200)"
                strokeDasharray="2 6"
              />
              <text
                x={xMax}
                y={yScale(quartile1)}
                dx={-5}
                dy={-5}
                fill="var(--gray-300)"
                fontSize={11}
                textAnchor="end"
              >
                {`P25: ${quartile1.toFixed(1)}`}
              </text>
            </>
          )}

          {quartile3 && (
            <>
              <line
                x1={0}
                x2={xMax}
                y1={yScale(quartile3)}
                y2={yScale(quartile3)}
                stroke="var(--gray-200)"
                strokeDasharray="2 6"
              />
              <text
                x={xMax}
                y={yScale(quartile3)}
                dx={-5}
                dy={-5}
                fill="var(--gray-300)"
                fontSize={11}
                textAnchor="end"
              >
                {`P75: ${quartile3.toFixed(1)}`}
              </text>
            </>
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
            backgroundColor: "var(--gray-600)",
            color: "white",
            zIndex: 100,
          }}
        >
          {tooltipRender ? (
            tooltipRender(tooltipData)
          ) : (
            <div className="p-1 flex flex-col gap-1">
              <span className="font-bold">{tooltipData.x}</span>
              <span>{tooltipData.y.toFixed(integerYTicks ? 0 : 2)}</span>
            </div>
          )}
        </TooltipWithBounds>
      )}
    </div>
  );
};
export default BarChart;

export const ResponsiveChart = (props: BarChartProps) => {
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
          <BarChart {...props} width={width} height={height} />
        )}
      </ParentSize>
    </div>
  );
};
