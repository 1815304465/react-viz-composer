/**
 * HistogramChart —— 直方图
 *
 * 与 BarChart 结构一致，但柱子之间无间隙（bandScale padding=0，额外 padding=0.05 留微缝）
 */

import { useMemo } from 'react';
import { Animation, Rect, Text } from '@react-viz-composer/core';
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
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface HistogramBin {
  bin: string;
  count: number;
}

interface Props extends ChartItemHoverProps<HistogramBin> {
  data?: HistogramBin[];
  color?: string;
}

/** 构建直方图入场 playbook */
function buildBarPlaybook(plotHeight: number) {
  return [
    { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'y', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 200 },
] as const;

export function HistogramChart(props: Props) {
  return (
    <ChartFrame>
      <HistogramChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function HistogramChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: HistogramBin) => d.bin,
  );

  const dataset: HistogramBin[] = data ?? [
    { bin: '0-10', count: 5 },
    { bin: '10-20', count: 12 },
    { bin: '20-30', count: 24 },
    { bin: '30-40', count: 30 },
    { bin: '40-50', count: 22 },
    { bin: '50-60', count: 15 },
    { bin: '60-70', count: 8 },
    { bin: '70-80', count: 4 },
  ];

  const categories = useMemo(() => dataset.map((d) => d.bin), [dataset]);
  const xScale = useMemo(
    () => scaleBand(categories, [0, plotWidth], 0),
    [categories],
  );
  const yScale = useMemo(() => {
    const yMax = Math.max(...dataset.map((d) => d.count)) * 1.1;
    return scaleLinear([0, yMax], [plotHeight, 0]);
  }, [dataset]);

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[...buildBarPlaybook(plotHeight)]}>
        {dataset.map((d) => {
          const fullHeight = plotHeight - yScale(d.count);
          return (
            <Rect
              key={d.bin}
              x={xScale(d.bin) + 1}
              y={plotHeight - fullHeight}
              width={xScale.bandwidth - 1}
              height={fullHeight}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(d.bin))}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {dataset.map((d) => {
          const fullHeight = plotHeight - yScale(d.count);
          return (
            <Text
              key={`t-${d.bin}`}
              x={xScale(d.bin) + xScale.bandwidth / 2}
              y={plotHeight - fullHeight - 6}
              text={String(d.count)}
              fontSize={11}
              fontFamily="sans-serif"
              fill="#595959"
              textAlign="middle"
              opacity={1}
            />
          );
        })}
      </Animation>
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
    </>
  );
}


export default HistogramChart;
