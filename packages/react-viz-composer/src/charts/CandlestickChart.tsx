/**
 * CandlestickChart —— K线图
 */

import { Line, Rect, Text } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animValue } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleBand, scaleLinear } from './shared/scales';
import { Axis, Grid } from './shared/Axis';
import { KLINE_UP, KLINE_DOWN, TEXT_COLOR } from './shared/palette';

interface KLineItem {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
}

interface Props extends ChartItemHoverProps<KLineItem> {
  data?: KLineItem[];
}

export function CandlestickChart(props: Props) {
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: KLineItem) => d.date,
  );

  const items: KLineItem[] = data ?? defaultKLineData();

  const xScale = scaleBand(items.map((d) => d.date), [0, PLOT_WIDTH], 0.3);
  const allMin = Math.min(...items.map((d) => d.low));
  const allMax = Math.max(...items.map((d) => d.high));
  const pad = (allMax - allMin) * 0.1;
  const yScale = scaleLinear([allMin - pad, allMax + pad], [PLOT_HEIGHT, 0]);
  const base = allMin - pad;

  return (
    <ChartFrame entryDuration={900}>
      {(progress) => {
        const animPrice = (v: number) => base + animValue(v - base, progress);

        return (
          <>
      <Grid scale={yScale} orient="y" />

      {items.map((d) => {
        const x = xScale(d.date);
        const bw = xScale.bandwidth;
        const cx = x + bw / 2;
        const isUp = d.close >= d.open;
        const color = isUp ? KLINE_UP : KLINE_DOWN;
        const yHigh = yScale(animPrice(d.high));
        const yLow = yScale(animPrice(d.low));
        return (
          <Line
            key={`w-${d.date}`}
            points={[
              { x: cx, y: yHigh },
              { x: cx, y: yLow },
            ]}
            stroke={color}
            strokeWidth={1}
          />
        );
      })}

      {items.map((d) => {
        const x = xScale(d.date);
        const bw = xScale.bandwidth;
        const isUp = d.close >= d.open;
        const color = isUp ? KLINE_UP : KLINE_DOWN;
        const yOpen = yScale(animPrice(d.open));
        const yClose = yScale(animPrice(d.close));
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(Math.abs(yClose - yOpen), 1);
        const hovered = isHovering(d.date);
        return (
          <Rect
            key={d.date}
            x={x + 1}
            y={bodyTop}
            width={Math.max(bw - 2, 1)}
            height={bodyH}
            fill={color}
            stroke={color}
            strokeWidth={hoverStrokeWidth(1, hovered)}
            {...bindHover(d)}
          />
        );
      })}

      <Axis scale={xScale} orient="bottom" tickFormat={() => ''} />
      <Axis scale={yScale} orient="left" />
      {progress > 0.8 && (
        <Text
          x={PLOT_WIDTH - 40}
          y={12}
          text={`最高 ${Math.max(...items.map((item) => item.high)).toFixed(1)}`}
          fontSize={10}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
        />
      )}
          </>
        );
      }}
    </ChartFrame>
  );
}

function defaultKLineData(): KLineItem[] {
  const out: KLineItem[] = [];
  let prev = 100;
  for (let i = 0; i < 30; i++) {
    const open = prev;
    const close = open + (Math.random() - 0.5) * 8;
    const high = Math.max(open, close) + Math.random() * 4;
    const low = Math.min(open, close) - Math.random() * 4;
    out.push({
      date: `${i + 1}`,
      open: +open.toFixed(2),
      close: +close.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
    });
    prev = close;
  }
  return out;
}

export default CandlestickChart;
