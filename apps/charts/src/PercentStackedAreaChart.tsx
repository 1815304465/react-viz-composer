/**
 * PercentStackedAreaChart —— 百分比堆叠面积图
 */

import { Animation, Path, Ellipse, Text } from '@react-viz-composer/core';
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
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
  BandScale,
  LinearScale,
} from './local';


interface Series {
  name: string;
  values: number[];
}

interface StackedHoverPayload {
  series: string;
  category: string;
  value: number;
  percent: number;
}

interface Props extends ChartItemHoverProps<StackedHoverPayload> {
  data?: Series[];
  categories?: string[];
}

const PATH_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOut', targets: 'children', stagger: 120 },
] as const;

/** 构建点入场 playbook */
function buildPointPlaybook(plotHeight: number) {
  return [
    { attribute: 'cy', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'opacity', from: 0, duration: 400, easing: 'easeOut', targets: 'children', stagger: 40 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 120, delay: 300 },
] as const;

/**
 * 将原始值转为各类目内的百分比
 */
function toPercentValues(series: Series[]): number[][] {
  const catCount = series[0]?.values.length ?? 0;
  return series.map((s) =>
    s.values.map((v, i) => {
      const total = series.reduce((sum, ser) => sum + ser.values[i], 0);
      return total > 0 ? (v / total) * 100 : 0;
    }),
  );
}

/**
 * 构建堆叠面积路径
 */
function buildStackedAreaPath(
  values: number[],
  cumulativeBelow: number[],
  cats: string[],
  xScale: BandScale,
  yScale: LinearScale,
): string {
  const points = values.map((v, i) => ({
    x: xScale(cats[i]) + xScale.bandwidth / 2,
    yTop: yScale(cumulativeBelow[i] + v),
    yBottom: yScale(cumulativeBelow[i]),
  }));
  return (
    `M ${points[0].x} ${points[0].yBottom} ` +
    points.map((pt) => `L ${pt.x} ${pt.yTop}`).join(' ') +
    ` L ${points[points.length - 1].x} ${points[points.length - 1].yBottom} ` +
    [...points].reverse().map((pt) => `L ${pt.x} ${pt.yBottom}`).join(' ') +
    ' Z'
  );
}

/**
 * 构建堆叠顶线路径
 */
function buildStackedLinePath(
  values: number[],
  cumulativeBelow: number[],
  cats: string[],
  xScale: BandScale,
  yScale: LinearScale,
): string {
  const points = values.map((v, i) => ({
    x: xScale(cats[i]) + xScale.bandwidth / 2,
    y: yScale(cumulativeBelow[i] + v),
  }));
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
}

export function PercentStackedAreaChart(props: Props) {
  return (
    <ChartFrame>
      <PercentStackedAreaChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function PercentStackedAreaChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, categories, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<StackedHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.series}-${p.category}`,
  );

  const series: Series[] = data ?? [
    { name: '产品A', values: [120, 200, 150, 80, 70, 110, 130] },
    { name: '产品B', values: [80, 130, 90, 50, 40, 70, 90] },
    { name: '产品C', values: [40, 60, 50, 30, 20, 35, 45] },
  ];
  const cats = categories ?? ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'];

  const percentValues = toPercentValues(series);
  const xScale = scaleBand(cats, [0, plotWidth], 0.05);
  const yScale = scaleLinear([0, 100], [plotHeight, 0]);

  return (
    <>
      <Grid scale={yScale} orient="y" length={plotWidth} />
      <Animation playbook={[...PATH_PLAYBOOK]}>
        {series.flatMap((s, si) => {
          const pctVals = percentValues[si];
          const cumulativeBelow = cats.map((_, i) =>
            percentValues.slice(0, si).reduce((sum, prev) => sum + prev[i], 0),
          );
          const color = SEMANTIC_6[si % SEMANTIC_6.length];
          return [
            <Path
              key={`area-${s.name}`}
              d={buildStackedAreaPath(pctVals, cumulativeBelow, cats, xScale, yScale)}
              fill={color + '50'}
              stroke="none"
              opacity={1}
            />,
            <Path
              key={`line-${s.name}`}
              d={buildStackedLinePath(pctVals, cumulativeBelow, cats, xScale, yScale)}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={1}
            />,
          ];
        })}
      </Animation>
      <Animation playbook={[...buildPointPlaybook(plotHeight)]}>
        {series.flatMap((s, si) => {
          const color = SEMANTIC_6[si % SEMANTIC_6.length];
          const pctVals = percentValues[si];
          const cumulativeBelow = cats.map((_, i) =>
            percentValues.slice(0, si).reduce((sum, prev) => sum + prev[i], 0),
          );
          return pctVals.map((v, i) => {
            const payload: StackedHoverPayload = {
              series: s.name,
              category: cats[i],
              value: s.values[i],
              percent: v,
            };
            const pointKey = `${s.name}-${cats[i]}`;
            return (
              <Ellipse
                key={`${s.name}-${i}`}
                cx={xScale(cats[i]) + xScale.bandwidth / 2}
                cy={yScale(cumulativeBelow[i] + v)}
                rx={isHovering(pointKey) ? 6 : 4}
                ry={isHovering(pointKey) ? 6 : 4}
                fill="#fff"
                stroke={color}
                strokeWidth={hoverStrokeWidth(2, isHovering(pointKey))}
                opacity={1}
                {...bindHover(payload)}
              />
            );
          });
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {series.map((s, si) => {
          const pctVals = percentValues[si];
          const cumulativeBelow = cats.map((_, i) =>
            percentValues.slice(0, si).reduce((sum, prev) => sum + prev[i], 0),
          );
          const lastIdx = pctVals.length - 1;
          const lastX = xScale(cats[lastIdx]) + xScale.bandwidth / 2;
          const lastCum = cumulativeBelow[lastIdx];
          return (
            <Text
              key={`label-${s.name}`}
              x={lastX + 8}
              y={yScale(lastCum + pctVals[lastIdx]) + 4}
              text={s.name}
              fontSize={11}
              fontFamily="sans-serif"
              fill={SEMANTIC_6[si % SEMANTIC_6.length]}
              opacity={1}
            />
          );
        })}
      </Animation>
      <Axis scale={xScale} orient="bottom" length={plotWidth} crossAt={plotHeight} />
      <Axis
        scale={yScale}
        orient="left"
        length={plotHeight}
        crossAt={0}
        tickFormat={(v) => `${v}%`}
      />
    </>
  );
}


export default PercentStackedAreaChart;
