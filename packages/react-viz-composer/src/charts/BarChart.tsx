/**
 * BarChart —— 柱状图
 */

import { useMemo } from 'react';
import { Rect, Text } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animSize } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleBand, scaleLinear } from './shared/scales';
import { Axis, Grid } from './shared/Axis';
import { SEMANTIC_6 } from './shared/palette';

interface BarItem {
  month: string;
  value: number;
}

interface Props extends ChartItemHoverProps<BarItem> {
  data?: BarItem[];
  color?: string;
}

export function BarChart(props: Props) {
  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: BarItem) => d.month,
  );

  const dataset = data ?? [
    { month: '1月', value: 120 },
    { month: '2月', value: 200 },
    { month: '3月', value: 150 },
    { month: '4月', value: 80 },
    { month: '5月', value: 170 },
    { month: '6月', value: 240 },
  ];

  const categories = useMemo(() => dataset.map((d) => d.month), [dataset]);
  const xScale = useMemo(
    () => scaleBand(categories, [0, PLOT_WIDTH], 0.3),
    [categories],
  );
  const yScale = useMemo(() => {
    const yMax = Math.max(...dataset.map((d) => d.value)) * 1.1;
    return scaleLinear([0, yMax], [PLOT_HEIGHT, 0]);
  }, [dataset]);

  return (
    <ChartFrame>
      {(progress) => (
        <>
      <Grid scale={yScale} orient="y" />
      {dataset.map((d) => {
        const x = xScale(d.month);
        const fullHeight = PLOT_HEIGHT - yScale(d.value);
        const h = animSize(fullHeight, progress);
        const y = PLOT_HEIGHT - h;
        return (
          <Rect
            key={d.month}
            x={x}
            y={y}
            width={xScale.bandwidth}
            height={h}
            fill={color}
            stroke={color}
            strokeWidth={hoverStrokeWidth(1, isHovering(d.month))}
            {...bindHover(d)}
          />
        );
      })}
      {dataset.map((d) => {
        const fullHeight = PLOT_HEIGHT - yScale(d.value);
        const h = animSize(fullHeight, progress);
        const y = PLOT_HEIGHT - h;
        const x = xScale(d.month);
        const labelValue = Math.round((d.value * progress));
        if (progress < 0.15) return null;
        return (
          <Text
            key={`t-${d.month}`}
            x={x + xScale.bandwidth / 2}
            y={y - 6}
            text={String(labelValue)}
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

export default BarChart;
