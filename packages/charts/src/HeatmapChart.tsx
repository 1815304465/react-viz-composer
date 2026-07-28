/**
 * HeatmapChart —— 热力图
 */

import { Rect, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps, scaleBand, TEXT_COLOR } from '@react-viz-composer/components';

interface HeatHoverPayload {
  row: string;
  col: string;
  value: number;
}

interface Props extends ChartItemHoverProps<HeatHoverPayload> {
  cols?: string[];
  rows?: string[];
  data?: number[][];
}

/** 蓝色梯度：根据 value 0~1 取 #f0f5ff → #1677ff */
function heatColor(v: number): string {
  if (v < 0.2) return '#f0f5ff';
  if (v < 0.4) return '#adc6ff';
  if (v < 0.6) return '#69b1ff';
  if (v < 0.8) return '#1677ff';
  return '#003eb3';
}

export function HeatmapChart(props: Props) {
  const { cols, rows, data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: HeatHoverPayload): string => `${p.row}-${p.col}`,
  );

  const c = cols ?? ['0时', '4时', '8时', '12时', '16时', '20时', '24时'];
  const r = rows ?? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const grid: number[][] = data ?? defaultHeat();

  const xScale = scaleBand(c, [0, PLOT_WIDTH], 0.05);
  const yScale = scaleBand(r, [0, PLOT_HEIGHT], 0.05);

  return (
    <ChartFrame>
      {(progress) => (
        <>
      {grid.map((row, ri) =>
        row.map((v, ci) => {
          const av = animValue(v, progress);
          const payload: HeatHoverPayload = { row: r[ri], col: c[ci], value: v };
          const cellKey = `${r[ri]}-${c[ci]}`;
          const hovered = isHovering(cellKey);
          return (
            <Rect
              key={`${ri}-${ci}`}
              x={xScale(c[ci])}
              y={yScale(r[ri])}
              width={xScale.bandwidth}
              height={yScale.bandwidth}
              fill={heatColor(av)}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(1, hovered)}
              {...bindHover(payload)}
            />
          );
        }),
      )}

      {grid.map((row, ri) =>
        row.map((v, ci) => {
          const av = animValue(v, progress);
          if (progress < 0.3) return null;
          return (
            <Text
              key={`t-${ri}-${ci}`}
              x={xScale(c[ci]) + xScale.bandwidth / 2}
              y={yScale(r[ri]) + yScale.bandwidth / 2 + 4}
              text={av.toFixed(1)}
              fontSize={10}
              fontFamily="sans-serif"
              fill={av > 0.5 ? '#fff' : '#333'}
              textAlign="middle"
            />
          );
        }),
      )}

      {c.map((label, i) => (
        <Text
          key={`x-${i}`}
          x={xScale(label) + xScale.bandwidth / 2}
          y={PLOT_HEIGHT + 16}
          text={label}
          fontSize={10}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
        />
      ))}

      {r.map((label, i) => (
        <Text
          key={`y-${i}`}
          x={-8}
          y={yScale(label) + yScale.bandwidth / 2 + 4}
          text={label}
          fontSize={10}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="end"
        />
      ))}
        </>
      )}
    </ChartFrame>
  );
}

function defaultHeat(): number[][] {
  const out: number[][] = [];
  for (let ri = 0; ri < 7; ri++) {
    const row: number[] = [];
    for (let ci = 0; ci < 7; ci++) {
      const dx = (ci - 3) / 3;
      const dy = (ri - 3) / 3;
      const v = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)) * 0.9 + Math.random() * 0.1;
      row.push(+v.toFixed(2));
    }
    out.push(row);
  }
  return out;
}

export default HeatmapChart;
