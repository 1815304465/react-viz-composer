/**
 * RidgelineChart —— 山脊图（Joy Plot，重叠密度脊线）
 */

import { useMemo } from 'react';
import { Animation, Path, Text } from '@react-viz-composer/core';
import { Axis } from '@react-viz-composer/kit';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  scaleLinear,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface RidgeItem {
  name: string;
  values: number[];
}

interface RidgeHoverPayload {
  name: string;
  peak: number;
  index: number;
}

interface Props extends ChartItemHoverProps<RidgeHoverPayload> {
  data?: RidgeItem[];
  categories?: string[];
}

const RIDGE_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 800, easing: 'easeOutCubic', targets: 'children', stagger: 80 },
] as const;

/** 将数值序列归一化为 0~1 密度采样 */
function normalizeSamples(values: number[], sampleCount: number): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const bins = new Array(sampleCount).fill(0);
  const step = span / sampleCount;
  for (const v of values) {
    const idx = Math.min(sampleCount - 1, Math.max(0, Math.floor((v - min) / step)));
    bins[idx] += 1;
  }
  const peak = Math.max(...bins, 1);
  return bins.map((b) => b / peak);
}

/** 构建山脊面积 Path */
function ridgePath(
  samples: number[],
  baseY: number,
  ridgeH: number,
  xScale: (i: number) => number,
  step: number,
): string {
  const top = samples.map((s, i) => `${xScale(i)} ${baseY - s * ridgeH}`).join(' L ');
  const bottom = samples.map((_, i) => `${xScale(samples.length - 1 - i)} ${baseY}`).join(' L ');
  return `M ${xScale(0)} ${baseY} L ${top} L ${bottom} Z`;
}

/**
 * 山脊图
 */
export function RidgelineChart(props: Props) {
  return (
    <ChartFrame>
      <RidgelineChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function RidgelineChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, categories, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: RidgeHoverPayload) => `${p.name}-${p.index}`,
  );

  const dataset: RidgeItem[] = data ?? [
    { name: '一月', values: [12, 18, 22, 28, 35, 42, 48, 55, 60, 65, 70, 75, 80, 85, 90] },
    { name: '二月', values: [10, 15, 20, 25, 30, 38, 45, 50, 58, 62, 68, 72, 78, 82, 88] },
    { name: '三月', values: [8, 14, 18, 24, 32, 40, 46, 52, 58, 64, 70, 76, 82, 86, 92] },
    { name: '四月', values: [15, 20, 25, 30, 36, 44, 50, 56, 62, 68, 74, 80, 85, 90, 95] },
    { name: '五月', values: [18, 22, 28, 34, 40, 48, 54, 60, 66, 72, 78, 84, 88, 92, 98] },
  ];

  const sampleCount = categories?.length ?? 30;
  const ridgeCount = dataset.length;
  const ridgeH = Math.min(60, plotHeight / (ridgeCount + 1));
  const ridgeGap = ridgeH * 0.6;
  const xScale = useMemo(
    () => scaleLinear([0, sampleCount - 1], [40, plotWidth - 20]),
    [sampleCount, plotWidth],
  );
  const step = (plotWidth - 60) / Math.max(sampleCount - 1, 1);

  const ridges = useMemo(() => dataset.map((d, i) => {
    const samples = normalizeSamples(d.values, sampleCount);
    const baseY = plotHeight - i * ridgeGap - 20;
    const peak = Math.max(...samples);
    return {
      name: d.name,
      index: i,
      d: ridgePath(samples, baseY, ridgeH, (idx) => xScale(idx), step),
      baseY,
      peak,
      color: CATEGORY_12[i % CATEGORY_12.length],
    };
  }), [dataset, sampleCount, plotHeight, ridgeGap, ridgeH, xScale, step]);

  const xLabels = categories ?? dataset[0]?.values.map((_, i) => String(i)) ?? [];

  return (
    <>
      <Animation playbook={[...RIDGE_PLAYBOOK]}>
        {ridges.map((r) => {
          const payload: RidgeHoverPayload = { name: r.name, peak: r.peak, index: r.index };
          return (
            <Path
              key={r.name}
              d={r.d}
              fill={r.color}
              opacity={0.7}
              stroke={r.color}
              strokeWidth={hoverStrokeWidth(1.5, isHovering(`${r.name}-${r.index}`))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      {ridges.map((r) => (
        <Text
          key={`lbl-${r.name}`}
          x={8}
          y={r.baseY - ridgeH * 0.3}
          text={r.name}
          fontSize={11}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="start"
        />
      ))}
      {xLabels.length > 0 && xLabels.filter((_, i) => i % Math.ceil(xLabels.length / 6) === 0).map((label, i, arr) => {
        const idx = i * Math.ceil(xLabels.length / arr.length);
        return (
          <Text
            key={`x-${label}-${idx}`}
            x={xScale(idx)}
            y={plotHeight + 14}
            text={label}
            fontSize={10}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="middle"
          />
        );
      })}
      <Axis
        scale={scaleLinear([0, sampleCount - 1], [40, plotWidth - 20])}
        orient="bottom"
        length={plotWidth}
        crossAt={plotHeight}
      />
    </>
  );
}

export default RidgelineChart;
