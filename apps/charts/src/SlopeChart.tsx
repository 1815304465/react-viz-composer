/**
 * SlopeChart —— 斜率图（左右两轴连线对比）
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
  scaleLinear,
  SEMANTIC_6,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface SlopeItem {
  name: string;
  left: number;
  right: number;
}

interface Props extends ChartItemHoverProps<SlopeItem> {
  data?: SlopeItem[];
  leftLabel?: string;
  rightLabel?: string;
}

const LINE_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 600, easing: 'easeOut', targets: 'children', stagger: 60 },
] as const;

/** 构建点入场 playbook */
function buildDotPlaybook() {
  return [
    { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOutCubic', targets: 'children', stagger: 60, delay: 200 },
    { attribute: 'scaleX', from: 0, duration: 500, easing: 'easeOutCubic', targets: 'children', stagger: 60, delay: 200 },
    { attribute: 'scaleY', from: 0, duration: 500, easing: 'easeOutCubic', targets: 'children', stagger: 60, delay: 200 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 60, delay: 400 },
] as const;

const AXIS_X_PAD = 60;

export function SlopeChart(props: Props) {
  return (
    <ChartFrame>
      <SlopeChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function SlopeChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, leftLabel = '2023', rightLabel = '2024', onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: SlopeItem) => d.name,
  );

  const dataset = data ?? [
    { name: '北京', left: 85, right: 92 },
    { name: '上海', left: 78, right: 88 },
    { name: '广州', left: 65, right: 70 },
    { name: '深圳', left: 90, right: 95 },
    { name: '杭州', left: 72, right: 80 },
    { name: '成都', left: 55, right: 68 },
  ];

  const leftX = AXIS_X_PAD;
  const rightX = plotWidth - AXIS_X_PAD;
  const innerHeight = plotHeight - 40;

  const yScale = useMemo(() => {
    const allVals = dataset.flatMap((d) => [d.left, d.right]);
    const yMax = Math.max(...allVals) * 1.1;
    const yMin = Math.min(...allVals) * 0.9;
    return scaleLinear([yMin, yMax], [innerHeight, 20]);
  }, [dataset, innerHeight]);

  return (
    <>
      <Grid scale={yScale} orient="y" length={plotWidth} />
      <Animation playbook={[...LINE_PLAYBOOK]}>
        {dataset.map((d, i) => {
          const color = SEMANTIC_6[i % SEMANTIC_6.length];
          const hovered = isHovering(d.name);
          return (
            <Line
              key={`slope-${d.name}`}
              points={[
                { x: leftX, y: yScale(d.left) },
                { x: rightX, y: yScale(d.right) },
              ]}
              stroke={color}
              strokeWidth={hovered ? 3 : 2}
              opacity={hovered ? 1 : 0.7}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...buildDotPlaybook()]}>
        {dataset.flatMap((d, i) => {
          const color = SEMANTIC_6[i % SEMANTIC_6.length];
          const hovered = isHovering(d.name);
          const r = hovered ? 8 : 6;
          return [
            <Ellipse
              key={`left-${d.name}`}
              cx={leftX}
              cy={yScale(d.left)}
              rx={r}
              ry={r}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, hovered)}
              opacity={1}
              {...bindHover(d)}
            />,
            <Ellipse
              key={`right-${d.name}`}
              cx={rightX}
              cy={yScale(d.right)}
              rx={r}
              ry={r}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, hovered)}
              opacity={1}
              {...bindHover(d)}
            />,
          ];
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {dataset.map((d, i) => {
          const color = SEMANTIC_6[i % SEMANTIC_6.length];
          const midY = (yScale(d.left) + yScale(d.right)) / 2;
          return (
            <Text
              key={`label-${d.name}`}
              x={(leftX + rightX) / 2}
              y={midY + 4}
              text={d.name}
              fontSize={11}
              fontFamily="sans-serif"
              fill={color}
              textAlign="middle"
              opacity={isHovering(d.name) ? 1 : 0.8}
            />
          );
        })}
        <Text
          x={leftX}
          y={12}
          text={leftLabel}
          fontSize={12}
          fontWeight="bold"
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
          opacity={1}
        />
        <Text
          x={rightX}
          y={12}
          text={rightLabel}
          fontSize={12}
          fontWeight="bold"
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
          opacity={1}
        />
      </Animation>
      <Axis scale={yScale} orient="left" length={innerHeight} crossAt={leftX} />
      <Axis scale={yScale} orient="right" length={innerHeight} crossAt={rightX} />
    </>
  );
}


export default SlopeChart;
