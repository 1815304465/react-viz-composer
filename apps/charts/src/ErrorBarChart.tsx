/**
 * ErrorBarChart —— 误差条形图
 */

import { useMemo } from 'react';
import { Animation, Rect, Line, Text, Group } from '@react-viz-composer/core';
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
  AXIS_COLOR,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
  LinearScale,
} from './local';



interface ErrorBarItem {
  category: string;
  value: number;
  error: number;
}

interface Props extends ChartItemHoverProps<ErrorBarItem> {
  data?: ErrorBarItem[];
  color?: string;
}

const CAP_W = 6;

/** 构建误差柱入场 playbook */
function buildBarPlaybook(plotHeight: number) {
  return [
    { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'y', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 200 },
] as const;

/**
 * 构建误差条列动画 playbook
 * @param cx 柱心 x
 * @param item 数据项
 * @param yScale y 比例尺
 * @param plotHeight 实测绘图区高度
 */
function buildColumnPlaybook(cx: number, item: ErrorBarItem, yScale: LinearScale, plotHeight: number) {
  const errTop = yScale(item.value + item.error);
  const errBot = yScale(item.value - item.error);
  return [
    ...buildBarPlaybook(plotHeight),
    {
      duration: 600,
      easing: 'easeOutCubic' as const,
      targets: 'errLine',
      compute: ({ progress }: { progress: number }) => ({
        points: [
          { x: cx, y: plotHeight + (errTop - plotHeight) * progress },
          { x: cx, y: plotHeight + (errBot - plotHeight) * progress },
        ],
      }),
    },
    {
      duration: 600,
      easing: 'easeOutCubic' as const,
      targets: 'topCap',
      compute: ({ progress }: { progress: number }) => ({
        points: [
          { x: cx - CAP_W, y: plotHeight + (errTop - plotHeight) * progress },
          { x: cx + CAP_W, y: plotHeight + (errTop - plotHeight) * progress },
        ],
      }),
    },
    {
      duration: 600,
      easing: 'easeOutCubic' as const,
      targets: 'botCap',
      compute: ({ progress }: { progress: number }) => ({
        points: [
          { x: cx - CAP_W, y: plotHeight + (errBot - plotHeight) * progress },
          { x: cx + CAP_W, y: plotHeight + (errBot - plotHeight) * progress },
        ],
      }),
    },
  ];
}

/**
 * 误差条形图
 */
export function ErrorBarChart(props: Props) {
  return (
    <ChartFrame>
      <ErrorBarChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function ErrorBarChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: ErrorBarItem) => d.category,
  );

  const dataset: ErrorBarItem[] = data ?? [
    { category: 'A', value: 45, error: 8 },
    { category: 'B', value: 62, error: 12 },
    { category: 'C', value: 38, error: 5 },
    { category: 'D', value: 70, error: 15 },
    { category: 'E', value: 55, error: 7 },
    { category: 'F', value: 48, error: 10 },
  ];

  const categories = useMemo(() => dataset.map((d) => d.category), [dataset]);
  const xScale = useMemo(
    () => scaleBand(categories, [0, plotWidth], 0.3),
    [categories],
  );
  const yScale = useMemo(() => {
    const yMax = Math.max(...dataset.map((d) => d.value + d.error)) * 1.15;
    return scaleLinear([0, yMax], [plotHeight, 0]);
  }, [dataset]);

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      {dataset.map((d) => {
        const x = xScale(d.category);
        const cx = x + xScale.bandwidth / 2;
        const fullHeight = plotHeight - yScale(d.value);
        return (
          <Animation key={d.category} playbook={buildColumnPlaybook(cx, d, yScale, plotHeight)}>
            <Group>
              <Rect
                x={x}
                y={plotHeight - fullHeight}
                width={xScale.bandwidth}
                height={fullHeight}
                fill={color}
                stroke={color}
                strokeWidth={hoverStrokeWidth(1, isHovering(d.category))}
                {...bindHover(d)}
              />
              <Line
                id="errLine"
                points={[
                  { x: cx, y: yScale(d.value + d.error) },
                  { x: cx, y: yScale(d.value - d.error) },
                ]}
                stroke={AXIS_COLOR}
                strokeWidth={1.5}
              />
              <Line
                id="topCap"
                points={[
                  { x: cx - CAP_W, y: yScale(d.value + d.error) },
                  { x: cx + CAP_W, y: yScale(d.value + d.error) },
                ]}
                stroke={AXIS_COLOR}
                strokeWidth={1.5}
              />
              <Line
                id="botCap"
                points={[
                  { x: cx - CAP_W, y: yScale(d.value - d.error) },
                  { x: cx + CAP_W, y: yScale(d.value - d.error) },
                ]}
                stroke={AXIS_COLOR}
                strokeWidth={1.5}
              />
            </Group>
          </Animation>
        );
      })}
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {dataset.map((d) => {
          const x = xScale(d.category);
          const fullHeight = plotHeight - yScale(d.value);
          return (
            <Text
              key={`t-${d.category}`}
              x={x + xScale.bandwidth / 2}
              y={plotHeight - fullHeight - 6}
              text={`${d.value}±${d.error}`}
              fontSize={10}
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


export default ErrorBarChart;
