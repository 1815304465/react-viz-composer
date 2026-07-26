/**
 * BubbleChart —— 气泡图
 *
 * 体现：Ellipse 半径映射、opacity 分层、RadialGradient、多系列配色
 */

import { useMemo } from 'react';
import {
  Ellipse, Text, RadialGradient,
} from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animSize } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverOpacity, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleLinear } from './shared/scales';
import { Axis, Grid } from './shared/Axis';
import { CATEGORY_12, TEXT_COLOR } from './shared/palette';

interface BubbleItem {
  name: string;
  x: number;
  y: number;
  size: number;
  group: number;
}

interface Props extends ChartItemHoverProps<BubbleItem> {
  data?: BubbleItem[];
}

/** 气泡图 */
function BubbleChart(props: Props) {
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: BubbleItem) => d.name,
  );

  const items = data ?? [
    { name: '华北', x: 22, y: 68, size: 42, group: 0 },
    { name: '华东', x: 58, y: 72, size: 58, group: 0 },
  ];

  const xScale = useMemo(() => scaleLinear([0, 100], [0, PLOT_WIDTH]), []);
  const yScale = useMemo(() => scaleLinear([0, 100], [PLOT_HEIGHT, 0]), []);
  const maxSize = useMemo(() => Math.max(...items.map((d) => d.size)), [items]);

  return (
    <ChartFrame entryDuration={900}>
      {(progress) => (
        <>
          {CATEGORY_12.slice(0, 4).map((color, i) => (
            <RadialGradient
              key={`bubble-grad-${i}`}
              id={`bubble-grad-${i}`}
              cx={0.35}
              cy={0.35}
              r={0.65}
              stops={[
                { offset: 0, color: color, opacity: 0.95 },
                { offset: 1, color: color, opacity: 0.35 },
              ]}
            />
          ))}

          <Grid scale={xScale} orient="x" />
          <Grid scale={yScale} orient="y" />

          {items.map((d) => {
            const cx = xScale(d.x);
            const cy = yScale(d.y);
            const r = animSize((d.size / maxSize) * 28 + 6, progress);
            const colorIdx = d.group % 4;
            const hovered = isHovering(d.name);
            return (
              <Ellipse
                key={d.name}
                cx={cx}
                cy={cy}
                rx={r}
                ry={r}
                fill={`url(#bubble-grad-${colorIdx})`}
                stroke={CATEGORY_12[colorIdx]}
                strokeWidth={hoverStrokeWidth(1, hovered)}
                opacity={hoverOpacity(0.92, hovered)}
                zIndex={Math.round(d.size) + (hovered ? 100 : 0)}
                {...bindHover(d)}
              />
            );
          })}

          {items.map((d) => {
            if (progress < 0.4) return null;
            return (
              <Text
                key={`label-${d.name}`}
                x={xScale(d.x)}
                y={yScale(d.y) + 4}
                text={d.name}
                fontSize={10}
                fontFamily="sans-serif"
                fill={TEXT_COLOR}
                textAlign="middle"
                zIndex={100}
              />
            );
          })}

          <Axis scale={xScale} orient="bottom" tickFormat={(v) => `${v}%`} />
          <Axis scale={yScale} orient="left" tickFormat={(v) => `${v}%`} />
        </>
      )}
    </ChartFrame>
  );
}

export default BubbleChart;
export { BubbleChart };
