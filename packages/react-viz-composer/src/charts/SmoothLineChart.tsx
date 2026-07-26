/**
 * SmoothLineChart —— 平滑曲线图
 */

import { Path, Ellipse, Text } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animValue } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleBand, scaleLinear } from './shared/scales';
import { Axis, Grid } from './shared/Axis';
import { SEMANTIC_6 } from './shared/palette';

interface Series {
  name: string;
  values: number[];
}

interface SmoothHoverPayload {
  series: string;
  category: string;
  value: number;
}

interface Props extends ChartItemHoverProps<SmoothHoverPayload> {
  data?: Series[];
  categories?: string[];
}

export function SmoothLineChart(props: Props) {
  const { data, categories, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<SmoothHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.series}-${p.category}`,
  );

  const series: Series[] = data ?? [
    { name: '访问量', values: [120, 200, 150, 80, 70, 110, 130] },
    { name: '注册量', values: [80, 130, 90, 50, 40, 70, 90] },
    { name: '订单量', values: [40, 60, 50, 30, 20, 35, 45] },
  ];
  const cats = categories ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const xScale = scaleBand(cats, [0, PLOT_WIDTH], 0.1);
  const maxV = Math.max(...series.flatMap((s) => s.values)) * 1.1;
  const yScale = scaleLinear([0, maxV], [PLOT_HEIGHT, 0]);

  function catmullRomToBezier(
    points: { x: number; y: number }[],
  ): string {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

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
        const d = catmullRomToBezier(points);
        return (
          <Path key={`smooth-${s.name}`} d={d} fill="none" stroke={color} strokeWidth={2} />
        );
      })}

      {series.map((s, idx) => {
        const color = SEMANTIC_6[idx % SEMANTIC_6.length];
        return s.values.map((v, i) => {
          const px = xScale(cats[i]) + xScale.bandwidth / 2;
          const py = yScale(animValue(v, progress));
          const payload: SmoothHoverPayload = {
            series: s.name,
            category: cats[i],
            value: v,
          };
          const pointKey = `${s.name}-${cats[i]}`;
          const hovered = isHovering(pointKey);
          return (
            <Ellipse
              key={`${s.name}-${i}`}
              cx={px}
              cy={py}
              rx={hovered ? 7 : 5}
              ry={hovered ? 7 : 5}
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

export default SmoothLineChart;
