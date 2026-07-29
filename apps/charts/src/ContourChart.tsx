/**
 * ContourChart —— 等值线图
 */

import { Animation, Path, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';


interface Props {
  data?: number[][];
  levels?: number[];
  rows?: string[];
  cols?: string[];
}

const MS_LINES: Record<number, number[]> = {
  0: [], 1: [0, 3], 2: [1, 0], 3: [1, 3], 4: [2, 1], 5: [0, 1, 2, 3],
  6: [0, 2], 7: [2, 3], 8: [3, 2], 9: [0, 2], 10: [0, 1, 3, 2], 11: [1, 3],
  12: [3, 1], 13: [1, 0], 14: [3, 0], 15: [],
};

function edgePoints(
  side: number,
  cell: { tl: number; tr: number; br: number; bl: number; x: number; y: number; w: number; h: number },
  level: number,
): { x: number; y: number } {
  const { tl, tr, br, bl, x, y, w, h } = cell;
  const interp = (v1: number, v2: number) =>
    Math.abs(v1 - v2) < 1e-10 ? 0.5 : (level - v1) / (v2 - v1);
  switch (side) {
    case 0: { const t = interp(tl, tr); return { x: x + t * w, y }; }
    case 1: { const t = interp(tr, br); return { x: x + w, y: y + t * h }; }
    case 2: { const t = interp(bl, br); return { x: x + t * w, y: y + h }; }
    case 3: { const t = interp(tl, bl); return { x, y: y + t * h }; }
    default: return { x, y };
  }
}

/**
 * 构建等值线段路径
 */
function buildContourPath(
  level: number,
  grid: number[][],
  nr: number,
  nc: number,
  cellW: number,
  cellH: number,
): string {
  const segments: string[] = [];
  for (let ri = 0; ri < nr - 1; ri++) {
    for (let ci = 0; ci < nc - 1; ci++) {
      const tl = grid[ri][ci];
      const tr = grid[ri][ci + 1];
      const br = grid[ri + 1][ci + 1];
      const bl = grid[ri + 1][ci];
      const code =
        (tl >= level ? 1 : 0) |
        (tr >= level ? 1 : 0) << 1 |
        (br >= level ? 1 : 0) << 2 |
        (bl >= level ? 1 : 0) << 3;
      const pairs = MS_LINES[code] ?? [];
      const cell = { tl, tr, br, bl, x: ci * cellW, y: ri * cellH, w: cellW, h: cellH };
      for (let pi = 0; pi < pairs.length; pi += 2) {
        const p1 = edgePoints(pairs[pi], cell, level);
        const p2 = edgePoints(pairs[pi + 1], cell, level);
        segments.push(`M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
      }
    }
  }
  return segments.join(' ');
}

const CONTOUR_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOut', targets: 'children', stagger: 100 },
] as const;

/**
 * 等值线图
 */
export function ContourChart(props: Props) {
  return (
    <ChartFrame>
      <ContourChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function ContourChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, levels, rows, cols } = props;
  const grid: number[][] = data ?? defaultContourData();
  const nr = grid.length;
  const nc = grid[0]?.length ?? 0;
  const flat = grid.flat();
  const minV = Math.min(...flat);
  const maxV = Math.max(...flat);
  const contourLevels =
    levels ?? Array.from({ length: 6 }, (_, i) => minV + ((maxV - minV) * (i + 1)) / 7);
  const cellW = plotWidth / nc;
  const cellH = plotHeight / nr;
  const rowLabels = rows ?? Array.from({ length: nr }, (_, i) => `R${i + 1}`);
  const colLabels = cols ?? Array.from({ length: nc }, (_, i) => `C${i + 1}`);

  return (
    <>
      <Animation playbook={[...CONTOUR_PLAYBOOK]}>
        {contourLevels.map((level, li) => (
          <Path
            key={`cl-${li}`}
            d={buildContourPath(level, grid, nr, nc, cellW, cellH)}
            fill="none"
            stroke={CATEGORY_12[li % CATEGORY_12.length]}
            strokeWidth={1.5}
            opacity={1}
          />
        ))}
      </Animation>
      {colLabels.map((label, ci) => (
        <Text
          key={`x-${ci}`}
          x={ci * cellW + cellW / 2}
          y={plotHeight + 16}
          text={label}
          fontSize={10}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
        />
      ))}
      {rowLabels.map((label, ri) => (
        <Text
          key={`y-${ri}`}
          x={-8}
          y={ri * cellH + cellH / 2 + 4}
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


function defaultContourData(): number[][] {
  const rows = 15;
  const cols = 15;
  const out: number[][] = [];
  for (let ri = 0; ri < rows; ri++) {
    const row: number[] = [];
    for (let ci = 0; ci < cols; ci++) {
      const cx1 = cols * 0.3;
      const cy1 = rows * 0.4;
      const cx2 = cols * 0.7;
      const cy2 = rows * 0.6;
      const d1 = Math.sqrt((ci - cx1) ** 2 + (ri - cy1) ** 2);
      const d2 = Math.sqrt((ci - cx2) ** 2 + (ri - cy2) ** 2);
      const v =
        Math.exp(-(d1 * d1) / 20) * 1.0 +
        Math.exp(-(d2 * d2) / 15) * 0.7 +
        Math.random() * 0.05;
      row.push(+v.toFixed(3));
    }
    out.push(row);
  }
  return out;
}

export default ContourChart;
