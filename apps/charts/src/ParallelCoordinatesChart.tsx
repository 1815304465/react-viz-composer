/**
 * ParallelCoordinatesChart —— 平行坐标图
 */

import { Animation, Path, Text, Line } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  scaleLinear,
  SEMANTIC_6,
  AXIS_COLOR,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface ParallelHoverPayload {
  row: number;
  axes: string[];
  values: number[];
}

interface Props extends ChartItemHoverProps<ParallelHoverPayload> {
  axes?: string[];
  data?: number[][];
}

const ROW_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOut', targets: 'children', stagger: 80 },
] as const;

/**
 * 构建平行坐标折线路径
 */
function buildRowPath(
  row: number[],
  xPositions: number[],
  axisScales: { scale: ReturnType<typeof scaleLinear> }[],
): string {
  const points = row.map((val, colIdx) => ({
    x: xPositions[colIdx],
    y: axisScales[colIdx].scale(val),
  }));
  return points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
}

/**
 * 平行坐标图
 */
export function ParallelCoordinatesChart(props: Props) {
  return (
    <ChartFrame>
      <ParallelCoordinatesChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function ParallelCoordinatesChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data: rowsData, axes: axesData, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<ParallelHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `row-${p.row}`,
  );

  const axes = axesData ?? ['销售额', '利润率', '增长率', '市场份额', '满意度'];
  const rows = rowsData ?? [
    [85, 42, 18, 35, 88],
    [60, 55, 22, 28, 75],
    [72, 38, 12, 45, 80],
    [90, 60, 25, 50, 70],
    [50, 30, 8, 20, 65],
    [78, 48, 20, 40, 85],
  ];

  const xPositions = axes.map((_, i) => {
    if (axes.length === 1) return plotWidth / 2;
    return (i / (axes.length - 1)) * plotWidth;
  });

  const axisScales = axes.map((_, colIdx) => {
    const min = Math.min(...rows.map((r) => r[colIdx]));
    const max = Math.max(...rows.map((r) => r[colIdx]));
    const range = max - min || 1;
    return {
      min,
      max,
      scale: scaleLinear([min - range * 0.1, max + range * 0.1], [plotHeight, 0]),
    };
  });

  return (
    <>
      {axes.map((axis, i) => (
        <Line
          key={`axis-${i}`}
          points={[
            { x: xPositions[i], y: 0 },
            { x: xPositions[i], y: plotHeight },
          ]}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />
      ))}
      {axes.map((axis, i) => (
        <Text
          key={`axis-label-${i}`}
          x={xPositions[i]}
          y={plotHeight + 18}
          text={axis}
          fontSize={11}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
        />
      ))}
      <Animation playbook={[...ROW_PLAYBOOK]}>
        {rows.map((row, rowIdx) => {
          const color = SEMANTIC_6[rowIdx % SEMANTIC_6.length];
          const hoverKey = `row-${rowIdx}`;
          const payload: ParallelHoverPayload = { row: rowIdx, axes, values: row };
          return (
            <Path
              key={hoverKey}
              d={buildRowPath(row, xPositions, axisScales)}
              fill="none"
              stroke={color}
              strokeWidth={hoverStrokeWidth(1.5, isHovering(hoverKey))}
              opacity={isHovering(hoverKey) ? 1 : 0.75}
              {...bindHover(payload)}
              zIndex={isHovering(hoverKey) ? 10 : 0}
            />
          );
        })}
      </Animation>
    </>
  );
}


export default ParallelCoordinatesChart;
