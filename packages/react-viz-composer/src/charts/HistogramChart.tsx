/**
 * HistogramChart —— 直方图
 *
 * 与 BarChart 结构一致，但柱子之间无间隙（bandScale padding=0，额外 padding=0.05 留微缝）
 */

import { useMemo } from 'react';
import { Rect, Text } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animSize } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleBand, scaleLinear } from './shared/scales';
import { Axis, Grid } from './shared/Axis';
import { SEMANTIC_6 } from './shared/palette';

interface HistogramBin {
  bin: string;
  count: number;
}

interface Props extends ChartItemHoverProps<HistogramBin> {
  data?: HistogramBin[];
  color?: string;
}

export function HistogramChart(props: Props) {
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
  // padding=0 让柱子紧贴，无间隙
  const xScale = useMemo(
    () => scaleBand(categories, [0, PLOT_WIDTH], 0),
    [categories],
  );
  const yScale = useMemo(() => {
    const yMax = Math.max(...dataset.map((d) => d.count)) * 1.1;
    return scaleLinear([0, yMax], [PLOT_HEIGHT, 0]);
  }, [dataset]);

  return (
    <ChartFrame>
      {(progress) => (
        <>
          <Grid scale={yScale} orient="y" />
          {dataset.map((d) => {
            const x = xScale(d.bin);
            const fullHeight = PLOT_HEIGHT - yScale(d.count);
            const h = animSize(fullHeight, progress);
            const y = PLOT_HEIGHT - h;
            return (
              <Rect
                key={d.bin}
                x={x + 1}
                y={y}
                width={xScale.bandwidth - 1}
                height={h}
                fill={color}
                stroke={color}
                strokeWidth={hoverStrokeWidth(1, isHovering(d.bin))}
                {...bindHover(d)}
              />
            );
          })}
          {dataset.map((d) => {
            const fullHeight = PLOT_HEIGHT - yScale(d.count);
            const h = animSize(fullHeight, progress);
            const x = xScale(d.bin);
            if (progress < 0.3) return null;
            return (
              <Text
                key={`t-${d.bin}`}
                x={x + xScale.bandwidth / 2}
                y={PLOT_HEIGHT - h - 6}
                text={String(d.count)}
                fontSize={11}
                fontFamily="sans-serif"
                fill="#595959"
                textAlign="middle"
              />
            );
          })}
          <Axis scale={xScale} orient="bottom" />
          <Axis scale={yScale} orient="left" />
        </>
      )}
    </ChartFrame>
  );
}

export default HistogramChart;
