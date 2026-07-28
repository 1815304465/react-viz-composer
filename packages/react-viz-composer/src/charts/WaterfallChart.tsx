/**
 * WaterfallChart —— 瀑布图
 *
 * 堆叠浮动柱状图展示累计变化。每项有 base（起点Y）和 value（终点Y），
 * 正值为绿色柱，负值为红色柱，柱间用连接线衔接。
 */

import { useMemo } from 'react';
import { Rect, Line, Text } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animSize, animValue } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleLinear, scaleBand } from './shared/scales';
import { Axis, Grid } from './shared/Axis';
import { TEXT_COLOR } from './shared/palette';

interface WaterfallItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<WaterfallItem> {
  data?: WaterfallItem[];
}

const GREEN = '#52c41a';
const RED = '#f5222d';

export function WaterfallChart(props: Props) {
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: WaterfallItem) => d.name,
  );

  const dataset: WaterfallItem[] = data ?? [
    { name: '初始', value: 300 },
    { name: '收入', value: 120 },
    { name: '成本', value: -80 },
    { name: '税费', value: -45 },
    { name: '利润', value: 60 },
    { name: '分红', value: -30 },
    { name: '结余', value: 325 },
  ];

  // 计算各项的 base / end（运行累计）
  const { ranges, yMax, yMin } = useMemo(() => {
    let running = 0;
    const rs: { name: string; base: number; end: number; value: number }[] = [];
    dataset.forEach((d) => {
      const base = running;
      const end = running + d.value;
      rs.push({ name: d.name, base, end, value: d.value });
      running = end;
    });
    const allVals = rs.flatMap((r) => [r.base, r.end]);
    const max = Math.max(...allVals) * 1.1;
    const min = Math.min(0, ...allVals) * 1.1;
    return { ranges: rs, yMax: max, yMin: min };
  }, [dataset]);

  const categories = useMemo(() => dataset.map((d) => d.name), [dataset]);
  const xScale = useMemo(
    () => scaleBand(categories, [0, PLOT_WIDTH], 0.25),
    [categories],
  );
  const yScale = useMemo(
    () => scaleLinear([yMin, yMax], [PLOT_HEIGHT, 0]),
    [yMin, yMax],
  );

  return (
    <ChartFrame>
      {(progress) => (
        <>
          <Grid scale={yScale} orient="y" />

          {/* 连接线：上一项的 end → 当前项的 base */}
          {ranges.map((r, i) => {
            if (i === 0) return null;
            const prevX = xScale(dataset[i - 1].name) + xScale.bandwidth / 2;
            const curX = xScale(r.name);
            const prevY = yScale(animValue(ranges[i - 1].end, progress));
            const curY = yScale(animValue(r.base, progress));
            return (
              <Line
                key={`link-${r.name}`}
                points={[
                  { x: prevX + xScale.bandwidth, y: prevY },
                  { x: curX, y: curY },
                ]}
                stroke="#bfbfbf"
                strokeWidth={1}
              />
            );
          })}

          {/* 浮动柱 */}
          {ranges.map((r) => {
            const x = xScale(r.name);
            const baseY = yScale(animValue(r.base, progress));
            const endY = yScale(animValue(r.end, progress));
            const barH = Math.abs(endY - baseY);
            const barY = Math.min(baseY, endY);
            const color = r.value >= 0 ? GREEN : RED;
            const hovered = isHovering(r.name);
            return (
              <Rect
                key={r.name}
                x={x}
                y={barY}
                width={xScale.bandwidth}
                height={animSize(barH, 1) > 0 ? barH : 0}
                fill={color}
                stroke={color}
                strokeWidth={hoverStrokeWidth(1, hovered)}
                {...bindHover(r)}
              />
            );
          })}

          {/* 数值标签 */}
          {ranges.map((r) => {
            const x = xScale(r.name);
            const endY = yScale(animValue(r.end, progress));
            const labelValue = Math.round(animValue(r.value, progress));
            if (progress < 0.2) return null;
            const offset = r.value >= 0 ? -8 : 14;
            return (
              <Text
                key={`t-${r.name}`}
                x={x + xScale.bandwidth / 2}
                y={endY + offset}
                text={String(labelValue)}
                fontSize={11}
                fontFamily="sans-serif"
                fill={TEXT_COLOR}
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

export default WaterfallChart;
