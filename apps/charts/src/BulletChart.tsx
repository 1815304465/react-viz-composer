/**
 * BulletChart —— 子弹图（区间带 + 度量条 + 目标线）
 */

import { useMemo } from 'react';
import { Animation, Rect, Line, Text } from 'react-viz-composer';
import {
  Axis,
  Grid,
} from 'react-viz-composer';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  scaleBand,
  scaleLinear,
  SEMANTIC_6,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface BulletItem {
  name: string;
  value: number;
  target: number;
  ranges: [number, number, number];
}

interface Props extends ChartItemHoverProps<BulletItem> {
  data?: BulletItem[];
}

const BAND_COLORS = ['#ffccc7', '#ffe7ba', '#d9f7be'];

/** 构建度量条入场 playbook */
function buildBarPlaybook() {
  return [
    { attribute: 'width', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
  ] as const;
}

const TARGET_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 50, delay: 300 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 50, delay: 400 },
] as const;

export function BulletChart(props: Props) {
  return (
    <ChartFrame>
      <BulletChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function BulletChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: BulletItem) => d.name,
  );

  const dataset = data ?? [
    { name: '收入', value: 275, target: 250, ranges: [150, 225, 300] },
    { name: '利润', value: 120, target: 150, ranges: [80, 130, 200] },
    { name: '支出', value: 180, target: 200, ranges: [100, 180, 250] },
    { name: '客户', value: 90, target: 100, ranges: [50, 80, 120] },
  ];

  const categories = useMemo(() => dataset.map((d) => d.name), [dataset]);
  const yScale = useMemo(
    () => scaleBand(categories, [0, plotHeight], 0.4),
    [categories, plotHeight],
  );
  const xScale = useMemo(() => {
    const maxRange = Math.max(...dataset.map((d) => d.ranges[2])) * 1.1;
    return scaleLinear([0, maxRange], [0, plotWidth]);
  }, [dataset, plotWidth]);

  const barHeight = yScale.bandwidth * 0.35;
  const bandHeight = yScale.bandwidth;

  return (
    <>
      <Grid scale={xScale} orient="x" length={plotHeight} />
      {dataset.map((d) => {
        const y = yScale(d.name);
        const [r1, r2, r3] = d.ranges;
        return (
          <Rect
            key={`bands-${d.name}`}
            x={0}
            y={y}
            width={xScale(r1)}
            height={bandHeight}
            fill={BAND_COLORS[0]}
            stroke="none"
          />
        );
      })}
      {dataset.map((d) => {
        const y = yScale(d.name);
        const [r1, r2, r3] = d.ranges;
        return (
          <Rect
            key={`band2-${d.name}`}
            x={xScale(r1)}
            y={y}
            width={xScale(r2) - xScale(r1)}
            height={bandHeight}
            fill={BAND_COLORS[1]}
            stroke="none"
          />
        );
      })}
      {dataset.map((d) => {
        const y = yScale(d.name);
        const [r1, r2, r3] = d.ranges;
        return (
          <Rect
            key={`band3-${d.name}`}
            x={xScale(r2)}
            y={y}
            width={xScale(r3) - xScale(r2)}
            height={bandHeight}
            fill={BAND_COLORS[2]}
            stroke="none"
          />
        );
      })}
      <Animation playbook={[...buildBarPlaybook()]}>
        {dataset.map((d) => {
          const y = yScale(d.name) + (yScale.bandwidth - barHeight) / 2;
          const fullW = xScale(d.value);
          return (
            <Rect
              key={`bar-${d.name}`}
              x={0}
              y={y}
              width={fullW}
              height={barHeight}
              fill={SEMANTIC_6[0]}
              stroke={SEMANTIC_6[0]}
              strokeWidth={hoverStrokeWidth(1, isHovering(d.name))}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...TARGET_PLAYBOOK]}>
        {dataset.map((d) => {
          const y = yScale(d.name);
          const tx = xScale(d.target);
          return (
            <Line
              key={`target-${d.name}`}
              points={[
                { x: tx, y: y + 2 },
                { x: tx, y: y + yScale.bandwidth - 2 },
              ]}
              stroke="#262626"
              strokeWidth={3}
              opacity={1}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {dataset.map((d) => {
          const cy = yScale(d.name) + yScale.bandwidth / 2 + 4;
          return (
            <Text
              key={`t-${d.name}`}
              x={xScale(d.value) + 6}
              y={cy}
              text={`${d.value} / ${d.target}`}
              fontSize={10}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              textAlign="start"
              opacity={1}
            />
          );
        })}
      </Animation>
      <Axis scale={xScale} orient="bottom" length={plotWidth} crossAt={plotHeight} />
      <Axis scale={yScale} orient="left" length={plotHeight} crossAt={0} />
    </>
  );
}


export default BulletChart;
