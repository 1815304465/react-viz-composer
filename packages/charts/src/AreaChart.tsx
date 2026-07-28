/**
 * AreaChart —— 面积图
 */

import { Path, Ellipse, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps, scaleBand, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';

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

export function AreaChart(props: Props) {
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

  const xScale = scaleBand(cats, [0, PLOT_WIDTH], 0.05);
  const maxV = Math.max(...series.flatMap((s) => s.values)) * 1.1;
  const yScale = scaleLinear([0, maxV], [PLOT_HEIGHT, 0]);

  return (
    <ChartFrame>
      {(progress) => (
        <>
      <Grid scale={yScale} orient="y" />

      {series.map((s, idx) => {
        const color = SEMANTIC_6[idx % SEMANTIC_6.length];
        const points = s.values.map((v, i) => ({
          x: xScale(cats[i]) + xScale.bandwidth / 2,
          y: yScale(animValue(v, progress)),
        }));
        const areaD =
          `M ${points[0].x} ${PLOT_HEIGHT} ` +
          points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
          ` L ${points[points.length - 1].x} ${PLOT_HEIGHT} Z`;
        return (
          <Path key={`area-${s.name}`} d={areaD} fill={color + '40'} stroke="none" />
        );
      })}

      {series.map((s, idx) => {
        const color = SEMANTIC_6[idx % SEMANTIC_6.length];
        const points = s.values.map((v, i) => ({
          x: xScale(cats[i]) + xScale.bandwidth / 2,
          y: yScale(animValue(v, progress)),
        }));
        const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return (
          <Path key={`line-${s.name}`} d={lineD} fill="none" stroke={color} strokeWidth={2} />
        );
      })}

      {series.map((s, idx) => {
        const color = SEMANTIC_6[idx % SEMANTIC_6.length];
        return s.values.map((v, i) => {
          const payload: AreaHoverPayload = {
            series: s.name,
            category: cats[i],
            value: v,
          };
          const pointKey = `${s.name}-${cats[i]}`;
          const hovered = isHovering(pointKey);
          return (
            <Ellipse
              key={`${s.name}-${i}`}
              cx={xScale(cats[i]) + xScale.bandwidth / 2}
              cy={yScale(animValue(v, progress))}
              rx={hovered ? 6 : 4}
              ry={hovered ? 6 : 4}
              fill="#fff"
              stroke={color}
              strokeWidth={hoverStrokeWidth(2, hovered)}
              {...bindHover(payload)}
            />
          );
        });
      })}

      {series.map((s, idx) => {
        const color = SEMANTIC_6[idx % SEMANTIC_6.length];
        const points = s.values.map((v, i) => ({
          x: xScale(cats[i]) + xScale.bandwidth / 2,
          y: yScale(animValue(v, progress)),
        }));
        if (progress < 0.5) return null;
        return (
          <Text
            key={`label-${s.name}`}
            x={points[points.length - 1].x + 8}
            y={points[points.length - 1].y + 4}
            text={s.name}
            fontSize={11}
            fontFamily="sans-serif"
            fill={color}
          />
        );
      })}

      <Axis scale={xScale} orient="bottom" />
      <Axis scale={yScale} orient="left" />
        </>
      )}
    </ChartFrame>
  );
}

export default AreaChart;
