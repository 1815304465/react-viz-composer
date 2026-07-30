/**
 * GanttChart —— 甘特图
 */

import { Animation, Rect, Text, Line } from 'react-viz-composer';
import {
  Axis,
} from 'react-viz-composer';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  scaleLinear,
  scaleBand,
  CATEGORY_12,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface GanttTask {
  name: string;
  start: number;
  duration: number;
  color?: string;
}

interface Props extends ChartItemHoverProps<GanttTask> {
  data?: GanttTask[];
}

const BAR_PLAYBOOK = [
  { attribute: 'width', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 60 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 60, delay: 200 },
] as const;

/**
 * 甘特图
 */
export function GanttChart(props: Props) {
  return (
    <ChartFrame>
      <GanttChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function GanttChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (t: GanttTask) => t.name,
  );

  const tasks: GanttTask[] = data ?? [
    { name: '需求评审', start: 0, duration: 3, color: '#5B8FF9' },
    { name: 'UI 设计', start: 2, duration: 5, color: '#5AD8A6' },
    { name: '后端开发', start: 4, duration: 8, color: '#F6BD16' },
    { name: '前端开发', start: 5, duration: 9, color: '#E86452' },
    { name: '联调测试', start: 12, duration: 4, color: '#6DC8EC' },
    { name: '发布上线', start: 15, duration: 2, color: '#945FB9' },
  ];

  const totalDays = Math.max(...tasks.map((t) => t.start + t.duration)) + 2;
  const xScale = scaleLinear([0, totalDays], [0, plotWidth]);
  const yScale = scaleBand(tasks.map((t) => t.name), [0, plotHeight], 0.3);

  return (
    <>
      {Array.from({ length: totalDays + 1 }).map((_, i) => {
        const x = xScale(i);
        return (
          <Line
            key={`g-${i}`}
            points={[
              { x, y: 0 },
              { x, y: plotHeight },
            ]}
            stroke="#f5f5f5"
            strokeWidth={1}
          />
        );
      })}
      <Animation playbook={[...BAR_PLAYBOOK]}>
        {tasks.map((t, i) => {
          const y = yScale(t.name);
          const x = xScale(t.start);
          const fullW = xScale(t.start + t.duration) - xScale(t.start);
          const color = t.color ?? CATEGORY_12[i % CATEGORY_12.length];
          return (
            <Rect
              key={t.name}
              x={x}
              y={y}
              width={fullW}
              height={yScale.bandwidth}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(t.name))}
              {...bindHover(t)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {tasks.map((t) => (
          <Text
            key={`t-${t.name}`}
            x={xScale(t.start) + 6}
            y={yScale(t.name) + yScale.bandwidth / 2 + 4}
            text={t.name}
            fontSize={11}
            fontFamily="sans-serif"
            fill="#fff"
            opacity={1}
          />
        ))}
      </Animation>
      <Axis
        scale={xScale}
        orient="bottom"
        length={plotWidth}
        crossAt={plotHeight}
        tickCount={totalDays}
        tickFormat={(v) => `${v}d`}
      />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
    </>
  );
}


export default GanttChart;
