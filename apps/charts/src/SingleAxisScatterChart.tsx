/**
 * SingleAxisScatterChart —— 单轴散点图
 */

import { Animation, Ellipse } from '@react-viz-composer/core';
import {
  Axis,
  Grid,
} from '@react-viz-composer/kit';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  scaleLinear,
  SEMANTIC_6,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface Point {
  value: number;
  size: number;
  group: number;
}

interface Props extends ChartItemHoverProps<Point> {
  data?: Point[];
}

const POINT_PLAYBOOK = [
  { attribute: 'cx', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 30 },
  { attribute: 'rx', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 30 },
  { attribute: 'ry', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 30 },
] as const;

/**
 * 单轴散点图
 */
export function SingleAxisScatterChart(props: Props) {
  return (
    <ChartFrame>
      <SingleAxisScatterChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function SingleAxisScatterChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: Point): string => `${p.value}-${p.size}-${p.group}`,
  );

  const points: Point[] = data ?? [
    { value: 25, size: 20, group: 0 },
    { value: 40, size: 35, group: 1 },
    { value: 55, size: 15, group: 2 },
    { value: 30, size: 50, group: 3 },
    { value: 70, size: 25, group: 4 },
    { value: 45, size: 40, group: 0 },
    { value: 60, size: 30, group: 1 },
    { value: 20, size: 45, group: 2 },
    { value: 80, size: 18, group: 3 },
    { value: 50, size: 28, group: 4 },
    { value: 35, size: 22, group: 0 },
    { value: 65, size: 38, group: 1 },
    { value: 48, size: 32, group: 2 },
    { value: 72, size: 42, group: 3 },
    { value: 58, size: 16, group: 4 },
  ];

  const xMax = Math.max(...points.map((p) => p.value)) * 1.1;
  const xScale = scaleLinear([0, xMax], [0, plotWidth]);
  const yCenter = plotHeight / 2;
  const sizeDomain = Math.max(...points.map((p) => p.size));
  const sizeScale = scaleLinear([0, sizeDomain], [3, 18]);

  return (
    <>
      <Grid scale={xScale} orient="x"  length={plotHeight} />
      <Animation playbook={POINT_PLAYBOOK.map((step) =>
        step.attribute === 'cx'
          ? { ...step, from: 0 }
          : step,
      )}>
        {points.map((p, i) => {
          const color = SEMANTIC_6[p.group % SEMANTIC_6.length];
          const key = `${p.value}-${p.size}-${p.group}`;
          const r = sizeScale(p.size) + (isHovering(key) ? 3 : 0);
          return (
            <Ellipse
              key={i}
              cx={xScale(p.value)}
              cy={yCenter}
              rx={r}
              ry={r}
              fill={color + '99'}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1.5, isHovering(key))}
              {...bindHover(p)}
            />
          );
        })}
      </Animation>
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
    </>
  );
}


export default SingleAxisScatterChart;
