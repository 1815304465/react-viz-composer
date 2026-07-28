/**
 * FunnelChart —— 漏斗图
 */

import { Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps, CATEGORY_12, TEXT_COLOR } from '@react-viz-composer/components';

interface FunnelItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<FunnelItem> {
  data?: FunnelItem[];
}

export function FunnelChart(props: Props) {
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: FunnelItem) => d.name,
  );

  const items: FunnelItem[] = data ?? [
    { name: '访问', value: 1000 },
    { name: '咨询', value: 700 },
    { name: '订单', value: 400 },
    { name: '点击', value: 200 },
    { name: '购买', value: 80 },
  ];

  const max = Math.max(...items.map((d) => d.value));
  const n = items.length;
  const rowH = PLOT_HEIGHT / n;

  return (
    <ChartFrame>
      {(progress) => (
        <>
      {items.map((d, i) => {
        const ratio = animValue(d.value, progress) / max;
        const w = PLOT_WIDTH * ratio;
        const x = (PLOT_WIDTH - w) / 2;
        const y = i * rowH + 4;
        const h = rowH - 8;
        const nextRatio = i < n - 1
          ? animValue(items[i + 1].value, progress) / max
          : ratio * 0.7;
        const wTop = PLOT_WIDTH * nextRatio;
        const xTop = (PLOT_WIDTH - wTop) / 2;
        const dStr = `M ${xTop} ${y} L ${xTop + wTop} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
        const color = CATEGORY_12[i % CATEGORY_12.length];
        const hovered = isHovering(d.name);
        return (
          <Path
            key={d.name}
            d={dStr}
            fill={color}
            stroke="#fff"
            strokeWidth={hoverStrokeWidth(2, hovered)}
            {...bindHover(d)}
          />
        );
      })}

      {items.map((d, i) => {
        const y = i * rowH + 4;
        const h = rowH - 8;
        if (progress < 0.3) return null;
        return (
          <Text
            key={`t-${d.name}`}
            x={PLOT_WIDTH / 2}
            y={y + h / 2 + 4}
            text={`${d.name}  ${Math.round(animValue(d.value, progress))}`}
            fontSize={12}
            fontFamily="sans-serif"
            fill="#fff"
            textAlign="middle"
          />
        );
      })}

      {items.map((d, i) => {
        const ratio = animValue(d.value, progress) / max;
        const w = PLOT_WIDTH * ratio;
        const y = i * rowH + 4;
        const h = rowH - 8;
        if (progress < 0.5) return null;
        return (
          <Text
            key={`p-${d.name}`}
            x={(PLOT_WIDTH - w) / 2 + w + 8}
            y={y + h / 2 + 4}
            text={`${(ratio * 100).toFixed(0)}%`}
            fontSize={11}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
          />
        );
      })}
        </>
      )}
    </ChartFrame>
  );
}

export default FunnelChart;
