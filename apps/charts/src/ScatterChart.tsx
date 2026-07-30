/**
 * ScatterChart —— 散点图（批量 Points 渲染）
 */

import { useMemo, useId, useCallback } from 'react';
import { Animation, Points } from 'react-viz-composer';
import type { VizEvent } from 'react-viz-composer';

import { scatterData } from './mockData';
import {
  Axis,
  Grid,
} from 'react-viz-composer';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  scaleLinear,
  SEMANTIC_6,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';

interface Point {
  x: number;
  y: number;
  group: number;
}

interface Props extends ChartItemHoverProps<Point> {
  data?: Point[];
}

const POINTS_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 800, easing: 'easeOut', targets: 'children' },
] as const;

/**
 * 散点图（批量 Points 渲染）
 */
export function ScatterChart(props: Props) {
  return (
    <ChartFrame>
      <ScatterChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function ScatterChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;

  const points: Point[] = data ?? scatterData;
  const autoId = useId();
  const pointsId = `scatter-${autoId}`;

  const xScale = scaleLinear([0, 100], [0, plotWidth]);
  const yScale = scaleLinear([0, 100], [plotHeight, 0]);

  const baseCx = useMemo(() => points.map((p) => xScale(p.x)), [points, xScale]);
  const baseCy = useMemo(() => points.map((p) => yScale(p.y)), [points, yScale]);
  const fills = useMemo(
    () => points.map((p) => SEMANTIC_6[p.group % SEMANTIC_6.length] + 'B3'),
    [points],
  );
  const strokes = useMemo(
    () => points.map((p) => SEMANTIC_6[p.group % SEMANTIC_6.length]),
    [points],
  );

  /** 将 Points 逐点命中事件转发为图表项 hover */
  const handlePointEnter = useCallback((evt: VizEvent) => {
    const idx = evt.pointIndex;
    if (idx != null && points[idx]) onItemEnter?.(points[idx], evt);
  }, [points, onItemEnter]);

  const handlePointLeave = useCallback(() => {
    onItemLeave?.();
  }, [onItemLeave]);

  return (
    <>
      <Grid scale={xScale} orient="x"  length={plotHeight} />
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[...POINTS_PLAYBOOK]}>
        <Points
          id={pointsId}
          cx={baseCx}
          cy={baseCy}
          rx={4}
          ry={4}
          fill={fills}
          stroke={strokes}
          strokeWidth={1}
          opacity={1}
          onMouseEnter={handlePointEnter}
          onMouseLeave={handlePointLeave}
        />
      </Animation>
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
    </>
  );
}


export default ScatterChart;
