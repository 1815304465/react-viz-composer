/**
 * RangeAreaChart —— 区间面积图（高低带 + 可选中线）
 */

import { useMemo } from 'react';
import { Animation, Path, Line, Ellipse } from '@react-viz-composer/core';
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


interface RangeItem {
  name: string;
  low: number;
  high: number;
  mid?: number;
}

interface Props extends ChartItemHoverProps<RangeItem> {
  data?: RangeItem[];
  color?: string;
}

const AREA_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOut', targets: 'children' },
] as const;

/** 构建点入场 playbook */
function buildPointPlaybook(plotHeight: number) {
  return [
    { attribute: 'cy', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'opacity', from: 0, duration: 400, easing: 'easeOut', targets: 'children', stagger: 40 },
  ] as const;
}

/**
 * 构建区间面积路径
 */
function buildRangeAreaPath(
  dataset: RangeItem[],
  cats: string[],
  xScale: BandScale,
  yScale: LinearScale,
): string {
  const topPoints = dataset.map((d, i) => ({
    x: xScale(cats[i]) + xScale.bandwidth / 2,
    y: yScale(d.high),
  }));
  const botPoints = dataset.map((d, i) => ({
    x: xScale(cats[i]) + xScale.bandwidth / 2,
    y: yScale(d.low),
  }));
  return (
    `M ${topPoints[0].x} ${topPoints[0].y} ` +
    topPoints.slice(1).map((pt) => `L ${pt.x} ${pt.y}`).join(' ') +
    ` L ${botPoints[botPoints.length - 1].x} ${botPoints[botPoints.length - 1].y} ` +
    [...botPoints].reverse().map((pt) => `L ${pt.x} ${pt.y}`).join(' ') +
    ' Z'
  );
}

/**
 * 构建折线路径
 */
function buildLinePath(
  values: number[],
  cats: string[],
  xScale: BandScale,
  yScale: LinearScale,
): string {
  const points = values.map((v, i) => ({
    x: xScale(cats[i]) + xScale.bandwidth / 2,
    y: yScale(v),
  }));
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
}

export function RangeAreaChart(props: Props) {
  return (
    <ChartFrame>
      <RangeAreaChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function RangeAreaChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: RangeItem) => d.name,
  );

  const dataset = data ?? [
    { name: '1月', low: 20, high: 45, mid: 32 },
    { name: '2月', low: 25, high: 52, mid: 38 },
    { name: '3月', low: 18, high: 48, mid: 30 },
    { name: '4月', low: 30, high: 60, mid: 42 },
    { name: '5月', low: 28, high: 55, mid: 40 },
    { name: '6月', low: 35, high: 65, mid: 48 },
  ];

  const cats = useMemo(() => dataset.map((d) => d.name), [dataset]);
  const xScale = useMemo(
    () => scaleBand(cats, [0, plotWidth], 0.1),
    [cats, plotWidth],
  );
  const yScale = useMemo(() => {
    const yMax = Math.max(...dataset.map((d) => d.high)) * 1.1;
    const yMin = Math.min(...dataset.map((d) => d.low)) * 0.9;
    return scaleLinear([yMin, yMax], [plotHeight, 0]);
  }, [dataset, plotHeight]);

  const hasMid = dataset.some((d) => d.mid !== undefined);
  const midValues = dataset.map((d) => d.mid ?? (d.low + d.high) / 2);

  return (
    <>
      <Grid scale={yScale} orient="y" length={plotWidth} />
      <Animation playbook={[...AREA_PLAYBOOK]}>
        <Path
          d={buildRangeAreaPath(dataset, cats, xScale, yScale)}
          fill={color + '30'}
          stroke={color}
          strokeWidth={1}
          opacity={1}
        />
      </Animation>
      {hasMid && (
        <Animation playbook={[...AREA_PLAYBOOK]}>
          <Path
            d={buildLinePath(midValues, cats, xScale, yScale)}
            fill="none"
            stroke={SEMANTIC_6[3]}
            strokeWidth={2}
            strokeDasharray="6 3"
            opacity={1}
          />
        </Animation>
      )}
      <Animation playbook={[...buildPointPlaybook(plotHeight)]}>
        {dataset.map((d) => {
          const cx = xScale(d.name) + xScale.bandwidth / 2;
          return (
            <Ellipse
              key={d.name}
              cx={cx}
              cy={yScale(d.mid ?? (d.low + d.high) / 2)}
              rx={isHovering(d.name) ? 7 : 5}
              ry={isHovering(d.name) ? 7 : 5}
              fill="#fff"
              stroke={color}
              strokeWidth={hoverStrokeWidth(2, isHovering(d.name))}
              opacity={1}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>
      <Axis scale={xScale} orient="bottom" length={plotWidth} crossAt={plotHeight} />
      <Axis scale={yScale} orient="left" length={plotHeight} crossAt={0} />
    </>
  );
}


export default RangeAreaChart;
