/**
 * LollipopChart —— 棒棒糖图（横向线段 + 圆点）
 */

import { useMemo } from 'react';
import { Animation, Line, Ellipse, Text } from '@react-viz-composer/core';
import {
  Axis,
  Grid,
} from '@react-viz-composer/kit';
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


interface LollipopItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<LollipopItem> {
  data?: LollipopItem[];
  color?: string;
}

const STICK_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40 },
] as const;

/** 构建圆点入场 playbook */
function buildDotPlaybook() {
  return [
    { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOutCubic', targets: 'children', stagger: 40, delay: 200 },
    { attribute: 'scaleX', from: 0, duration: 500, easing: 'easeOutCubic', targets: 'children', stagger: 40, delay: 200 },
    { attribute: 'scaleY', from: 0, duration: 500, easing: 'easeOutCubic', targets: 'children', stagger: 40, delay: 200 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 350 },
] as const;

export function LollipopChart(props: Props) {
  return (
    <ChartFrame>
      <LollipopChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function LollipopChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: LollipopItem) => d.name,
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
    () => scaleBand(categories, [0, plotHeight], 0.35),
    [categories, plotHeight],
  );
  const xScale = useMemo(() => {
    const xMax = Math.max(...dataset.map((d) => d.value)) * 1.15;
    return scaleLinear([0, xMax], [0, plotWidth]);
  }, [dataset, plotWidth]);

  return (
    <>
      <Grid scale={xScale} orient="x" length={plotHeight} />
      <Animation playbook={[...STICK_PLAYBOOK]}>
        {dataset.map((d) => {
          const cy = yScale(d.name) + yScale.bandwidth / 2;
          const endX = xScale(d.value);
          return (
            <Line
              key={`stick-${d.name}`}
              points={[{ x: 0, y: cy }, { x: endX, y: cy }]}
              stroke={color}
              strokeWidth={2}
              opacity={1}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...buildDotPlaybook()]}>
        {dataset.map((d) => {
          const cy = yScale(d.name) + yScale.bandwidth / 2;
          const cx = xScale(d.value);
          const r = isHovering(d.name) ? 9 : 7;
          return (
            <Ellipse
              key={`dot-${d.name}`}
              cx={cx}
              cy={cy}
              rx={r}
              ry={r}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, isHovering(d.name))}
              opacity={1}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {dataset.map((d) => {
          const cy = yScale(d.name) + yScale.bandwidth / 2;
          const cx = xScale(d.value);
          return (
            <Text
              key={`t-${d.name}`}
              x={cx + 12}
              y={cy + 4}
              text={String(d.value)}
              fontSize={11}
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


export default LollipopChart;
