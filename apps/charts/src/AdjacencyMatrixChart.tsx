/**
 * AdjacencyMatrixChart —— 邻接矩阵图（NxN 权重色块）
 */

import { useMemo } from 'react';
import { Animation, Rect, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  scaleBand,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface MatrixHoverPayload {
  row: string;
  col: string;
  value: number;
}

interface Props extends ChartItemHoverProps<MatrixHoverPayload> {
  data?: { labels: string[]; matrix: number[][] };
}

const CELL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 12 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 400, easing: 'easeOut', targets: 'children', stagger: 20, delay: 200 },
] as const;

/** 根据权重取色 */
function matrixColor(v: number, max: number): string {
  const t = v / Math.max(max, 1);
  if (t < 0.15) return '#f6ffed';
  if (t < 0.3) return '#b7eb8f';
  if (t < 0.5) return '#73d13d';
  if (t < 0.7) return '#389e0d';
  if (t < 0.85) return '#237804';
  return '#135200';
}

/**
 * 邻接矩阵图
 */
export function AdjacencyMatrixChart(props: Props) {
  return (
    <ChartFrame>
      <AdjacencyMatrixChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function AdjacencyMatrixChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<MatrixHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.row}-${p.col}`,
  );

  const labels = data?.labels ?? ['A', 'B', 'C', 'D', 'E', 'F'];
  const matrix = data?.matrix ?? defaultMatrix(labels.length);

  const labelPad = 50;
  const gridW = plotWidth - labelPad;
  const gridH = plotHeight - labelPad;

  const xScale = useMemo(() => scaleBand(labels, [labelPad, plotWidth], 0.02), [labels, plotWidth]);
  const yScale = useMemo(() => scaleBand(labels, [0, gridH], 0.02), [labels, gridH]);

  const maxVal = useMemo(
    () => Math.max(...matrix.flat(), 1),
    [matrix],
  );

  return (
    <>
      <Animation playbook={[...CELL_PLAYBOOK]}>
        {matrix.map((row, ri) =>
          row.map((v, ci) => {
            const payload: MatrixHoverPayload = { row: labels[ri], col: labels[ci], value: v };
            const cellKey = `${labels[ri]}-${labels[ci]}`;
            return (
              <Rect
                key={`${ri}-${ci}`}
                x={xScale(labels[ci])}
                y={yScale(labels[ri])}
                width={xScale.bandwidth}
                height={yScale.bandwidth}
                fill={matrixColor(v, maxVal)}
                stroke="#fff"
                strokeWidth={hoverStrokeWidth(1, isHovering(cellKey))}
                opacity={1}
                {...bindHover(payload)}
              />
            );
          }),
        )}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {matrix.map((row, ri) =>
          row.map((v, ci) => (
            <Text
              key={`val-${ri}-${ci}`}
              x={xScale(labels[ci]) + xScale.bandwidth / 2}
              y={yScale(labels[ri]) + yScale.bandwidth / 2 + 4}
              text={v > 0 ? String(v) : ''}
              fontSize={9}
              fontFamily="sans-serif"
              fill={v / maxVal > 0.5 ? '#fff' : TEXT_COLOR}
              textAlign="middle"
              opacity={1}
            />
          )),
        )}
      </Animation>
      {labels.map((label, i) => (
        <Text
          key={`x-${label}`}
          x={xScale(label) + xScale.bandwidth / 2}
          y={plotHeight - 8}
          text={label}
          fontSize={10}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
        />
      ))}
      {labels.map((label, i) => (
        <Text
          key={`y-${label}`}
          x={labelPad - 8}
          y={yScale(label) + yScale.bandwidth / 2 + 4}
          text={label}
          fontSize={10}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="end"
        />
      ))}
    </>
  );
}

/** 生成默认邻接矩阵 */
function defaultMatrix(n: number): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) row.push(0);
      else if (Math.abs(i - j) === 1) row.push(Math.floor(Math.random() * 8) + 3);
      else if (Math.abs(i - j) === 2) row.push(Math.floor(Math.random() * 4) + 1);
      else row.push(0);
    }
    m.push(row);
  }
  return m;
}

export default AdjacencyMatrixChart;
