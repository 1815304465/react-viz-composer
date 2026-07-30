/**
 * ComboChart —— 柱线混合图
 */

import { useMemo, useState } from 'react';
import { Animation, Rect, Path, Ellipse, Text, LinearGradient } from 'react-viz-composer';
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
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
  BandScale,
  LinearScale,
} from './local';



interface ComboItem {
  month: string;
  sales: number;
  rate: number;
}

interface Props extends ChartItemHoverProps<ComboItem> {
  data?: ComboItem[];
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

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children' },
] as const;

/**
 * 构建折线路径 d
 */
function buildRateLineD(
  dataset: ComboItem[],
  xScale: BandScale,
  rateScale: LinearScale,
  progress: number,
): string {
  const points = dataset.map((d) => ({
    x: xScale(d.month) + xScale.bandwidth / 2,
    y: rateScale(d.rate * progress),
  }));
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
}

/**
 * 柱线混合图
 */
export function ComboChart(props: Props) {
  return (
    <ChartFrame>
      <ComboChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function ComboChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: ComboItem) => d.month,
  );
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  const dataset = data ?? [
    { month: '1月', sales: 320, rate: 12 },
    { month: '2月', sales: 280, rate: -8 },
    { month: '3月', sales: 410, rate: 18 },
  ];

  const categories = useMemo(() => dataset.map((d) => d.month), [dataset]);
  const xScale = useMemo(
    () => scaleBand(categories, [0, plotWidth], 0.25),
    [categories, plotWidth],
  );
  const yScale = useMemo(() => {
    const max = Math.max(...dataset.map((d) => d.sales)) * 1.15;
    return scaleLinear([0, max], [plotHeight, 0]);
  }, [dataset, plotHeight]);
  const rateScale = useMemo(
    () => scaleLinear([-20, 30], [plotHeight, 0]),
    [plotHeight],
  );

  const finalLineD = buildRateLineD(dataset, xScale, rateScale, 1);

  return (
    <>
      <LinearGradient
        id="combo-bar-grad"
        x1={0}
        y1={1}
        x2={0}
        y2={0}
        gradientUnits="objectBoundingBox"
        stops={[
          { offset: 0, color: '#1677ff' },
          { offset: 1, color: '#69b1ff' },
        ]}
      />
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[...buildBarPlaybook(plotHeight)]}>
        {dataset.map((d) => {
          const x = xScale(d.month);
          const fullH = plotHeight - yScale(d.sales);
          return (
            <Rect
              key={`bar-${d.month}`}
              x={x}
              y={plotHeight - fullH}
              width={xScale.bandwidth}
              height={fullH}
              fill={activeMonth === d.month ? '#fa8c16' : 'url(#combo-bar-grad)'}
              stroke={activeMonth === d.month ? '#d46b08' : isHovering(d.month) ? '#0958d9' : '#1677ff'}
              strokeWidth={activeMonth === d.month ? 2 : hoverStrokeWidth(1, isHovering(d.month))}
              zIndex={activeMonth === d.month ? 2 : isHovering(d.month) ? 1 : 0}
              onClick={() => setActiveMonth(d.month)}
              {...bindHover(d)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[{
        duration: 700,
        easing: 'easeOutCubic',
        targets: 'rate-line',
        compute: ({ progress }: { progress: number }) => ({ d: buildRateLineD(dataset, xScale, rateScale, progress) }),
      }]}>
        <Path
          id="rate-line"
          d={finalLineD}
          fill="none"
          stroke={SEMANTIC_6[3]}
          strokeWidth={2}
          zIndex={3}
        />
      </Animation>
      <Animation playbook={[...buildPointPlaybook(plotHeight)]}>
        {dataset.map((d) => (
          <Ellipse
            key={`rate-${d.month}`}
            cx={xScale(d.month) + xScale.bandwidth / 2}
            cy={rateScale(d.rate)}
            rx={5}
            ry={5}
            fill="#fff"
            stroke={SEMANTIC_6[3]}
            strokeWidth={hoverStrokeWidth(2, isHovering(d.month))}
            opacity={1}
            zIndex={4}
            {...bindHover(d)}
          />
        ))}
      </Animation>
      {activeMonth && (
        <Animation playbook={[...LABEL_PLAYBOOK]}>
          <Text
            x={plotWidth - 8}
            y={16}
            text={`选中: ${activeMonth}`}
            fontSize={11}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="end"
            opacity={1}
          />
        </Animation>
      )}
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight} />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0} />
    </>
  );
}


export default ComboChart;

