/**
 * FunnelChart —— 漏斗图
 */

import { Animation, Path, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface FunnelItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<FunnelItem> {
  data?: FunnelItem[];
}

const SEGMENT_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 80 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 80, delay: 200 },
] as const;

/**
 * 构建漏斗段路径
 */
function funnelSegmentPath(
  item: FunnelItem,
  index: number,
  items: FunnelItem[],
  max: number,
  n: number,
  rowH: number,
  plotWidth: number,
): string {
  const ratio = item.value / max;
  const w = plotWidth * ratio;
  const x = (plotWidth - w) / 2;
  const y = index * rowH + 4;
  const h = rowH - 8;
  const nextRatio = index < n - 1
    ? items[index + 1].value / max
    : ratio * 0.7;
  const wTop = plotWidth * nextRatio;
  const xTop = (plotWidth - wTop) / 2;
  return `M ${xTop} ${y} L ${xTop + wTop} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

/**
 * 漏斗图
 */
export function FunnelChart(props: Props) {
  return (
    <ChartFrame>
      <FunnelChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function FunnelChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

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
  const rowH = plotHeight / n;

  return (
    <>
      <Animation playbook={[...SEGMENT_PLAYBOOK]}>
        {items.map((d, i) => (
          <Path
            key={d.name}
            d={funnelSegmentPath(d, i, items, max, n, rowH, plotWidth)}
            fill={CATEGORY_12[i % CATEGORY_12.length]}
            stroke="#fff"
            strokeWidth={hoverStrokeWidth(2, isHovering(d.name))}
            opacity={1}
            {...bindHover(d)}
          />
        ))}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {items.map((d, i) => {
          const y = i * rowH + 4;
          const h = rowH - 8;
          return (
            <Text
              key={`t-${d.name}`}
              x={plotWidth / 2}
              y={y + h / 2 + 4}
              text={`${d.name}  ${d.value}`}
              fontSize={12}
              fontFamily="sans-serif"
              fill="#fff"
              textAlign="middle"
              opacity={1}
            />
          );
        })}
        {items.map((d, i) => {
          const ratio = d.value / max;
          const w = plotWidth * ratio;
          const y = i * rowH + 4;
          const h = rowH - 8;
          return (
            <Text
              key={`p-${d.name}`}
              x={(plotWidth - w) / 2 + w + 8}
              y={y + h / 2 + 4}
              text={`${(ratio * 100).toFixed(0)}%`}
              fontSize={11}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              opacity={1}
            />
          );
        })}
      </Animation>
    </>
  );
}


export default FunnelChart;
