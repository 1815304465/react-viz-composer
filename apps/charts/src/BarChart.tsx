/**
 * BarChart —— 柱状图
 */

import { useMemo } from 'react';
import { Animation, Rect, Text } from 'react-viz-composer';
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
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface BarItem {
  month: string;
  value: number;
}

interface Props extends ChartItemHoverProps<BarItem> {
  data?: BarItem[];
  color?: string;
}

/** 构建柱状图入场 playbook */
function buildBarPlaybook(plotHeight: number) {
  return [
    { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'y', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 200 },
] as const;

export function BarChart(props: Props) {
  return (
    <ChartFrame>
      <BarChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function BarChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: BarItem) => d.month,
  );

  const dataset = data ?? [
    { month: '1月', value: 120 },
    { month: '2月', value: 200 },
    { month: '3月', value: 150 },
    { month: '4月', value: 80 },
    { month: '5月', value: 170 },
    { month: '6月', value: 240 },
  ];

  const categories = useMemo(() => dataset.map((d) => d.month), [dataset]);
  const xScale = useMemo(
    () => scaleBand(categories, [0, plotWidth], 0.3),
    [categories],
  );
  const yScale = useMemo(() => {
    const yMax = Math.max(...dataset.map((d) => d.value)) * 1.1;
    return scaleLinear([0, yMax], [plotHeight, 0]);
  }, [dataset]);

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[...buildBarPlaybook(plotHeight)]}>
        {dataset.map((d) => {
          const x = xScale(d.month);
          const fullHeight = plotHeight - yScale(d.value);
          return (
            <Rect
              key={d.month}
              x={x}
              y={plotHeight - fullHeight}
              width={xScale.bandwidth}
              height={fullHeight}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(d.month))}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {dataset.map((d) => {
          const x = xScale(d.month);
          const fullHeight = plotHeight - yScale(d.value);
          return (
            <Text
              key={`t-${d.month}`}
              x={x + xScale.bandwidth / 2}
              y={plotHeight - fullHeight - 6}
              text={String(d.value)}
              fontSize={11}
              fontFamily="sans-serif"
              fill="#595959"
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


export default BarChart;
