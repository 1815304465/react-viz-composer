/**
 * BoxplotChart —— 箱线图（盒须图）
 */

import { useMemo } from 'react';
import { Animation, Rect, Line, Text, Group } from '@react-viz-composer/core';
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
  scaleLinear,
  scaleBand,
  SEMANTIC_6,
  AXIS_COLOR,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
  LinearScale,
} from './local';



interface BoxplotItem {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

interface Props extends ChartItemHoverProps<BoxplotItem> {
  data?: BoxplotItem[];
  color?: string;
}

/**
 * 构建箱线图列动画 playbook
 */
function buildBoxPlaybook(item: BoxplotItem, cx: number, yScale: LinearScale) {
  const minY = yScale(item.min);
  const q1Y = yScale(item.q1);
  const q3Y = yScale(item.q3);
  const maxY = yScale(item.max);
  const medY = yScale(item.median);
  const boxH = Math.abs(q3Y - q1Y);
  return [
    {
      duration: 600,
      easing: 'easeOutCubic' as const,
      targets: 'minLine',
      compute: ({ progress }: { progress: number }) => ({
        points: [
          { x: cx, y: PLOT_HEIGHT + (minY - PLOT_HEIGHT) * progress },
          { x: cx, y: PLOT_HEIGHT + (q1Y - PLOT_HEIGHT) * progress },
        ],
      }),
    },
    {
      duration: 600,
      easing: 'easeOutCubic' as const,
      targets: 'maxLine',
      compute: ({ progress }: { progress: number }) => ({
        points: [
          { x: cx, y: PLOT_HEIGHT + (q3Y - PLOT_HEIGHT) * progress },
          { x: cx, y: PLOT_HEIGHT + (maxY - PLOT_HEIGHT) * progress },
        ],
      }),
    },
    { attribute: 'height' as const, from: 0, duration: 600, easing: 'easeOutCubic' as const, targets: 'box' },
    { attribute: 'y' as const, from: PLOT_HEIGHT, duration: 600, easing: 'easeOutCubic' as const, targets: 'box' },
    {
      duration: 600,
      easing: 'easeOutCubic' as const,
      targets: 'medLine',
      compute: ({ progress }: { progress: number }) => ({
        points: [
          { x: cx - 0, y: PLOT_HEIGHT + (medY - PLOT_HEIGHT) * progress },
          { x: cx + 0, y: PLOT_HEIGHT + (medY - PLOT_HEIGHT) * progress },
        ],
      }),
    },
  ];
}

/**
 * 箱线图
 */
export function BoxplotChart(props: Props) {
  return (
    <ChartFrame>
      <BoxplotChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function BoxplotChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: BoxplotItem) => d.category,
  );

  const dataset: BoxplotItem[] = data ?? [
    { category: 'A组', min: 10, q1: 25, median: 42, q3: 58, max: 80 },
    { category: 'B组', min: 20, q1: 35, median: 50, q3: 65, max: 90 },
    { category: 'C组', min: 5, q1: 18, median: 30, q3: 48, max: 70 },
    { category: 'D组', min: 15, q1: 28, median: 45, q3: 60, max: 85 },
    { category: 'E组', min: 8, q1: 22, median: 38, q3: 52, max: 75 },
  ];

  const categories = useMemo(() => dataset.map((d) => d.category), [dataset]);
  const xScale = useMemo(
    () => scaleBand(categories, [0, plotWidth], 0.3),
    [categories],
  );
  const yScale = useMemo(() => {
    const allVals = dataset.flatMap((d) => [d.min, d.max]);
    const yMin = Math.min(...allVals) * 0.9;
    const yMax = Math.max(...allVals) * 1.1;
    return scaleLinear([yMin, yMax], [plotHeight, 0]);
  }, [dataset]);

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      {dataset.map((d) => {
        const cx = xScale(d.category) + xScale.bandwidth / 2;
        const boxW = xScale.bandwidth * 0.6;
        const whiskerW = boxW * 0.5;
        const q1Y = yScale(d.q1);
        const q3Y = yScale(d.q3);
        const boxH = Math.abs(q3Y - q1Y);
        return (
          <Animation key={d.category} playbook={buildBoxPlaybook(d, cx, yScale)}>
            <Group>
              <Line
                id="minLine"
                points={[{ x: cx, y: yScale(d.min) }, { x: cx, y: yScale(d.q1) }]}
                stroke={AXIS_COLOR}
                strokeWidth={1}
              />
              <Line
                points={[
                  { x: cx - whiskerW / 2, y: yScale(d.min) },
                  { x: cx + whiskerW / 2, y: yScale(d.min) },
                ]}
                stroke={AXIS_COLOR}
                strokeWidth={1}
              />
              <Line
                id="maxLine"
                points={[{ x: cx, y: yScale(d.q3) }, { x: cx, y: yScale(d.max) }]}
                stroke={AXIS_COLOR}
                strokeWidth={1}
              />
              <Line
                points={[
                  { x: cx - whiskerW / 2, y: yScale(d.max) },
                  { x: cx + whiskerW / 2, y: yScale(d.max) },
                ]}
                stroke={AXIS_COLOR}
                strokeWidth={1}
              />
              <Rect
                id="box"
                x={cx - boxW / 2}
                y={q3Y}
                width={boxW}
                height={boxH}
                fill={color}
                stroke={color}
                strokeWidth={hoverStrokeWidth(1, isHovering(d.category))}
                {...bindHover(d)}
              />
              <Line
                id="medLine"
                points={[
                  { x: cx - boxW / 2, y: yScale(d.median) },
                  { x: cx + boxW / 2, y: yScale(d.median) },
                ]}
                stroke="#fff"
                strokeWidth={2}
              />
            </Group>
          </Animation>
        );
      })}
      <Animation playbook={[
        { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 200 },
      ]}>
        {dataset.map((d) => (
          <Text
            key={`t-${d.category}`}
            x={xScale(d.category) + xScale.bandwidth / 2}
            y={yScale(d.max) - 6}
            text={`${d.median}`}
            fontSize={10}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="middle"
            opacity={1}
          />
        ))}
      </Animation>
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
    </>
  );
}


export default BoxplotChart;
