/**
 * BidirectionalBarChart —— 双向柱状图
 */

import { Fragment } from 'react';
import { Animation, Rect, Text } from '@react-viz-composer/core';
import {
  Axis,
  Grid,
} from '@react-viz-composer/kit';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  scaleBand,
  scaleLinear,
  SEMANTIC_6,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface BiBarItem {
  name: string;
  positive: number;
  negative: number;
}

interface BiHoverPayload {
  name: string;
  direction: 'positive' | 'negative';
  value: number;
}

interface Props extends ChartItemHoverProps<BiHoverPayload> {
  data?: BiBarItem[];
}

const BAR_PLAYBOOK = [
  { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 20 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 200 },
] as const;

/**
 * 双向柱状图
 */
export function BidirectionalBarChart(props: Props) {
  return (
    <ChartFrame>
      <BidirectionalBarChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function BidirectionalBarChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<BiHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.name}-${p.direction}`,
  );

  const dataset = data ?? [
    { name: '18-25', positive: 45, negative: 38 },
    { name: '26-35', positive: 72, negative: 60 },
    { name: '36-45', positive: 55, negative: 48 },
    { name: '46-55', positive: 38, negative: 40 },
    { name: '56-65', positive: 25, negative: 30 },
    { name: '65+', positive: 15, negative: 22 },
  ];

  const categories = dataset.map((d) => d.name);
  const xScale = scaleBand(categories, [0, plotWidth], 0.3);
  const maxV = Math.max(...dataset.map((d) => Math.max(d.positive, d.negative))) * 1.1;
  const yScale = scaleLinear([-maxV, maxV], [plotHeight, 0]);
  const zeroY = yScale(0);
  const posColor = SEMANTIC_6[0];
  const negColor = SEMANTIC_6[3];

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[
        ...BAR_PLAYBOOK,
        { attribute: 'y', from: zeroY, duration: 600, easing: 'easeOutCubic', targets: 'pos', stagger: 40 },
        { attribute: 'y', from: zeroY, duration: 600, easing: 'easeOutCubic', targets: 'neg', stagger: 40 },
      ]}>
        {dataset.map((d) => {
          const x = xScale(d.name);
          const posFullH = zeroY - yScale(d.positive);
          const negFullH = yScale(-d.negative) - zeroY;
          return (
            <Fragment key={d.name}>
              <Rect
                id="pos"
                x={x}
                y={zeroY - posFullH}
                width={xScale.bandwidth}
                height={posFullH}
                fill={posColor}
                stroke={posColor}
                strokeWidth={hoverStrokeWidth(1, isHovering(`${d.name}-positive`))}
                {...bindHover({ name: d.name, direction: 'positive', value: d.positive })}
              />
              <Rect
                id="neg"
                x={x}
                y={zeroY}
                width={xScale.bandwidth}
                height={negFullH}
                fill={negColor}
                stroke={negColor}
                strokeWidth={hoverStrokeWidth(1, isHovering(`${d.name}-negative`))}
                {...bindHover({ name: d.name, direction: 'negative', value: d.negative })}
              />
            </Fragment>
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {dataset.map((d) => {
          const x = xScale(d.name);
          const posFullH = zeroY - yScale(d.positive);
          const negFullH = yScale(-d.negative) - zeroY;
          return (
            <Fragment key={`lbl-${d.name}`}>
              <Text
                x={x + xScale.bandwidth / 2}
                y={zeroY - posFullH - 4}
                text={String(d.positive)}
                fontSize={10}
                fontFamily="sans-serif"
                fill={SEMANTIC_6[0]}
                textAlign="middle"
                opacity={1}
              />
              <Text
                x={x + xScale.bandwidth / 2}
                y={zeroY + negFullH + 12}
                text={String(d.negative)}
                fontSize={10}
                fontFamily="sans-serif"
                fill={SEMANTIC_6[3]}
                textAlign="middle"
                opacity={1}
              />
            </Fragment>
          );
        })}
      </Animation>
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
    </>
  );
}


export default BidirectionalBarChart;
