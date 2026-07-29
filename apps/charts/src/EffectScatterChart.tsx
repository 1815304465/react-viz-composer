/**
 * EffectScatterChart —— 涟漪散点图
 */

import { Fragment } from 'react';
import { Animation, Ellipse } from '@react-viz-composer/core';
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
  SEMANTIC_6,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface ScatterPoint {
  x: number;
  y: number;
  group: number;
}

interface Props extends ChartItemHoverProps<ScatterPoint> {
  data?: ScatterPoint[];
}

const rippleRings = [
  { scale: 2.2, opacity: 0.12 },
  { scale: 3.4, opacity: 0.07 },
  { scale: 4.6, opacity: 0.04 },
];

const RIPPLE_PLAYBOOK = [
  { attribute: 'cx', duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 25 },
  { attribute: 'cy', duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 25 },
  { attribute: 'rx', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 25 },
  { attribute: 'ry', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 25 },
] as const;

/**
 * 涟漪散点图
 */
export function EffectScatterChart(props: Props) {
  return (
    <ChartFrame>
      <EffectScatterChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function EffectScatterChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<ScatterPoint, string>(
    { onItemEnter, onItemLeave },
    (p: ScatterPoint) => `${p.x}-${p.y}-${p.group}`,
  );

  const points: ScatterPoint[] = data ?? defaultEffectScatterData();
  const xScale = scaleLinear([0, 100], [0, plotWidth]);
  const yScale = scaleLinear([0, 100], [plotHeight, 0]);
  const originX = plotWidth / 2;
  const originY = plotHeight;

  return (
    <>
      <Grid scale={xScale} orient="x"  length={plotHeight} />
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={RIPPLE_PLAYBOOK.map((step) => {
        if (step.attribute === 'cx') return { ...step, from: originX };
        if (step.attribute === 'cy') return { ...step, from: originY };
        return step;
      })}>
        {points.map((p, i) => {
          const tx = xScale(p.x);
          const ty = yScale(p.y);
          const color = SEMANTIC_6[p.group % SEMANTIC_6.length];
          const key = `${p.x}-${p.y}-${p.group}`;
          const hovered = isHovering(key);
          const coreR = hovered ? 6 : 4;
          return (
            <Fragment key={i}>
              {rippleRings.map((ring, ri) => (
                <Ellipse
                  key={`ripple-${ri}`}
                  cx={tx}
                  cy={ty}
                  rx={4 * ring.scale}
                  ry={4 * ring.scale}
                  fill={color}
                  opacity={ring.opacity}
                  stroke="none"
                  strokeWidth={0}
                />
              ))}
              <Ellipse
                cx={tx}
                cy={ty}
                rx={coreR}
                ry={coreR}
                fill={color + 'E6'}
                stroke={color}
                strokeWidth={hoverStrokeWidth(1, hovered)}
                zIndex={hovered ? 10 : 0}
                {...bindHover(p)}
              />
            </Fragment>
          );
        })}
      </Animation>
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
    </>
  );
}


function defaultEffectScatterData(): ScatterPoint[] {
  const out: ScatterPoint[] = [];
  for (let i = 0; i < 15; i++) out.push({ x: 20 + Math.random() * 15, y: 30 + Math.random() * 20, group: 0 });
  for (let i = 0; i < 15; i++) out.push({ x: 55 + Math.random() * 20, y: 60 + Math.random() * 20, group: 1 });
  for (let i = 0; i < 12; i++) out.push({ x: 35 + Math.random() * 25, y: 75 + Math.random() * 15, group: 2 });
  return out;
}

export default EffectScatterChart;
