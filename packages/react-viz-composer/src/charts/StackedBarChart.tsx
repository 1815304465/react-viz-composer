/**
 * StackedBarChart —— 堆叠柱状图
 */

import { Rect, Text } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animSize } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleBand, scaleLinear } from './shared/scales';
import { Axis, Grid } from './shared/Axis';
import { SEMANTIC_6 } from './shared/palette';

interface Series {
  name: string;
  values: number[];
}

interface StackedHoverPayload {
  series: string;
  category: string;
  value: number;
}

interface Props extends ChartItemHoverProps<StackedHoverPayload> {
  data?: Series[];
  categories?: string[];
}

export function StackedBarChart(props: Props) {
  const { data, categories, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<StackedHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.series}-${p.category}`,
  );

  const series: Series[] = data ?? [
    { name: '搜索引擎', values: [104, 56, 136, 86, 70] },
    { name: '直接访问', values: [42, 55, 26, 60, 48] },
    { name: '推荐来源', values: [51, 36, 45, 20, 38] },
  ];
  const cats = categories ?? ['周一', '周二', '周三', '周四', '周五'];

  const xScale = scaleBand(cats, [0, PLOT_WIDTH], 0.3);
  const maxStacked = Math.max(
    ...cats.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0)),
  ) * 1.1;
  const yScale = scaleLinear([0, maxStacked], [PLOT_HEIGHT, 0]);

  return (
    <ChartFrame>
      {(progress) => (
        <>
      <Grid scale={yScale} orient="y" />
      {cats.map((cat, ci) => {
        const x = xScale(cat);
        let accY = PLOT_HEIGHT;
        return series.map((s, si) => {
          const val = s.values[ci];
          const fullH = PLOT_HEIGHT - yScale(val);
          const h = animSize(fullH, progress);
          const y = accY - h;
          accY = accY - h;
          const color = SEMANTIC_6[si % SEMANTIC_6.length];
          const payload: StackedHoverPayload = {
            series: s.name,
            category: cat,
            value: val,
          };
          return (
            <Rect
              key={`${cat}-${s.name}`}
              x={x}
              y={y}
              width={xScale.bandwidth}
              height={h}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(`${s.name}-${cat}`))}
              {...bindHover(payload)}
            />
          );
        });
      })}
      {cats.map((cat, ci) => {
        const x = xScale(cat);
        let accY = PLOT_HEIGHT;
        return series.map((s, si) => {
          const val = s.values[ci];
          const fullH = PLOT_HEIGHT - yScale(val);
          const h = animSize(fullH, progress);
          const midY = accY - h / 2;
          accY = accY - h;
          const labelValue = Math.round(val * progress);
          if (progress < 0.4 || h < 12) return null;
          return (
            <Text
              key={`t-${cat}-${s.name}`}
              x={x + xScale.bandwidth / 2}
              y={midY + 4}
              text={String(labelValue)}
              fontSize={10}
              fontFamily="sans-serif"
              fill="#fff"
              textAlign="middle"
            />
          );
        });
      })}
      <Axis scale={xScale} orient="bottom" />
      <Axis scale={yScale} orient="left" />
        </>
      )}
    </ChartFrame>
  );
}

export default StackedBarChart;
