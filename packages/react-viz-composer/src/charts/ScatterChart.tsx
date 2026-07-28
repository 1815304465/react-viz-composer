/**
 * ScatterChart —— 散点图
 */

import { Ellipse } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animSize } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleLinear } from './shared/scales';
import { Axis, Grid } from './shared/Axis';
import { SEMANTIC_6 } from './shared/palette';

interface Point {
  x: number;
  y: number;
  group: number;
}

interface Props extends ChartItemHoverProps<Point> {
  data?: Point[];
}

export function ScatterChart(props: Props) {
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: Point) => `${p.x}-${p.y}-${p.group}`,
  );

  const points: Point[] = data ?? defaultScatterData();

  const xScale = scaleLinear([0, 100], [0, PLOT_WIDTH]);
  const yScale = scaleLinear([0, 100], [PLOT_HEIGHT, 0]);
  const originX = PLOT_WIDTH / 2;
  const originY = PLOT_HEIGHT;

  return (
    <ChartFrame>
      {(progress) => (
        <>
      <Grid scale={xScale} orient="x" />
      <Grid scale={yScale} orient="y" />
      {points.map((p, i) => {
        const tx = xScale(p.x);
        const ty = yScale(p.y);
        const cx = originX + (tx - originX) * progress;
        const cy = originY + (ty - originY) * progress;
        const baseR = animSize(4, progress);
        const hovered = isHovering(`${p.x}-${p.y}-${p.group}`);
        return (
          <Ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={hovered ? baseR + 2 : baseR}
            ry={hovered ? baseR + 2 : baseR}
            fill={SEMANTIC_6[p.group % SEMANTIC_6.length] + 'B3'}
            stroke={SEMANTIC_6[p.group % SEMANTIC_6.length]}
            strokeWidth={hoverStrokeWidth(1, hovered)}
            {...bindHover(p)}
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

function defaultScatterData(): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < 18; i++) out.push({ x: 30 + Math.random() * 20, y: 30 + Math.random() * 20, group: 0 });
  for (let i = 0; i < 18; i++) out.push({ x: 60 + Math.random() * 20, y: 60 + Math.random() * 20, group: 1 });
  for (let i = 0; i < 14; i++) out.push({ x: 40 + Math.random() * 30, y: 70 + Math.random() * 20, group: 2 });
  return out;
}

export default ScatterChart;
