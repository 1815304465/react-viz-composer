/**
 * DualAxisChart —— 双轴图（左轴柱 + 右轴线）
 */

import { useMemo } from 'react';
import { Animation, Rect, Path, Ellipse } from '@react-viz-composer/core';
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


interface DualAxisItem {
  category: string;
  bar: number;
  line: number;
}

interface Props extends ChartItemHoverProps<DualAxisItem> {
  data?: DualAxisItem[];
}

/** 构建柱状入场 playbook */
function buildBarPlaybook(plotHeight: number) {
  return [
    { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'y', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
  ] as const;
}

/** 构建折线点入场 playbook */
function buildPointPlaybook(plotHeight: number) {
  return [
    { attribute: 'cy', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'opacity', from: 0, duration: 400, easing: 'easeOut', targets: 'children', stagger: 40 },
  ] as const;
}

/**
 * 构建折线路径 d
 */
function buildLinePath(
  dataset: DualAxisItem[],
  xScale: BandScale,
  lineScale: LinearScale,
): string {
  const points = dataset.map((d) => ({
    x: xScale(d.category) + xScale.bandwidth / 2,
    y: lineScale(d.line),
  }));
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
}

export function DualAxisChart(props: Props) {
  return (
    <ChartFrame>
      <DualAxisChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function DualAxisChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: DualAxisItem) => d.category,
  );

  const dataset = data ?? [
    { category: '1月', bar: 320, line: 12 },
    { category: '2月', bar: 280, line: 18 },
    { category: '3月', bar: 410, line: 25 },
    { category: '4月', bar: 360, line: 22 },
    { category: '5月', bar: 450, line: 30 },
    { category: '6月', bar: 390, line: 28 },
  ];

  const categories = useMemo(() => dataset.map((d) => d.category), [dataset]);
  const xScale = useMemo(
    () => scaleBand(categories, [0, plotWidth], 0.25),
    [categories, plotWidth],
  );
  const barScale = useMemo(() => {
    const max = Math.max(...dataset.map((d) => d.bar)) * 1.15;
    return scaleLinear([0, max], [plotHeight, 0]);
  }, [dataset, plotHeight]);
  const lineScale = useMemo(() => {
    const max = Math.max(...dataset.map((d) => d.line)) * 1.2;
    const min = Math.min(...dataset.map((d) => d.line)) * 0.8;
    return scaleLinear([min, max], [plotHeight, 0]);
  }, [dataset, plotHeight]);

  const finalLineD = buildLinePath(dataset, xScale, lineScale);

  return (
    <>
      <Grid scale={barScale} orient="y" length={plotWidth} />
      <Animation playbook={[...buildBarPlaybook(plotHeight)]}>
        {dataset.map((d) => {
          const x = xScale(d.category);
          const fullH = plotHeight - barScale(d.bar);
          return (
            <Rect
              key={`bar-${d.category}`}
              x={x}
              y={plotHeight - fullH}
              width={xScale.bandwidth}
              height={fullH}
              fill={SEMANTIC_6[0] + '80'}
              stroke={SEMANTIC_6[0]}
              strokeWidth={hoverStrokeWidth(1, isHovering(d.category))}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[{
        duration: 700,
        easing: 'easeOutCubic',
        targets: 'line-path',
        compute: ({ progress }: { progress: number }) => {
          const points = dataset.map((d) => ({
            x: xScale(d.category) + xScale.bandwidth / 2,
            y: plotHeight + (lineScale(d.line) - plotHeight) * progress,
          }));
          const d = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
          return { d };
        },
      }]}>
        <Path
          id="line-path"
          d={finalLineD}
          fill="none"
          stroke={SEMANTIC_6[3]}
          strokeWidth={2.5}
        />
      </Animation>
      <Animation playbook={[...buildPointPlaybook(plotHeight)]}>
        {dataset.map((d) => (
          <Ellipse
            key={`pt-${d.category}`}
            cx={xScale(d.category) + xScale.bandwidth / 2}
            cy={lineScale(d.line)}
            rx={isHovering(d.category) ? 7 : 5}
            ry={isHovering(d.category) ? 7 : 5}
            fill="#fff"
            stroke={SEMANTIC_6[3]}
            strokeWidth={hoverStrokeWidth(2, isHovering(d.category))}
            opacity={1}
            {...bindHover(d)}
          />
        ))}
      </Animation>
      <Axis scale={xScale} orient="bottom" length={plotWidth} crossAt={plotHeight} />
      <Axis scale={barScale} orient="left" length={plotHeight} crossAt={0} />
      <Axis scale={lineScale} orient="right" length={plotHeight} crossAt={plotWidth} />
    </>
  );
}


export default DualAxisChart;
