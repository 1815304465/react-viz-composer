/**
 * GanttChart —— 甘特图
 */

import { Rect, Text, Line } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animSize } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleLinear, scaleBand } from './shared/scales';
import { Axis } from './shared/Axis';
import { CATEGORY_12 } from './shared/palette';

interface GanttTask {
  name: string;
  start: number;
  duration: number;
  color?: string;
}

interface Props extends ChartItemHoverProps<GanttTask> {
  data?: GanttTask[];
}

export function GanttChart(props: Props) {
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
  const xScale = scaleLinear([0, totalDays], [0, PLOT_WIDTH]);
  const yScale = scaleBand(tasks.map((t) => t.name), [0, PLOT_HEIGHT], 0.3);

  return (
    <ChartFrame>
      {(progress) => (
        <>
      {Array.from({ length: totalDays + 1 }).map((_, i) => {
        const x = xScale(i);
        return (
          <Line
            key={`g-${i}`}
            points={[
              { x, y: 0 },
              { x, y: PLOT_HEIGHT },
            ]}
            stroke="#f5f5f5"
            strokeWidth={1}
          />
        );
      })}

      {tasks.map((t, i) => {
        const y = yScale(t.name);
        const x = xScale(t.start);
        const fullW = xScale(t.start + t.duration) - xScale(t.start);
        const w = animSize(fullW, progress);
        const color = t.color ?? CATEGORY_12[i % CATEGORY_12.length];
        const hovered = isHovering(t.name);
        return (
          <Rect
            key={t.name}
            x={x}
            y={y}
            width={w}
            height={yScale.bandwidth}
            fill={color}
            stroke={color}
            strokeWidth={hoverStrokeWidth(1, hovered)}
            {...bindHover(t)}
          />
        );
      })}

      {tasks.map((t) => {
        const y = yScale(t.name);
        const x = xScale(t.start);
        if (progress < 0.3) return null;
        return (
          <Text
            key={`t-${t.name}`}
            x={x + 6}
            y={y + yScale.bandwidth / 2 + 4}
            text={t.name}
            fontSize={11}
            fontFamily="sans-serif"
            fill="#fff"
          />
        );
      })}

      <Axis
        scale={xScale}
        orient="bottom"
        tickCount={totalDays}
        tickFormat={(v) => `${v}d`}
      />
      <Axis scale={yScale} orient="left" />
        </>
      )}
    </ChartFrame>
  );
}

export default GanttChart;
