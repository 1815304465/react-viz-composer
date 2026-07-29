/**
 * BubbleChart —— 气泡图
 *
 * 体现：Ellipse 半径映射、opacity 分层、RadialGradient、多系列配色
 */

import { useMemo } from 'react';
import { Animation, Ellipse, Text, RadialGradient } from '@react-viz-composer/core';
import {
  Axis,
  Grid,
} from '@react-viz-composer/kit';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverOpacity,
  hoverStrokeWidth,
  scaleLinear,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface BubbleItem {
  name: string;
  x: number;
  y: number;
  size: number;
  group: number;
}

interface Props extends ChartItemHoverProps<BubbleItem> {
  data?: BubbleItem[];
}

const DOT_PLAYBOOK = [
  { attribute: 'rx', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
  { attribute: 'ry', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 50, delay: 300 },
] as const;

/**
 * 气泡图
 */
export function BubbleChart(props: Props) {
  return (
    <ChartFrame>
      <BubbleChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function BubbleChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: BubbleItem) => d.name,
  );

  const items = data ?? [
    { name: '华北', x: 22, y: 68, size: 42, group: 0 },
    { name: '华东', x: 58, y: 72, size: 58, group: 0 },
  ];

  const xScale = useMemo(() => scaleLinear([0, 100], [0, PLOT_WIDTH]), []);
  const yScale = useMemo(() => scaleLinear([0, 100], [PLOT_HEIGHT, 0]), []);
  const maxSize = useMemo(() => Math.max(...items.map((d) => d.size)), [items]);

  return (
    <>
      {CATEGORY_12.slice(0, 4).map((color: string, i: number) => (
        <RadialGradient
          key={`bubble-grad-${i}`}
          id={`bubble-grad-${i}`}
          cx={0.35}
          cy={0.35}
          r={0.65}
          stops={[
            { offset: 0, color: color, opacity: 0.95 },
            { offset: 1, color: color, opacity: 0.35 },
          ]}
        />
      ))}

      <Grid scale={xScale} orient="x"  length={plotHeight} />
      <Grid scale={yScale} orient="y"  length={plotWidth} />

      <Animation playbook={[...DOT_PLAYBOOK]}>
        {items.map((d) => {
          const colorIdx = d.group % 4;
          const hovered = isHovering(d.name);
          const targetR = (d.size / maxSize) * 28 + 6;
          return (
            <Ellipse
              key={d.name}
              cx={xScale(d.x)}
              cy={yScale(d.y)}
              rx={targetR}
              ry={targetR}
              fill={`url(#bubble-grad-${colorIdx})`}
              stroke={CATEGORY_12[colorIdx]}
              strokeWidth={hoverStrokeWidth(1, hovered)}
              opacity={hoverOpacity(0.92, hovered)}
              zIndex={Math.round(d.size) + (hovered ? 100 : 0)}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>

      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {items.map((d) => (
          <Text
            key={`label-${d.name}`}
            x={xScale(d.x)}
            y={yScale(d.y) + 4}
            text={d.name}
            fontSize={10}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="middle"
            zIndex={100}
            opacity={1}
          />
        ))}
      </Animation>

      <Axis scale={xScale} orient="bottom" length={plotWidth} crossAt={plotHeight} tickFormat={(v) => `${v}%`} />
      <Axis scale={yScale} orient="left" length={plotHeight} crossAt={0} tickFormat={(v) => `${v}%`} />
    </>
  );
}


export default BubbleChart;

