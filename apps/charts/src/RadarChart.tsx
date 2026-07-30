/**
 * RadarChart —— 雷达图
 */

import { Animation, Line, Ellipse, Text } from 'react-viz-composer';
import {
  ChartFrame,
  CHART_WIDTH,
  CHART_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  SEMANTIC_6,
  AXIS_COLOR,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface Indicator {
  name: string;
  max: number;
}

interface RadarSeries {
  name: string;
  values: number[];
}

interface RadarHoverPayload {
  series: string;
  indicator: string;
  value: number;
}

interface Props extends ChartItemHoverProps<RadarHoverPayload> {
  indicator?: Indicator[];
  series?: RadarSeries[];
}

const LINE_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOut', targets: 'children', stagger: 120 },
] as const;

const POINT_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 30 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 120, delay: 300 },
] as const;

/**
 * 雷达图
 */
export function RadarChart(props: Props) {
  return (
    <ChartFrame>
      <RadarChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function RadarChartPlot(props: Props) {
  const { plotWidth, plotHeight, chartWidth, chartHeight } = useChartSize();

  const { indicator, series, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: RadarHoverPayload): string => `${p.series}-${p.indicator}`,
  );

  const ind = indicator ?? [
    { name: '销售', max: 100 },
    { name: '管理', max: 100 },
    { name: '技术', max: 100 },
    { name: '客服', max: 100 },
    { name: '研发', max: 100 },
  ];
  const sers = series ?? [
    { name: '预算分配', values: [80, 70, 90, 60, 85] },
    { name: '实际开销', values: [70, 65, 80, 55, 75] },
  ];

  const cx = chartWidth / 2;
  const cy = chartHeight / 2 + 10;
  const radius = 110;
  const n = ind.length;
  const angleStep = (Math.PI * 2) / n;
  const startAngle = -Math.PI / 2;

  return (
    <>
      {[0.25, 0.5, 0.75, 1].map((r, layerIdx) => {
        const points = ind.map((_, i) => {
          const a = startAngle + i * angleStep;
          return { x: cx + radius * r * Math.cos(a), y: cy + radius * r * Math.sin(a) };
        });
        return (
          <Line key={`grid-${layerIdx}`} points={points} stroke={AXIS_COLOR} strokeWidth={1} />
        );
      })}
      {ind.map((_, i) => {
        const a = startAngle + i * angleStep;
        return (
          <Line
            key={`axis-${i}`}
            points={[
              { x: cx, y: cy },
              { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) },
            ]}
            stroke={AXIS_COLOR}
            strokeWidth={1}
          />
        );
      })}
      {ind.map((ax, i) => {
        const a = startAngle + i * angleStep;
        const lx = cx + (radius + 18) * Math.cos(a);
        const ly = cy + (radius + 18) * Math.sin(a);
        return (
          <Text
            key={`label-${i}`}
            x={lx}
            y={ly}
            text={ax.name}
            fontSize={12}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="middle"
            textBaseline="middle"
          />
        );
      })}
      <Animation playbook={[...LINE_PLAYBOOK]}>
        {sers.map((s, idx) => {
          const points = s.values.map((v, i) => {
            const ratio = v / ind[i].max;
            const a = startAngle + i * angleStep;
            return { x: cx + radius * ratio * Math.cos(a), y: cy + radius * ratio * Math.sin(a) };
          });
          return (
            <Line
              key={`poly-${s.name}`}
              points={points}
              stroke={SEMANTIC_6[idx % SEMANTIC_6.length]}
              strokeWidth={2}
              closed
              opacity={1}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...POINT_PLAYBOOK]}>
        {sers.flatMap((s, idx) => {
          const color = SEMANTIC_6[idx % SEMANTIC_6.length];
          return s.values.map((v, i) => {
            const payload: RadarHoverPayload = {
              series: s.name,
              indicator: ind[i].name,
              value: v,
            };
            const pointKey = `${s.name}-${ind[i].name}`;
            const ratio = v / ind[i].max;
            const a = startAngle + i * angleStep;
            return (
              <Ellipse
                key={`${s.name}-${i}`}
                cx={cx + radius * ratio * Math.cos(a)}
                cy={cy + radius * ratio * Math.sin(a)}
                rx={isHovering(pointKey) ? 6 : 4}
                ry={isHovering(pointKey) ? 6 : 4}
                fill={color}
                stroke="#fff"
                strokeWidth={hoverStrokeWidth(1, isHovering(pointKey))}
                opacity={1}
                {...bindHover(payload)}
              />
            );
          });
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {sers.map((s, idx) => {
          const ratio = s.values[0] / ind[0].max;
          const a = startAngle;
          return (
            <Text
              key={`name-${s.name}`}
              x={cx + radius * ratio * Math.cos(a) - 10}
              y={cy + radius * ratio * Math.sin(a) - 12}
              text={s.name}
              fontSize={11}
              fontFamily="sans-serif"
              fill={SEMANTIC_6[idx % SEMANTIC_6.length]}
              textAlign="end"
              opacity={1}
            />
          );
        })}
      </Animation>
    </>
  );
}


export default RadarChart;
