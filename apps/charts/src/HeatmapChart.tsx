/**
 * HeatmapChart —— 热力图
 */

import { Animation, Rect, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  scaleBand,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


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

const CELL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 15 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 400, easing: 'easeOut', targets: 'children', stagger: 15, delay: 200 },
] as const;

/**
 * 热力图
 */
export function HeatmapChart(props: Props) {
  return (
    <ChartFrame>
      <HeatmapChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function HeatmapChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { cols, rows, data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: HeatHoverPayload): string => `${p.row}-${p.col}`,
  );

  const c = cols ?? ['0时', '4时', '8时', '12时', '16时', '20时', '24时'];
  const r = rows ?? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const grid: number[][] = data ?? defaultHeat();

  const xScale = scaleBand(c, [0, plotWidth], 0.05);
  const yScale = scaleBand(r, [0, plotHeight], 0.05);

  return (
    <>
      <Animation playbook={[...CELL_PLAYBOOK]}>
        {grid.map((row, ri) =>
          row.map((v, ci) => {
            const payload: HeatHoverPayload = { row: r[ri], col: c[ci], value: v };
            const cellKey = `${r[ri]}-${c[ci]}`;
            return (
              <Rect
                key={`${ri}-${ci}`}
                x={xScale(c[ci])}
                y={yScale(r[ri])}
                width={xScale.bandwidth}
                height={yScale.bandwidth}
                fill={heatColor(v)}
                stroke="#fff"
                strokeWidth={hoverStrokeWidth(1, isHovering(cellKey))}
                opacity={1}
                {...bindHover(payload)}
              />
            );
          }),
        )}
      </Animation>

      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {grid.map((row, ri) =>
          row.map((v, ci) => (
            <Text
              key={`t-${ri}-${ci}`}
              x={xScale(c[ci]) + xScale.bandwidth / 2}
              y={yScale(r[ri]) + yScale.bandwidth / 2 + 4}
              text={v.toFixed(1)}
              fontSize={10}
              fontFamily="sans-serif"
              fill={v > 0.5 ? '#fff' : '#333'}
              textAlign="middle"
              opacity={1}
            />
          )),
        )}
      </Animation>

      {c.map((label, i) => (
        <Text
          key={`x-${i}`}
          x={xScale(label) + xScale.bandwidth / 2}
          y={plotHeight + 16}
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
