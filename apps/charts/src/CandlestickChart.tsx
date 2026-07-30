/**
 * CandlestickChart —— K线图
 */

import { useMemo } from 'react';
import { Animation, Line, Rect, Text } from 'react-viz-composer';
import {
  Axis,
  Grid,
} from 'react-viz-composer';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  scaleBand,
  scaleLinear,
  KLINE_UP,
  KLINE_DOWN,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
  LinearScale,
} from './local';



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

/** 构建 K 线实体入场 playbook */
function buildBodyPlaybook(plotHeight: number) {
  return [
    { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 25 },
    { attribute: 'y', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 25 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', delay: 400 },
] as const;

/**
 * 构建 K 线 wick 动画 playbook
 * @param cx 中心 x
 * @param high 最高价
 * @param low 最低价
 * @param base 入场基线（通常为 plotHeight）
 * @param yScale y 比例尺
 */
function buildWickPlaybook(cx: number, high: number, low: number, base: number, yScale: LinearScale) {
  const highY = yScale(high);
  const lowY = yScale(low);
  return [{
    duration: 600,
    easing: 'easeOutCubic' as const,
    targets: 'wick',
    compute: ({ progress }: { progress: number }) => ({
      points: [
        { x: cx, y: base + (highY - base) * progress },
        { x: cx, y: base + (lowY - base) * progress },
      ],
    }),
  }];
}

/**
 * K 线图
 */
export function CandlestickChart(props: Props) {
  return (
    <ChartFrame>
      <CandlestickChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function CandlestickChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: KLineItem) => d.date,
  );

  const items: KLineItem[] = data ?? defaultKLineData();
  const xScale = scaleBand(items.map((d) => d.date), [0, plotWidth], 0.3);
  const allMin = Math.min(...items.map((d) => d.low));
  const allMax = Math.max(...items.map((d) => d.high));
  const pad = (allMax - allMin) * 0.1;
  const yScale = scaleLinear([allMin - pad, allMax + pad], [plotHeight, 0]);
  const maxHigh = useMemo(() => Math.max(...items.map((item) => item.high)), [items]);

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      {items.map((d) => {
        const x = xScale(d.date);
        const bw = xScale.bandwidth;
        const cx = x + bw / 2;
        const isUp = d.close >= d.open;
        const color = isUp ? KLINE_UP : KLINE_DOWN;
        const yOpen = yScale(d.open);
        const yClose = yScale(d.close);
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(Math.abs(yClose - yOpen), 1);
        return (
          <Animation key={`w-${d.date}`} playbook={buildWickPlaybook(cx, d.high, d.low, allMin - pad, yScale)}>
            <Line
              id="wick"
              points={[
                { x: cx, y: yScale(d.high) },
                { x: cx, y: yScale(d.low) },
              ]}
              stroke={color}
              strokeWidth={1}
            />
          </Animation>
        );
      })}
      <Animation playbook={[...buildBodyPlaybook(plotHeight)]}>
        {items.map((d) => {
          const x = xScale(d.date);
          const bw = xScale.bandwidth;
          const isUp = d.close >= d.open;
          const color = isUp ? KLINE_UP : KLINE_DOWN;
          const yOpen = yScale(d.open);
          const yClose = yScale(d.close);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(Math.abs(yClose - yOpen), 1);
          return (
            <Rect
              key={d.date}
              x={x + 1}
              y={bodyTop}
              width={Math.max(bw - 2, 1)}
              height={bodyH}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(d.date))}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>
      <Axis scale={xScale} orient="bottom" length={plotWidth} crossAt={plotHeight} tickFormat={() => ''} />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        <Text
          x={plotWidth - 40}
          y={12}
          text={`最高 ${maxHigh.toFixed(1)}`}
          fontSize={10}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          opacity={1}
        />
      </Animation>
    </>
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
