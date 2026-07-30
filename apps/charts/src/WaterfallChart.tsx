/**
 * WaterfallChart —— 瀑布图
 */

import { useMemo } from 'react';
import { Animation, Rect, Line, Text } from 'react-viz-composer';
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
  scaleLinear,
  scaleBand,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
  BandScale,
  LinearScale,
} from './local';



interface WaterfallItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<WaterfallItem> {
  data?: WaterfallItem[];
}

const GREEN = '#52c41a';
const RED = '#f5222d';

interface RangeItem {
  name: string;
  base: number;
  end: number;
  value: number;
}

const SERIES_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 50, delay: 200 },
] as const;

export function WaterfallChart(props: Props) {
  return (
    <ChartFrame>
      <WaterfallChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function WaterfallChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

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

  const { ranges, yMax, yMin } = useMemo(() => {
    let running = 0;
    const rs: RangeItem[] = [];
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
    () => scaleBand(categories, [0, plotWidth], 0.25),
    [categories],
  );
  const yScale = useMemo(
    () => scaleLinear([yMin, yMax], [plotHeight, 0]),
    [yMin, yMax],
  );

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[...SERIES_PLAYBOOK]}>
        {ranges.map((r, i) => {
          if (i === 0) return null;
          const prevX = xScale(dataset[i - 1].name);
          const curX = xScale(r.name);
          return (
            <Line
              key={`link-${r.name}`}
              points={[
                { x: prevX + xScale.bandwidth, y: yScale(ranges[i - 1].end) },
                { x: curX, y: yScale(r.base) },
              ]}
              stroke="#bfbfbf"
              strokeWidth={1}
              opacity={1}
            />
          );
        })}
        {ranges.map((r) => {
          const baseY = yScale(r.base);
          const endY = yScale(r.end);
          const barH = Math.abs(endY - baseY);
          const color = r.value >= 0 ? GREEN : RED;
          return (
            <Rect
              key={r.name}
              x={xScale(r.name)}
              y={Math.min(baseY, endY)}
              width={xScale.bandwidth}
              height={barH}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(r.name))}
              opacity={1}
              {...bindHover(r)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {ranges.map((r) => {
          const endY = yScale(r.end);
          const offset = r.value >= 0 ? -8 : 14;
          return (
            <Text
              key={`t-${r.name}`}
              x={xScale(r.name) + xScale.bandwidth / 2}
              y={endY + offset}
              text={String(r.value)}
              fontSize={11}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
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


export default WaterfallChart;
