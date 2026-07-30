/**
 * WaffleChart —— 华夫饼图（NxM 方块网格占比）
 */

import { useMemo } from 'react';
import { Animation, Rect, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface WaffleItem {
  name: string;
  value: number;
}

interface WaffleCell {
  name: string;
  color: string;
  row: number;
  col: number;
  index: number;
}

interface WaffleHoverPayload {
  name: string;
  value: number;
  percent: number;
}

interface Props extends ChartItemHoverProps<WaffleHoverPayload> {
  data?: WaffleItem[];
  rows?: number;
  cols?: number;
}

const CELL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 12 },
] as const;

const LEGEND_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 400, easing: 'easeOut', targets: 'children', stagger: 60, delay: 300 },
] as const;

/**
 * 华夫饼图
 */
export function WaffleChart(props: Props) {
  return (
    <ChartFrame>
      <WaffleChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function WaffleChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, rows = 10, cols = 10, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: WaffleHoverPayload) => p.name,
  );

  const dataset: WaffleItem[] = data ?? [
    { name: '已完成', value: 42 },
    { name: '进行中', value: 28 },
    { name: '待开始', value: 18 },
    { name: '已取消', value: 12 },
  ];

  const totalCells = rows * cols;
  const totalValue = dataset.reduce((s, d) => s + d.value, 0);

  const { cells, legend } = useMemo(() => {
    const grid: WaffleCell[] = [];
    let cellIdx = 0;
    const leg = dataset.map((d, i) => {
      const color = CATEGORY_12[i % CATEGORY_12.length];
      const count = Math.round((d.value / totalValue) * totalCells);
      for (let c = 0; c < count && cellIdx < totalCells; c++) {
        grid.push({
          name: d.name,
          color,
          row: Math.floor(cellIdx / cols),
          col: cellIdx % cols,
          index: cellIdx,
        });
        cellIdx += 1;
      }
      return { ...d, color, percent: (d.value / totalValue) * 100 };
    });
    while (cellIdx < totalCells) {
      const last = leg[leg.length - 1];
      grid.push({
        name: last.name,
        color: last.color,
        row: Math.floor(cellIdx / cols),
        col: cellIdx % cols,
        index: cellIdx,
      });
      cellIdx += 1;
    }
    return { cells: grid, legend: leg };
  }, [dataset, rows, cols, totalCells, totalValue]);

  const gap = 3;
  const gridW = Math.min(plotWidth * 0.55, plotHeight - 40);
  const cellSize = (gridW - gap * (cols - 1)) / cols;
  const gridH = cellSize * rows + gap * (rows - 1);
  const offsetX = (plotWidth - gridW) / 2;
  const offsetY = (plotHeight - gridH) / 2;

  return (
    <>
      <Animation playbook={[...CELL_PLAYBOOK]}>
        {cells.map((c) => {
          const item = legend.find((l) => l.name === c.name)!;
          const payload: WaffleHoverPayload = {
            name: c.name,
            value: item.value,
            percent: item.percent,
          };
          return (
            <Rect
              key={`cell-${c.index}`}
              x={offsetX + c.col * (cellSize + gap)}
              y={offsetY + c.row * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={2}
              ry={2}
              fill={c.color}
              stroke={c.color}
              strokeWidth={hoverStrokeWidth(1, isHovering(c.name))}
              opacity={1}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LEGEND_PLAYBOOK]}>
        {legend.map((l, i) => (
          <Rect
            key={`swatch-${l.name}`}
            x={plotWidth - 120}
            y={30 + i * 28}
            width={14}
            height={14}
            rx={2}
            fill={l.color}
            opacity={1}
          />
        ))}
      </Animation>
      {legend.map((l, i) => (
        <Text
          key={`leg-${l.name}`}
          x={plotWidth - 100}
          y={42 + i * 28}
          text={`${l.name}  ${l.percent.toFixed(0)}%`}
          fontSize={11}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="start"
        />
      ))}
      <Text
        x={offsetX + gridW / 2}
        y={offsetY - 12}
        text={`共 ${totalCells} 格`}
        fontSize={12}
        fontFamily="sans-serif"
        fill={TEXT_COLOR}
        textAlign="middle"
      />
    </>
  );
}

export default WaffleChart;
