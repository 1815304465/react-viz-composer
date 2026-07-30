/**
 * ParetoChart —— 帕累托图（降序柱 + 累计百分比折线）
 */

import { useMemo } from 'react';
import { Animation, Rect, Path, Ellipse, Text } from '@react-viz-composer/core';
import {
  Axis,
  Grid,
} from '@react-viz-composer/kit';
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
import type {
  ChartItemHoverProps,
  BandScale,
  LinearScale,
} from './local';


interface ParetoItem {
  name: string;
  value: number;
}

interface ParetoHoverPayload extends ParetoItem {
  cumulative: number;
}

interface Props extends ChartItemHoverProps<ParetoHoverPayload> {
  data?: ParetoItem[];
}

/** 构建柱状入场 playbook */
function buildBarPlaybook(plotHeight: number) {
  return [
    { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'y', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
  ] as const;
}

/** 构建折线点入场 playbook */
function buildPointPlaybook(plotHeight: number) {
  return [
    { attribute: 'cy', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'opacity', from: 0, duration: 400, easing: 'easeOut', targets: 'children', stagger: 40 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 300 },
] as const;

/**
 * 计算累计百分比序列
 */
function computeCumulative(sorted: ParetoItem[]): number[] {
  const total = sorted.reduce((s, d) => s + d.value, 0);
  let cum = 0;
  return sorted.map((d) => {
    cum += d.value;
    return total > 0 ? (cum / total) * 100 : 0;
  });
}

/**
 * 构建累计折线路径
 */
function buildCumulativePath(
  cumulative: number[],
  cats: string[],
  xScale: BandScale,
  pctScale: LinearScale,
): string {
  const points = cumulative.map((pct, i) => ({
    x: xScale(cats[i]) + xScale.bandwidth / 2,
    y: pctScale(pct),
  }));
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
}

export function ParetoChart(props: Props) {
  return (
    <ChartFrame>
      <ParetoChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function ParetoChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<ParetoHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => p.name,
  );

  const rawData = data ?? [
    { name: '缺陷A', value: 45 },
    { name: '缺陷B', value: 32 },
    { name: '缺陷C', value: 18 },
    { name: '缺陷D', value: 12 },
    { name: '缺陷E', value: 8 },
    { name: '缺陷F', value: 5 },
  ];

  const dataset = useMemo(
    () => [...rawData].sort((a, b) => b.value - a.value),
    [rawData],
  );
  const cumulative = useMemo(() => computeCumulative(dataset), [dataset]);
  const categories = useMemo(() => dataset.map((d) => d.name), [dataset]);

  const xScale = useMemo(
    () => scaleBand(categories, [0, plotWidth], 0.25),
    [categories, plotWidth],
  );
  const yScale = useMemo(() => {
    const max = Math.max(...dataset.map((d) => d.value)) * 1.15;
    return scaleLinear([0, max], [plotHeight, 0]);
  }, [dataset, plotHeight]);
  const pctScale = useMemo(
    () => scaleLinear([0, 100], [plotHeight, 0]),
    [plotHeight],
  );

  const finalLineD = buildCumulativePath(cumulative, categories, xScale, pctScale);

  return (
    <>
      <Grid scale={yScale} orient="y" length={plotWidth} />
      <Animation playbook={[...buildBarPlaybook(plotHeight)]}>
        {dataset.map((d, i) => {
          const x = xScale(d.name);
          const fullH = plotHeight - yScale(d.value);
          const payload: ParetoHoverPayload = { ...d, cumulative: cumulative[i] };
          return (
            <Rect
              key={`bar-${d.name}`}
              x={x}
              y={plotHeight - fullH}
              width={xScale.bandwidth}
              height={fullH}
              fill={SEMANTIC_6[0]}
              stroke={SEMANTIC_6[0]}
              strokeWidth={hoverStrokeWidth(1, isHovering(d.name))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[{
        duration: 700,
        easing: 'easeOutCubic',
        targets: 'cum-line',
        compute: ({ progress }: { progress: number }) => {
          const points = cumulative.map((pct, i) => ({
            x: xScale(categories[i]) + xScale.bandwidth / 2,
            y: plotHeight + (pctScale(pct) - plotHeight) * progress,
          }));
          const d = points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
          return { d };
        },
      }]}>
        <Path
          id="cum-line"
          d={finalLineD}
          fill="none"
          stroke={SEMANTIC_6[3]}
          strokeWidth={2.5}
        />
      </Animation>
      <Animation playbook={[...buildPointPlaybook(plotHeight)]}>
        {dataset.map((d, i) => {
          const payload: ParetoHoverPayload = { ...d, cumulative: cumulative[i] };
          return (
            <Ellipse
              key={`pt-${d.name}`}
              cx={xScale(d.name) + xScale.bandwidth / 2}
              cy={pctScale(cumulative[i])}
              rx={isHovering(d.name) ? 7 : 5}
              ry={isHovering(d.name) ? 7 : 5}
              fill="#fff"
              stroke={SEMANTIC_6[3]}
              strokeWidth={hoverStrokeWidth(2, isHovering(d.name))}
              opacity={1}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {dataset.map((d, i) => {
          const x = xScale(d.name) + xScale.bandwidth / 2;
          const fullH = plotHeight - yScale(d.value);
          return (
            <Text
              key={`t-${d.name}`}
              x={x}
              y={plotHeight - fullH - 6}
              text={String(d.value)}
              fontSize={10}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              textAlign="middle"
              opacity={1}
            />
          );
        })}
      </Animation>
      <Axis scale={xScale} orient="bottom" length={plotWidth} crossAt={plotHeight} />
      <Axis scale={yScale} orient="left" length={plotHeight} crossAt={0} />
      <Axis
        scale={pctScale}
        orient="right"
        length={plotHeight}
        crossAt={plotWidth}
        tickFormat={(v) => `${v}%`}
      />
    </>
  );
}


export default ParetoChart;
