/**
 * TimelineChart —— 时间线 / 事件图
 *
 * 水平时间轴，事件标记为圆点 + 文本标签。
 */

import { useMemo } from 'react';
import { Line, Ellipse, Text, Group } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animValue } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleLinear } from './shared/scales';
import { CATEGORY_12, TEXT_COLOR } from './shared/palette';

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

export function TimelineChart(props: Props) {
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

  // 将时间字符串映射为数值索引
  const indices = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.time.localeCompare(b.time));
    return sorted.map((e, i) => ({ ...e, index: i }));
  }, [events]);

  const n = indices.length;
  const xScale = useMemo(
    () => scaleLinear([0, n - 1], [40, PLOT_WIDTH - 40]),
    [n],
  );

  const axisY = PLOT_HEIGHT / 2;

  return (
    <ChartFrame>
      {(progress) => (
        <>
          {/* 时间轴线 */}
          <Line
            points={[
              { x: 20, y: axisY },
              { x: PLOT_WIDTH - 20, y: axisY },
            ]}
            stroke="#d9d9d9"
            strokeWidth={2}
          />

          {indices.map((e, i) => {
            const px = xScale(i);
            const isTop = i % 2 === 0;
            const labelY = axisY + (isTop ? -28 : 28);
            const lineEndY = axisY + (isTop ? -14 : 14);
            const dotR = isHovering(`${e.time}-${e.label}`) ? 7 : 5;
            const typeColor = e.type
              ? CATEGORY_12[['milestone', 'review', 'dev', 'test', 'release'].indexOf(e.type ?? '') % CATEGORY_12.length]
              : CATEGORY_12[0];

            const payload: TimelineHoverPayload = {
              time: e.time,
              label: e.label,
              type: e.type ?? 'default',
            };

            return (
              <Group key={`${e.time}-${e.label}`}>
                {/* 连接线 */}
                {animValue(1, progress) > 0.3 && (
                  <Line
                    points={[
                      { x: px, y: axisY },
                      { x: px, y: lineEndY },
                    ]}
                    stroke="#d9d9d9"
                    strokeWidth={1}
                  />
                )}

                {/* 事件圆点 */}
                <Ellipse
                  cx={px}
                  cy={axisY}
                  rx={dotR}
                  ry={dotR}
                  fill={typeColor}
                  stroke="#fff"
                  strokeWidth={hoverStrokeWidth(2, isHovering(`${e.time}-${e.label}`))}
                  {...bindHover(payload)}
                />

                {/* 标签 */}
                {progress > 0.3 && (
                  <>
                    <Text
                      x={px}
                      y={labelY + 4}
                      text={e.label}
                      fontSize={11}
                      fontFamily="sans-serif"
                      fill={TEXT_COLOR}
                      textAlign="middle"
                    />
                    <Text
                      x={px}
                      y={axisY + (isTop ? -14 : 14) + (isTop ? -4 : 14)}
                      text={e.time}
                      fontSize={9}
                      fontFamily="sans-serif"
                      fill="#bfbfbf"
                      textAlign="middle"
                    />
                  </>
                )}
              </Group>
            );
          })}
        </>
      )}
    </ChartFrame>
  );
}

export default TimelineChart;
