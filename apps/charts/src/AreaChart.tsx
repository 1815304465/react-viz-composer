/**
 * AreaChart —— 面积图
 */

import { Animation, Path, Ellipse, Text } from '@react-viz-composer/core';
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


interface Series {
  name: string;
  values: number[];
}

interface AreaHoverPayload {
  series: string;
  category: string;
  value: number;
}

interface Props extends ChartItemHoverProps<AreaHoverPayload> {
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
 * 构建面积路径 d
 */
function buildAreaPath(
  values: number[],
  cats: string[],
  xScale: ReturnType<typeof scaleBand>,
  yScale: ReturnType<typeof scaleLinear>,
): string {
  const points = values.map((v, i) => ({
    x: xScale(cats[i]) + xScale.bandwidth / 2,
    y: yScale(v),
  }));
  return (
    `M ${points[0].x} ${PLOT_HEIGHT} ` +
    points.map((pt) => `L ${pt.x} ${pt.y}`).join(' ') +
    ` L ${points[points.length - 1].x} ${PLOT_HEIGHT} Z`
  );
}

/**
 * 构建折线路径 d
 */
function buildLinePath(
  values: number[],
  cats: string[],
  xScale: ReturnType<typeof scaleBand>,
  yScale: ReturnType<typeof scaleLinear>,
): string {
  const points = values.map((v, i) => ({
    x: xScale(cats[i]) + xScale.bandwidth / 2,
    y: yScale(v),
  }));
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
}

export function AreaChart(props: Props) {
  return (
    <ChartFrame>
      <AreaChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function AreaChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, categories, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: AreaHoverPayload): string => `${p.series}-${p.category}`,
  );

  const series: Series[] = data ?? [
    { name: '产品A', values: [120, 200, 150, 80, 70, 110, 130] },
    { name: '产品B', values: [80, 130, 90, 50, 40, 70, 90] },
  ];
  const cats = categories ?? ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'];

  const xScale = scaleBand(cats, [0, plotWidth], 0.05);
  const maxV = Math.max(...series.flatMap((s) => s.values)) * 1.1;
  const yScale = scaleLinear([0, maxV], [plotHeight, 0]);

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[...PATH_PLAYBOOK]}>
        {series.map((s, idx) => (
          <Path
            key={`area-${s.name}`}
            d={buildAreaPath(s.values, cats, xScale, yScale)}
            fill={SEMANTIC_6[idx % SEMANTIC_6.length] + '40'}
            stroke="none"
            opacity={1}
          />
        ))}
        {series.map((s, idx) => (
          <Path
            key={`line-${s.name}`}
            d={buildLinePath(s.values, cats, xScale, yScale)}
            fill="none"
            stroke={SEMANTIC_6[idx % SEMANTIC_6.length]}
            strokeWidth={2}
            opacity={1}
          />
        ))}
      </Animation>
      <Animation playbook={[...buildPointPlaybook(plotHeight)]}>
        {series.flatMap((s, idx) => {
          const color = SEMANTIC_6[idx % SEMANTIC_6.length];
          return s.values.map((v, i) => {
            const payload: AreaHoverPayload = {
              series: s.name,
              category: cats[i],
              value: v,
            };
            const pointKey = `${s.name}-${cats[i]}`;
            return (
              <Ellipse
                key={`${s.name}-${i}`}
                cx={xScale(cats[i]) + xScale.bandwidth / 2}
                cy={yScale(v)}
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
        {series.map((s, idx) => {
          const lastIdx = s.values.length - 1;
          const lastX = xScale(cats[lastIdx]) + xScale.bandwidth / 2;
          const lastValue = s.values[lastIdx];
          return (
            <Text
              key={`label-${s.name}`}
              x={lastX + 8}
              y={yScale(lastValue) + 4}
              text={s.name}
              fontSize={11}
              fontFamily="sans-serif"
              fill={SEMANTIC_6[idx % SEMANTIC_6.length]}
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


export default AreaChart;
