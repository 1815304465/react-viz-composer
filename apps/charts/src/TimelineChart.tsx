/**
 * TimelineChart —— 时间线 / 事件图
 */

import { useMemo } from 'react';
import { Animation, Line, Ellipse, Text } from 'react-viz-composer';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  scaleLinear,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface TimelineEvent {
  time: string;
  label: string;
  type?: string;
}

interface TimelineHoverPayload {
  time: string;
  label: string;
  type: string;
}

interface Props extends ChartItemHoverProps<TimelineHoverPayload> {
  data?: TimelineEvent[];
}

const EVENT_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 80 },
] as const;

/**
 * 时间线 / 事件图
 */
export function TimelineChart(props: Props) {
  return (
    <ChartFrame>
      <TimelineChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function TimelineChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: TimelineHoverPayload) => `${p.time}-${p.label}`,
  );

  const events: TimelineEvent[] = data ?? [
    { time: '2024-01', label: '项目启动', type: 'milestone' },
    { time: '2024-03', label: '需求评审', type: 'review' },
    { time: '2024-05', label: '开发阶段', type: 'dev' },
    { time: '2024-08', label: '联调测试', type: 'test' },
    { time: '2024-10', label: '发布上线', type: 'release' },
    { time: '2024-12', label: '年终总结', type: 'milestone' },
  ];

  const indices = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.time.localeCompare(b.time));
    return sorted.map((e, i) => ({ ...e, index: i }));
  }, [events]);

  const n = indices.length;
  const xScale = useMemo(
    () => scaleLinear([0, n - 1], [40, plotWidth - 40]),
    [n],
  );
  const axisY = plotHeight / 2;
  const typeNames = ['milestone', 'review', 'dev', 'test', 'release'];

  return (
    <>
      <Line
        points={[
          { x: 20, y: axisY },
          { x: plotWidth - 20, y: axisY },
        ]}
        stroke="#d9d9d9"
        strokeWidth={2}
      />
      <Animation playbook={[...EVENT_PLAYBOOK]}>
        {indices.flatMap((e, i) => {
          const px = xScale(i);
          const isTop = i % 2 === 0;
          const typeColor = e.type
            ? CATEGORY_12[typeNames.indexOf(e.type ?? '') % CATEGORY_12.length]
            : CATEGORY_12[0];
          const payload: TimelineHoverPayload = {
            time: e.time,
            label: e.label,
            type: e.type ?? 'default',
          };
          const labelY = axisY + (isTop ? -28 : 28);
          const lineEndY = axisY + (isTop ? -14 : 14);
          const hovered = isHovering(`${e.time}-${e.label}`);
          return [
            <Line
              key={`link-${e.time}`}
              points={[{ x: px, y: axisY }, { x: px, y: lineEndY }]}
              stroke="#d9d9d9"
              strokeWidth={1}
              opacity={1}
            />,
            <Ellipse
              key={`dot-${e.time}`}
              cx={px}
              cy={axisY}
              rx={hovered ? 7 : 5}
              ry={hovered ? 7 : 5}
              fill={typeColor}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, hovered)}
              opacity={1}
              {...bindHover(payload)}
            />,
            <Text
              key={`lbl-${e.time}`}
              x={px}
              y={labelY + 4}
              text={e.label}
              fontSize={11}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              textAlign="middle"
              opacity={1}
            />,
            <Text
              key={`time-${e.time}`}
              x={px}
              y={axisY + (isTop ? -14 : 14) + (isTop ? -4 : 14)}
              text={e.time}
              fontSize={9}
              fontFamily="sans-serif"
              fill="#bfbfbf"
              textAlign="middle"
              opacity={1}
            />,
          ];
        })}
      </Animation>
    </>
  );
}


export default TimelineChart;
