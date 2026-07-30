/**
 * ProgressRingChart —— 环形进度图（单/多环）
 */

import { useMemo } from 'react';
import { Animation, Path, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface RingItem {
  name: string;
  value: number;
  max?: number;
}

interface RingHoverPayload {
  name: string;
  value: number;
  max: number;
  percent: number;
}

interface Props extends ChartItemHoverProps<RingHoverPayload> {
  data?: RingItem[];
}

const RING_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 800, easing: 'easeOutCubic', targets: 'children', stagger: 100 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 80, delay: 400 },
] as const;

/** 构建圆弧 Path（从顶部顺时针） */
function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const x0 = cx + outerR * Math.cos(startAngle);
  const y0 = cy + outerR * Math.sin(startAngle);
  const x1 = cx + outerR * Math.cos(endAngle);
  const y1 = cy + outerR * Math.sin(endAngle);
  const x2 = cx + innerR * Math.cos(endAngle);
  const y2 = cy + innerR * Math.sin(endAngle);
  const x3 = cx + innerR * Math.cos(startAngle);
  const y3 = cy + innerR * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${outerR} ${outerR} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${innerR} ${innerR} 0 ${large} 0 ${x3} ${y3} Z`;
}

/**
 * 环形进度图
 */
export function ProgressRingChart(props: Props) {
  return (
    <ChartFrame>
      <ProgressRingChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function ProgressRingChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: RingHoverPayload) => p.name,
  );

  const dataset: RingItem[] = data ?? [
    { name: 'CPU', value: 72, max: 100 },
    { name: '内存', value: 58, max: 100 },
    { name: '磁盘', value: 45, max: 100 },
  ];

  const cx = plotWidth / 2;
  const cy = plotHeight / 2;
  const maxOuterR = Math.min(cx, cy) - 30;
  const ringWidth = 14;
  const ringGap = 6;

  const rings = useMemo(() => dataset.map((d, i) => {
    const outerR = maxOuterR - i * (ringWidth + ringGap);
    const innerR = outerR - ringWidth;
    const max = d.max ?? 100;
    const ratio = Math.max(0, Math.min(1, d.value / max));
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + ratio * Math.PI * 2;
    const bgEnd = startAngle + Math.PI * 2;
    return {
      name: d.name,
      value: d.value,
      max,
      percent: ratio * 100,
      color: CATEGORY_12[i % CATEGORY_12.length],
      outerR,
      innerR,
      progressD: arcPath(cx, cy, innerR, outerR, startAngle, endAngle),
      bgD: arcPath(cx, cy, innerR, outerR, startAngle, bgEnd),
      labelY: cy + outerR + 16,
    };
  }), [dataset, cx, cy, maxOuterR, ringWidth, ringGap]);

  return (
    <>
      {rings.map((r) => (
        <Path
          key={`bg-${r.name}`}
          d={r.bgD}
          fill="#f0f0f0"
          stroke="none"
        />
      ))}
      <Animation playbook={[...RING_PLAYBOOK]}>
        {rings.map((r) => {
          const payload: RingHoverPayload = {
            name: r.name,
            value: r.value,
            max: r.max,
            percent: r.percent,
          };
          return (
            <Path
              key={r.name}
              d={r.progressD}
              fill={r.color}
              stroke={r.color}
              strokeWidth={hoverStrokeWidth(0, isHovering(r.name))}
              opacity={0.9}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {rings.map((r, i) => (
          <Text
            key={`val-${r.name}`}
            x={cx + maxOuterR + 20}
            y={cy - (rings.length - 1) * 14 + i * 28 + 4}
            text={`${r.name}  ${r.percent.toFixed(0)}%`}
            fontSize={12}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="start"
            opacity={1}
          />
        ))}
      </Animation>
      {rings.length > 0 && (
        <Text
          x={cx}
          y={cy + 5}
          text={`${rings[0].percent.toFixed(0)}%`}
          fontSize={28}
          fontWeight="bold"
          fontFamily="sans-serif"
          fill={rings[0].color}
          textAlign="middle"
        />
      )}
    </>
  );
}

export default ProgressRingChart;
