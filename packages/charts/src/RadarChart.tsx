/**
 * RadarChart —— 雷达图
 */

import { Line, Ellipse, Text } from '@react-viz-composer/core';
import { ChartFrame, CHART_WIDTH, CHART_HEIGHT, animValue, useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps, SEMANTIC_6, AXIS_COLOR, TEXT_COLOR } from '@react-viz-composer/components';

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

export function RadarChart(props: Props) {
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

  const cx = CHART_WIDTH / 2;
  const cy = CHART_HEIGHT / 2 + 10;
  const radius = 110;
  const n = ind.length;
  const angleStep = (Math.PI * 2) / n;
  const startAngle = -Math.PI / 2;

  return (
    <ChartFrame>
      {(progress) => {
        /**
         * 将指标值映射到雷达图坐标
         * @param axisIdx 轴索引
         * @param value 指标值
         */
        function point(axisIdx: number, value: number) {
          const ratio = animValue(value, progress) / ind[axisIdx].max;
          const a = startAngle + axisIdx * angleStep;
          return { x: cx + radius * ratio * Math.cos(a), y: cy + radius * ratio * Math.sin(a) };
        }

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

            {sers.map((s, idx) => {
              const color = SEMANTIC_6[idx % SEMANTIC_6.length];
              const points = s.values.map((v, i) => point(i, v));
              return (
                <Line key={`poly-${s.name}`} points={points} stroke={color} strokeWidth={2} closed />
              );
            })}

            {sers.map((s, idx) => {
              const color = SEMANTIC_6[idx % SEMANTIC_6.length];
              return s.values.map((v, i) => {
                const p = point(i, v);
                const payload: RadarHoverPayload = {
                  series: s.name,
                  indicator: ind[i].name,
                  value: v,
                };
                const pointKey = `${s.name}-${ind[i].name}`;
                const hovered = isHovering(pointKey);
                return (
                  <Ellipse
                    key={`${s.name}-${i}`}
                    cx={p.x}
                    cy={p.y}
                    rx={hovered ? 6 : 4}
                    ry={hovered ? 6 : 4}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={hoverStrokeWidth(1, hovered)}
                    {...bindHover(payload)}
                  />
                );
              });
            })}

            {sers.map((s, idx) => {
              const color = SEMANTIC_6[idx % SEMANTIC_6.length];
              const p = point(0, s.values[0]);
              if (progress < 0.5) return null;
              return (
                <Text
                  key={`name-${s.name}`}
                  x={p.x - 10}
                  y={p.y - 12}
                  text={s.name}
                  fontSize={11}
                  fontFamily="sans-serif"
                  fill={color}
                  textAlign="end"
                />
              );
            })}
          </>
        );
      }}
    </ChartFrame>
  );
}

export default RadarChart;
