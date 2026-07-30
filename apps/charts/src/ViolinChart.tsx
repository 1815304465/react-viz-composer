/**
 * ViolinChart —— 小提琴图（镜像核密度分布）
 */

import { useMemo } from 'react';
import { Animation, Path, Line, Text } from 'react-viz-composer';
import { Axis, Grid } from 'react-viz-composer';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  scaleBand,
  scaleLinear,
  SEMANTIC_6,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface ViolinItem {
  name: string;
  values: number[];
}

interface ViolinHoverPayload {
  name: string;
  median: number;
  count: number;
}

interface Props extends ChartItemHoverProps<ViolinHoverPayload> {
  data?: ViolinItem[];
  color?: string;
  showMedian?: boolean;
}

const VIOLIN_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 60 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 200 },
] as const;

/** 计算中位数 */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** 直方图 + 高斯平滑近似核密度 */
function computeDensity(values: number[], bins: number, min: number, max: number): number[] {
  const span = max - min || 1;
  const counts = new Array(bins).fill(0);
  const step = span / bins;
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / step)));
    counts[idx] += 1;
  }
  const smoothed = counts.map((_, i) => {
    let sum = 0;
    for (let j = -1; j <= 1; j++) {
      const k = i + j;
      if (k >= 0 && k < bins) sum += counts[k];
    }
    return sum / 3;
  });
  const peak = Math.max(...smoothed, 1);
  return smoothed.map((c) => c / peak);
}

/** 构建镜像小提琴 Path */
function violinPath(
  density: number[],
  cx: number,
  yScale: (v: number) => number,
  halfWidth: number,
  min: number,
  max: number,
): string {
  const bins = density.length;
  const step = (max - min) / bins;
  const right: string[] = [];
  const left: string[] = [];
  for (let i = 0; i < bins; i++) {
    const y = yScale(min + (i + 0.5) * step);
    const w = density[i] * halfWidth;
    right.push(`${cx + w} ${y}`);
    left.unshift(`${cx - w} ${y}`);
  }
  return `M ${right.join(' L ')} L ${left.join(' L ')} Z`;
}

/**
 * 小提琴图
 */
export function ViolinChart(props: Props) {
  return (
    <ChartFrame>
      <ViolinChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function ViolinChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, color = SEMANTIC_6[0], showMedian = true, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: ViolinHoverPayload) => p.name,
  );

  const dataset: ViolinItem[] = data ?? [
    { name: 'A组', values: [22, 28, 35, 38, 42, 45, 48, 50, 52, 55, 58, 62, 65, 70, 75] },
    { name: 'B组', values: [30, 32, 38, 40, 44, 48, 50, 54, 58, 60, 65, 68, 72, 78, 85] },
    { name: 'C组', values: [15, 18, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 55] },
    { name: 'D组', values: [35, 40, 42, 45, 48, 50, 52, 55, 58, 60, 62, 65, 68, 72, 80] },
  ];

  const categories = useMemo(() => dataset.map((d) => d.name), [dataset]);
  const allValues = useMemo(() => dataset.flatMap((d) => d.values), [dataset]);
  const yMin = Math.min(...allValues) * 0.9;
  const yMax = Math.max(...allValues) * 1.1;

  const xScale = useMemo(() => scaleBand(categories, [0, plotWidth], 0.3), [categories, plotWidth]);
  const yScale = useMemo(() => scaleLinear([yMin, yMax], [plotHeight, 0]), [yMin, yMax, plotHeight]);

  const violins = useMemo(() => dataset.map((d) => {
    const dens = computeDensity(d.values, 20, yMin, yMax);
    const cx = xScale(d.name) + xScale.bandwidth / 2;
    const halfW = xScale.bandwidth * 0.45;
    return {
      name: d.name,
      d: violinPath(dens, cx, yScale, halfW, yMin, yMax),
      median: median(d.values),
      count: d.values.length,
      cx,
    };
  }), [dataset, xScale, yScale, yMin, yMax]);

  return (
    <>
      <Grid scale={yScale} orient="y" length={plotWidth} />
      <Animation playbook={[...VIOLIN_PLAYBOOK]}>
        {violins.map((v) => {
          const payload: ViolinHoverPayload = { name: v.name, median: v.median, count: v.count };
          return (
            <Path
              key={v.name}
              d={v.d}
              fill={color}
              opacity={0.65}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(v.name))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      {showMedian && violins.map((v) => (
        <Animation
          key={`med-${v.name}`}
          playbook={[{
            duration: 600,
            easing: 'easeOutCubic',
            targets: 'med',
            compute: ({ progress }: { progress: number }) => ({
              points: [
                { x: v.cx - xScale.bandwidth * 0.15, y: plotHeight + (yScale(v.median) - plotHeight) * progress },
                { x: v.cx + xScale.bandwidth * 0.15, y: plotHeight + (yScale(v.median) - plotHeight) * progress },
              ],
            }),
          }]}
        >
          <Line
            id="med"
            points={[
              { x: v.cx - xScale.bandwidth * 0.15, y: yScale(v.median) },
              { x: v.cx + xScale.bandwidth * 0.15, y: yScale(v.median) },
            ]}
            stroke="#fff"
            strokeWidth={2}
          />
        </Animation>
      ))}
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {violins.map((v) => (
          <Text
            key={`lbl-${v.name}`}
            x={v.cx}
            y={plotHeight + 16}
            text={v.name}
            fontSize={11}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="middle"
            opacity={1}
          />
        ))}
      </Animation>
      <Axis scale={yScale} orient="left" length={plotHeight} crossAt={0} />
    </>
  );
}

export default ViolinChart;
