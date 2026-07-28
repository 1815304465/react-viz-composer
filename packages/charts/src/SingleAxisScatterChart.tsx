/**
 * SingleAxisScatterChart —— 单轴散点图
 */

import { Ellipse } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';

interface Point {
  value: number;
  size: number;
  group: number;
}

interface Props extends ChartItemHoverProps<Point> {
  data?: Point[];
}

export function SingleAxisScatterChart(props: Props) {
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: Point): string => `${p.value}-${p.size}-${p.group}`,
  );

  const points: Point[] = data ?? [
    { value: 25, size: 20, group: 0 },
    { value: 40, size: 35, group: 1 },
    { value: 55, size: 15, group: 2 },
    { value: 30, size: 50, group: 3 },
    { value: 70, size: 25, group: 4 },
    { value: 45, size: 40, group: 0 },
    { value: 60, size: 30, group: 1 },
    { value: 20, size: 45, group: 2 },
    { value: 80, size: 18, group: 3 },
    { value: 50, size: 28, group: 4 },
    { value: 35, size: 22, group: 0 },
    { value: 65, size: 38, group: 1 },
    { value: 48, size: 32, group: 2 },
    { value: 72, size: 42, group: 3 },
    { value: 58, size: 16, group: 4 },
  ];

  const xMax = Math.max(...points.map((p) => p.value)) * 1.1;
  const xScale = scaleLinear([0, xMax], [0, PLOT_WIDTH]);
  const yCenter = PLOT_HEIGHT / 2;

  const sizeDomain = Math.max(...points.map((p) => p.size));
  const sizeScale = scaleLinear([0, sizeDomain], [3, 18]);

  return (
    <ChartFrame>
      {(progress) => (
        <>
      <Grid scale={xScale} orient="x" />
      {points.map((p, i) => {
        const cx = xScale(p.value * progress);
        const baseR = animSize(sizeScale(p.size), progress);
        const color = SEMANTIC_6[p.group % SEMANTIC_6.length];
        const key = `${p.value}-${p.size}-${p.group}`;
        const hovered = isHovering(key);
        return (
          <Ellipse
            key={i}
            cx={cx}
            cy={yCenter}
            rx={hovered ? baseR + 3 : baseR}
            ry={hovered ? baseR + 3 : baseR}
            fill={color + '99'}
            stroke={color}
            strokeWidth={hoverStrokeWidth(1.5, hovered)}
            {...bindHover(p)}
          />
        );
      })}
      <Axis scale={xScale} orient="bottom" />
        </>
      )}
    </ChartFrame>
  );
}

export default SingleAxisScatterChart;
