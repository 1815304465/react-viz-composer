/**
 * EffectScatterChart —— 涟漪散点图
 *
 * 入场：点从原点扩散出现；随后涟漪圈持续循环放大淡出（sustain）。
 */

import { Fragment } from 'react';
import { Animation, Ellipse } from 'react-viz-composer';
import {
  Axis,
  Grid,
} from 'react-viz-composer';
import {
  ChartFrame,
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

const RIPPLE_RINGS = [
  { scale: 2.2, opacity: 0.18 },
  { scale: 3.4, opacity: 0.12 },
  { scale: 4.6, opacity: 0.08 },
];

/** 涟漪周期（秒） */
const RIPPLE_PERIOD = 1.6;

/**
 * 构建入场 + 持续涟漪 playbook
 * @param originX 入场起点 x
 * @param originY 入场起点 y
 * @param coreIds 核心点 id
 * @param rippleIds 涟漪圈 id
 */
function buildEffectPlaybook(
  originX: number,
  originY: number,
  coreIds: string[],
  rippleIds: string[],
) {
  return [
    {
      attribute: 'cx' as const,
      from: originX,
      duration: 700,
      easing: 'easeOutCubic' as const,
      targets: coreIds,
      stagger: 25,
      group: 0,
    },
    {
      attribute: 'cy' as const,
      from: originY,
      duration: 700,
      easing: 'easeOutCubic' as const,
      targets: coreIds,
      stagger: 25,
      group: 0,
    },
    {
      attribute: 'rx' as const,
      from: 0,
      duration: 700,
      easing: 'easeOutCubic' as const,
      targets: coreIds,
      stagger: 25,
      group: 0,
    },
    {
      attribute: 'ry' as const,
      from: 0,
      duration: 700,
      easing: 'easeOutCubic' as const,
      targets: coreIds,
      stagger: 25,
      group: 0,
    },
    {
      sustain: true,
      targets: rippleIds,
      group: 1,
      compute: ({ time, index }: { time: number; index: number }) => {
        const ring = RIPPLE_RINGS[index % RIPPLE_RINGS.length];
        const phase = (index % RIPPLE_RINGS.length) * 0.22;
        const t = ((time + phase) % RIPPLE_PERIOD) / RIPPLE_PERIOD;
        return {
          rx: 4 * ring.scale * t,
          ry: 4 * ring.scale * t,
          opacity: ring.opacity * (1 - t),
        };
      },
    },
  ];
}

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

  const coreIds = points.map((_, i) => `core-${i}`);
  const rippleIds = points.flatMap((_, i) =>
    RIPPLE_RINGS.map((_, ri) => `ripple-${i}-${ri}`),
  );

  return (
    <>
      <Grid scale={xScale} orient="x" length={plotHeight} />
      <Grid scale={yScale} orient="y" length={plotWidth} />
      <Animation playbook={buildEffectPlaybook(originX, originY, coreIds, rippleIds)}>
        {points.map((p, i) => {
          const tx = xScale(p.x);
          const ty = yScale(p.y);
          const color = SEMANTIC_6[p.group % SEMANTIC_6.length];
          const key = `${p.x}-${p.y}-${p.group}`;
          const hovered = isHovering(key);
          const coreR = hovered ? 6 : 4;
          return (
            <Fragment key={i}>
              {RIPPLE_RINGS.map((_, ri) => (
                <Ellipse
                  key={`ripple-${ri}`}
                  id={`ripple-${i}-${ri}`}
                  cx={tx}
                  cy={ty}
                  rx={0}
                  ry={0}
                  fill={color}
                  opacity={0}
                  stroke="none"
                  strokeWidth={0}
                />
              ))}
              <Ellipse
                id={`core-${i}`}
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
      <Axis scale={xScale} orient="bottom" length={plotWidth} crossAt={plotHeight} />
      <Axis scale={yScale} orient="left" length={plotHeight} crossAt={0} />
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
