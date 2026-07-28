/**
 * HorizontalBarChart —— 横向柱状图
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
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<BarItem> {
  data?: BarItem[];
  color?: string;
}

export function HorizontalBarChart(props: Props) {
  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: BarItem) => d.name,
  );

  const dataset = data ?? [
    { name: '北京', value: 120 },
    { name: '上海', value: 200 },
    { name: '广州', value: 150 },
    { name: '深圳', value: 80 },
    { name: '杭州', value: 170 },
    { name: '成都', value: 240 },
  ];

  const categories = useMemo(() => dataset.map((d) => d.name), [dataset]);
  const yScale = useMemo(
    () => scaleBand(categories, [0, PLOT_HEIGHT], 0.3),
    [categories],
  );
  const xScale = useMemo(() => {
    const xMax = Math.max(...dataset.map((d) => d.value)) * 1.1;
    return scaleLinear([0, xMax], [0, PLOT_WIDTH]);
  }, [dataset]);

  return (
    <ChartFrame>
      {(progress) => (
        <>
      <Grid scale={xScale} orient="x" />
      {dataset.map((d) => {
        const y = yScale(d.name);
        const fullWidth = xScale(d.value);
        const w = animSize(fullWidth, progress);
        return (
          <Rect
            key={d.name}
            x={0}
            y={y}
            width={w}
            height={yScale.bandwidth}
            fill={color}
            stroke={color}
            strokeWidth={hoverStrokeWidth(1, isHovering(d.name))}
            {...bindHover(d)}
          />
        );
      })}
      {dataset.map((d) => {
        const fullWidth = xScale(d.value);
        const w = animSize(fullWidth, progress);
        const y = yScale(d.name);
        const labelValue = Math.round(d.value * progress);
        if (progress < 0.15) return null;
        return (
          <Text
            key={`t-${d.name}`}
            x={w + 6}
            y={y + yScale.bandwidth / 2 + 4}
            text={String(labelValue)}
            fontSize={11}
            fontFamily="sans-serif"
            fill="#595959"
            textAlign="start"
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

export default HorizontalBarChart;
