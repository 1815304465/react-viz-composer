/**
 * HorizontalBarChart —— 横向柱状图
 */

import { useMemo } from 'react';
import { Animation, Rect, Text } from 'react-viz-composer';
import {
  Axis,
  Grid,
} from 'react-viz-composer';
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


interface BarItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<BarItem> {
  data?: BarItem[];
  color?: string;
}

const BAR_PLAYBOOK = [
  { attribute: 'width', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 200 },
] as const;

export function HorizontalBarChart(props: Props) {
  return (
    <ChartFrame>
      <HorizontalBarChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function HorizontalBarChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: BarItem) => d.name,
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
    () => scaleBand(categories, [0, plotHeight], 0.3),
    [categories],
  );
  const xScale = useMemo(() => {
    const xMax = Math.max(...dataset.map((d) => d.value)) * 1.1;
    return scaleLinear([0, xMax], [0, plotWidth]);
  }, [dataset]);

  return (
    <>
      <Grid scale={xScale} orient="x"  length={plotHeight} />
      <Animation playbook={[...BAR_PLAYBOOK]}>
        {dataset.map((d) => {
          const fullWidth = xScale(d.value);
          return (
            <Rect
              key={d.name}
              x={0}
              y={yScale(d.name)}
              width={fullWidth}
              height={yScale.bandwidth}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(d.name))}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {dataset.map((d) => {
          const fullWidth = xScale(d.value);
          return (
            <Text
              key={`t-${d.name}`}
              x={fullWidth + 6}
              y={yScale(d.name) + yScale.bandwidth / 2 + 4}
              text={String(d.value)}
              fontSize={11}
              fontFamily="sans-serif"
              fill="#595959"
              textAlign="start"
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


export default HorizontalBarChart;
