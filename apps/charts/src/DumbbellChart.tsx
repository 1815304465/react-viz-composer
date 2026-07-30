/**
 * DumbbellChart —— 哑铃图（起止两点连线）
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


interface DumbbellItem {
  name: string;
  start: number;
  end: number;
}

interface Props extends ChartItemHoverProps<DumbbellItem> {
  data?: DumbbellItem[];
}

const LINE_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40 },
] as const;

/** 构建圆点入场 playbook */
function buildDotPlaybook() {
  return [
    { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOutCubic', targets: 'children', stagger: 40, delay: 150 },
    { attribute: 'scaleX', from: 0, duration: 500, easing: 'easeOutCubic', targets: 'children', stagger: 40, delay: 150 },
    { attribute: 'scaleY', from: 0, duration: 500, easing: 'easeOutCubic', targets: 'children', stagger: 40, delay: 150 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 350 },
] as const;

export function DumbbellChart(props: Props) {
  return (
    <ChartFrame>
      <DumbbellChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function DumbbellChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: DumbbellItem) => d.name,
  );

  const dataset = data ?? [
    { name: '产品A', start: 45, end: 72 },
    { name: '产品B', start: 60, end: 55 },
    { name: '产品C', start: 30, end: 48 },
    { name: '产品D', start: 80, end: 65 },
    { name: '产品E', start: 50, end: 78 },
    { name: '产品F', start: 35, end: 42 },
  ];

  const categories = useMemo(() => dataset.map((d) => d.name), [dataset]);
  const yScale = useMemo(
    () => scaleBand(categories, [0, plotHeight], 0.35),
    [categories, plotHeight],
  );
  const xScale = useMemo(() => {
    const allVals = dataset.flatMap((d) => [d.start, d.end]);
    const xMax = Math.max(...allVals) * 1.15;
    const xMin = Math.min(...allVals) * 0.85;
    return scaleLinear([xMin, xMax], [0, plotWidth]);
  }, [dataset, plotWidth]);

  return (
    <>
      <Grid scale={xScale} orient="x" length={plotHeight} />
      <Animation playbook={[...LINE_PLAYBOOK]}>
        {dataset.map((d) => {
          const cy = yScale(d.name) + yScale.bandwidth / 2;
          return (
            <Line
              key={`conn-${d.name}`}
              points={[
                { x: xScale(d.start), y: cy },
                { x: xScale(d.end), y: cy },
              ]}
              stroke="#bfbfbf"
              strokeWidth={2}
              opacity={1}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...buildDotPlaybook()]}>
        {dataset.flatMap((d) => {
          const cy = yScale(d.name) + yScale.bandwidth / 2;
          const hovered = isHovering(d.name);
          return [
            <Ellipse
              key={`start-${d.name}`}
              cx={xScale(d.start)}
              cy={cy}
              rx={hovered ? 8 : 6}
              ry={hovered ? 8 : 6}
              fill={SEMANTIC_6[0]}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, hovered)}
              opacity={1}
              {...bindHover(d)}
            />,
            <Ellipse
              key={`end-${d.name}`}
              cx={xScale(d.end)}
              cy={cy}
              rx={hovered ? 8 : 6}
              ry={hovered ? 8 : 6}
              fill={SEMANTIC_6[3]}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, hovered)}
              opacity={1}
              {...bindHover(d)}
            />,
          ];
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {dataset.map((d) => {
          const cy = yScale(d.name) + yScale.bandwidth / 2;
          const delta = d.end - d.start;
          const sign = delta >= 0 ? '+' : '';
          return (
            <Text
              key={`t-${d.name}`}
              x={plotWidth - 4}
              y={cy + 4}
              text={`${sign}${delta}`}
              fontSize={11}
              fontFamily="sans-serif"
              fill={delta >= 0 ? SEMANTIC_6[3] : SEMANTIC_6[1]}
              textAlign="end"
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


export default DumbbellChart;
