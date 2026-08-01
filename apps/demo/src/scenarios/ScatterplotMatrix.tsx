/**
 * ScatterplotMatrix —— Interactive Scatterplot Matrix (SPLOM)
 *
 * A 5x5 multi-dimension scatter plot grid with linked brushing.
 * Demonstrates the Brush component + event system + linked views / cross-filtering.
 *
 * Key features:
 * - 500+ data points across 5 dimensions with deterministic pseudo-random generation
 * - 5x5 grid: diagonal = labels, upper-triangle = scatter plots, lower-triangle = corr coefficients
 * - Brush selection across all cells: selecting in one cell highlights in all others
 * - Hover tooltip showing raw values on point hover
 * - All visual elements use react-viz-composer primitives only
 */

import { useState, useMemo, useCallback, useRef, type FC } from 'react';
import {
  ReactVizComposer,
  Rect,
  Ellipse,
  Line,
  Text,
  Points,
  Group,
  Brush,
} from 'react-viz-composer';
import type { VizEvent } from 'react-viz-composer';

/* ==================== Types ==================== */

interface DataPoint {
  gdp: number;           // GDP per capita (thousands USD)
  population: number;    // Population (millions)
  lifeExp: number;       // Life expectancy (years)
  education: number;     // Education index (0-1)
  co2: number;           // CO2 emissions per capita (tonnes)
}

interface DimensionDef {
  key: keyof DataPoint;
  label: string;
  unit: string;
  format: (v: number) => string;
}

interface BrushRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/* ==================== Dimension Definitions ==================== */

const DIMENSIONS: DimensionDef[] = [
  { key: 'gdp',        label: 'GDP per Capita',     unit: 'k USD',  format: (v: number) => `$${v.toFixed(1)}k` },
  { key: 'population', label: 'Population',         unit: 'M',      format: (v: number) => `${v.toFixed(1)}M` },
  { key: 'lifeExp',    label: 'Life Expectancy',    unit: 'years',  format: (v: number) => `${v.toFixed(1)}` },
  { key: 'education',  label: 'Education Index',    unit: '',       format: (v: number) => v.toFixed(3) },
  { key: 'co2',        label: 'CO₂ Emissions',      unit: 'tonnes', format: (v: number) => `${v.toFixed(1)}t` },
];

const N = DIMENSIONS.length;

/* ==================== Layout Constants ==================== */

const DEFAULT_W = 700;
const DEFAULT_H = 620;
const PAD_LEFT = 50;
const PAD_TOP = 36;
const PAD_RIGHT = 12;
const PAD_BOTTOM = 18;
const GAP = 3;

/** 画布布局尺寸 */
interface SplomLayout {
  cellW: number;
  cellH: number;
  plotW: number;
  plotH: number;
}

/**
 * 按画布尺寸计算矩阵单元格
 */
function computeLayout(width: number, height: number): SplomLayout {
  const gridW = width - PAD_LEFT - PAD_RIGHT;
  const gridH = height - PAD_TOP - PAD_BOTTOM;
  const cellW = gridW / N;
  const cellH = gridH / N;
  return {
    cellW,
    cellH,
    plotW: cellW - GAP,
    plotH: cellH - GAP,
  };
}

/* ==================== Data Generation (Deterministic Seed) ==================== */

/** Simple mulberry32 PRNG for deterministic data */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function gaussianBoxMuller(rng: () => number, mean: number, stddev: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

function generateData(count: number): DataPoint[] {
  const rng = mulberry32(42);
  const data: DataPoint[] = [];

  // Generate base vectors with correlations
  const gdpBase: number[] = [];
  const popBase: number[] = [];
  for (let i = 0; i < count; i++) {
    gdpBase.push(gaussianBoxMuller(rng, 0, 1));
    popBase.push(gaussianBoxMuller(rng, 0, 1));
  }

  for (let i = 0; i < count; i++) {
    const g = gdpBase[i];
    const p = popBase[i];

    // GDP: center around 25k USD, ranging 2-65k
    const gdp = Math.max(1, Math.min(68, gaussianBoxMuller(rng, 25, 12)));

    // Population: correlated with GDP (negative correlation, wealthier = smaller)
    const pop = Math.max(0.5, Math.min(1500, gaussianBoxMuller(rng, 45, 60) + p * 2));

    // Life expectancy: positively correlated with GDP
    const lifeExp = Math.max(48, Math.min(85, gaussianBoxMuller(rng, 70, 7) + g * 0.5));

    // Education index: positively correlated with GDP and lifeExp
    const education = Math.max(0.2, Math.min(0.98, gaussianBoxMuller(rng, 0.65, 0.18) + g * 0.03));

    // CO2: positively correlated with GDP, slightly with population
    const co2 = Math.max(0.1, Math.min(28, gaussianBoxMuller(rng, 5.5, 4.5) + g * 0.4 + p * 0.02));

    data.push({
      gdp: +gdp.toFixed(2),
      population: +pop.toFixed(1),
      lifeExp: +lifeExp.toFixed(1),
      education: +education.toFixed(3),
      co2: +co2.toFixed(1),
    });
  }

  return data;
}

/* ==================== Color Palette ==================== */

const SELECTED_COLOR = '#1677ff';
const UNSELECTED_COLOR = '#d9d9d9';
const SELECTED_OPACITY = 0.75;
const UNSELECTED_OPACITY = 0.3;
const GRID_LINE_COLOR = '#f0f0f0';
const BG_COLOR = '#fafbfc';
const HEADER_BG = '#001529';
const DIAG_TEXT_COLOR = '#262626';
const CORR_TEXT_COLOR = '#8c8c8c';
const LABEL_COLOR = '#595959';
const BRUSH_FILL = '#1677ff';
const TOOLTIP_BG = 'rgba(0, 0, 0, 0.8)';

/* ==================== Helpers ==================== */

function scaleLinear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = (r1 - r0) / (d1 - d0 || 1);
  return (v: number) => r0 + (v - d0) * k;
}

function scaleInvert(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = (d1 - d0) / (r1 - r0 || 1);
  return (v: number) => d0 + (v - r0) * k;
}

/**
 * 单元格左上角 x
 */
function getCellX(col: number, cellW: number): number {
  return PAD_LEFT + col * cellW;
}

/**
 * 单元格左上角 y
 */
function getCellY(row: number, cellH: number): number {
  return PAD_TOP + row * cellH;
}

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxy += xs[i] * ys[i];
    sx2 += xs[i] * xs[i];
    sy2 += ys[i] * ys[i];
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy)) || 1;
  return num / den;
}

/* ==================== Sub-components ==================== */

interface ScatterCellProps {
  data: DataPoint[];
  dimX: DimensionDef;
  dimY: DimensionDef;
  cellX: number;
  cellY: number;
  cellW: number;
  cellH: number;
  xScale: (v: number) => number;
  yScale: (v: number) => number;
  xScaleInv: (v: number) => number;
  yScaleInv: (v: number) => number;
  selectedIndices: Set<number>;
  brushRect: BrushRect | null;
  cellId: string;
  onBrushChange: (rect: BrushRect | null) => void;
  onPointHover: (pointIndex: number | null) => void;
  onPointLeave: () => void;
}

const ScatterCell: FC<ScatterCellProps> = ({
  data, dimX, dimY, cellX, cellY, cellW, cellH,
  xScale, yScale, xScaleInv, yScaleInv,
  selectedIndices, brushRect, cellId,
  onBrushChange, onPointHover, onPointLeave,
}) => {
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((evt: VizEvent) => {
    dragRef.current = { x: evt.offsetX, y: evt.offsetY };
  }, []);

  const handleMouseMove = useCallback((evt: VizEvent) => {
    const anchor = dragRef.current;
    if (!anchor) return;

    const x1 = Math.min(anchor.x, evt.offsetX);
    const y1 = Math.min(anchor.y, evt.offsetY);
    const x2 = Math.max(anchor.x, evt.offsetX);
    const y2 = Math.max(anchor.y, evt.offsetY);

    // Clamp to cell bounds
    const cx = Math.max(cellX, x1);
    const cy = Math.max(cellY, y1);
    const cw = Math.min(cellX + cellW, x2) - cx;
    const ch = Math.min(cellY + cellH, y2) - cy;

    if (cw > 2 && ch > 2) {
      onBrushChange({ x: cx, y: cy, width: cw, height: ch });
    } else {
      onBrushChange(null);
    }
  }, [cellX, cellY, cellW, cellH, onBrushChange]);

  const handleMouseUp = useCallback((evt: VizEvent) => {
    const anchor = dragRef.current;
    if (anchor) {
      const x1 = Math.min(anchor.x, evt.offsetX);
      const y1 = Math.min(anchor.y, evt.offsetY);
      const x2 = Math.max(anchor.x, evt.offsetX);
      const y2 = Math.max(anchor.y, evt.offsetY);
      const cx = Math.max(cellX, x1);
      const cy = Math.max(cellY, y1);
      const cw = Math.min(cellX + cellW, x2) - cx;
      const ch = Math.min(cellY + cellH, y2) - cy;

      if (cw > 4 && ch > 4) {
        onBrushChange({ x: cx, y: cy, width: cw, height: ch });
      } else {
        onBrushChange(null);
      }
    }
    dragRef.current = null;
  }, [cellX, cellY, cellW, cellH, onBrushChange]);

  // Compute tick values
  const ticks = useMemo(() => {
    const valuesX = data.map((d) => d[dimX.key] as number);
    const valuesY = data.map((d) => d[dimY.key] as number);
    const xMin = Math.min(...valuesX);
    const xMax = Math.max(...valuesX);
    const yMin = Math.min(...valuesY);
    const yMax = Math.max(...valuesY);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    const niceStep = (range: number) => {
      const rough = range / 4;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
      const residual = rough / magnitude;
      let step: number;
      if (residual < 1.5) step = magnitude;
      else if (residual < 3) step = 2 * magnitude;
      else if (residual < 7) step = 5 * magnitude;
      else step = 10 * magnitude;
      return step;
    };

    const xStep = niceStep(xRange);
    const yStep = niceStep(yRange);

    const xTicks: number[] = [];
    for (let v = Math.ceil(xMin / xStep) * xStep; v <= xMax; v += xStep) {
      xTicks.push(v);
    }
    const yTicks: number[] = [];
    for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
      yTicks.push(v);
    }

    return { xTicks, yTicks };
  }, [data, dimX, dimY]);

  // Split points into selected / unselected layers
  const { selCX, selCY, selFill, unselCX, unselCY, unselFill } = useMemo(() => {
    const scx: number[] = [];
    const scy: number[] = [];
    const sf: string[] = [];
    const ucx: number[] = [];
    const ucy: number[] = [];
    const uf: string[] = [];

    data.forEach((d, i) => {
      const px = xScale(d[dimX.key] as number);
      const py = yScale(d[dimY.key] as number);
      if (selectedIndices.has(i)) {
        scx.push(px);
        scy.push(py);
        sf.push(SELECTED_COLOR);
      } else {
        ucx.push(px);
        ucy.push(py);
        uf.push(UNSELECTED_COLOR);
      }
    });

    return {
      selCX: scx, selCY: scy, selFill: sf,
      unselCX: ucx, unselCY: ucy, unselFill: uf,
    };
  }, [data, dimX, dimY, xScale, yScale, selectedIndices]);

  return (
    <Group>
      {/* Cell background */}
      <Rect
        x={cellX}
        y={cellY}
        width={cellW}
        height={cellH}
        fill={BG_COLOR}
        stroke={GRID_LINE_COLOR}
        strokeWidth={1}
      />

      {/* Gridlines */}
      {ticks.yTicks.map((v, i) => {
        const y = yScale(v);
        return (
          <Line
            key={`gx-${i}`}
            points={[{ x: cellX, y }, { x: cellX + cellW, y }]}
            stroke={GRID_LINE_COLOR}
            strokeWidth={0.5}
            opacity={0.6}
          />
        );
      })}
      {ticks.xTicks.map((v, i) => {
        const x = xScale(v);
        return (
          <Line
            key={`gy-${i}`}
            points={[{ x, y: cellY }, { x, y: cellY + cellH }]}
            stroke={GRID_LINE_COLOR}
            strokeWidth={0.5}
            opacity={0.6}
          />
        );
      })}

      {/* Y-axis tick labels */}
      {ticks.yTicks.map((v, i) => {
        const y = yScale(v);
        return (
          <Text
            key={`yt-${i}`}
            x={cellX - 4}
            y={y}
            text={dimY.format(v)}
            fontSize={7}
            fill={LABEL_COLOR}
            textAlign="end"
            textBaseline="middle"
          />
        );
      })}

      {/* X-axis tick labels */}
      {ticks.xTicks.map((v, i) => {
        const x = xScale(v);
        return (
          <Text
            key={`xt-${i}`}
            x={x}
            y={cellY + cellH + 9}
            text={dimX.format(v)}
            fontSize={7}
            fill={LABEL_COLOR}
            textAlign="middle"
            textBaseline="top"
          />
        );
      })}

      {/* Unselected points (rendered first, so selected are on top) */}
      {unselCX.length > 0 && (
        <Points
          id={`${cellId}-unsel`}
          cx={unselCX}
          cy={unselCY}
          rx={2.5}
          ry={2.5}
          fill={unselFill}
          opacity={UNSELECTED_OPACITY}
        />
      )}

      {/* Selected points */}
      {selCX.length > 0 && (
        <Points
          id={`${cellId}-sel`}
          cx={selCX}
          cy={selCY}
          rx={3.2}
          ry={3.2}
          fill={selFill}
          opacity={SELECTED_OPACITY}
          onMouseMove={(evt: VizEvent) => {
            if (evt.pointIndex != null) {
              // Find the actual index in the data
              // The pointIndex is relative to the Points element, so we need
              // to map back. Since selected points preserve their original order:
              // we compute which data indices are selected.
              const selIndices: number[] = [];
              data.forEach((_, i) => { if (selectedIndices.has(i)) selIndices.push(i); });
              const dataIdx = selIndices[evt.pointIndex];
              if (dataIdx != null) onPointHover(dataIdx);
            }
          }}
          onMouseLeave={onPointLeave}
        />
      )}

      {/* Brush visualization (no events, just visual) */}
      {brushRect && (
        <Brush
          x={brushRect.x}
          y={brushRect.y}
          width={brushRect.width}
          height={brushRect.height}
          fill={BRUSH_FILL}
          fillOpacity={0.12}
          stroke={BRUSH_FILL}
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      )}

      {/* Invisible overlay for brush dragging — placed with zIndex=-1 so
          Points (zIndex=0) are tested first by canvas hit test (reverse order).
          The overlay catches clicks on empty cell space. */}
      <Rect
        x={cellX}
        y={cellY}
        width={cellW}
        height={cellH}
        fill="transparent"
        zIndex={-1}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </Group>
  );
};

interface DiagonalCellProps {
  dim: DimensionDef;
  cellX: number;
  cellY: number;
  cellW: number;
  cellH: number;
}

const DiagonalCell: FC<DiagonalCellProps> = ({ dim, cellX, cellY, cellW, cellH }) => {
  const cx = cellX + cellW / 2;
  const cy = cellY + cellH / 2;
  return (
    <Group>
      <Rect x={cellX} y={cellY} width={cellW} height={cellH} fill={BG_COLOR} stroke={GRID_LINE_COLOR} strokeWidth={1} />
      <Text
        x={cx}
        y={cy - 4}
        text={dim.label}
        fontSize={9}
        fontWeight="bold"
        fill={DIAG_TEXT_COLOR}
        textAlign="middle"
        textBaseline="bottom"
      />
      {dim.unit && (
        <Text
          x={cx}
          y={cy + 8}
          text={`(${dim.unit})`}
          fontSize={7}
          fill={CORR_TEXT_COLOR}
          textAlign="middle"
          textBaseline="top"
        />
      )}
    </Group>
  );
};

interface CorrCellProps {
  corr: number;
  cellX: number;
  cellY: number;
  cellW: number;
  cellH: number;
}

const CorrCell: FC<CorrCellProps> = ({ corr, cellX, cellY, cellW, cellH }) => {
  const cx = cellX + cellW / 2;
  const cy = cellY + cellH / 2;
  const absCorr = Math.abs(corr);
  const color = corr >= 0
    ? `rgba(22, 119, 255, ${0.15 + absCorr * 0.45})`
    : `rgba(255, 77, 79, ${0.15 + absCorr * 0.45})`;
  return (
    <Group>
      <Rect x={cellX} y={cellY} width={cellW} height={cellH} fill={BG_COLOR} stroke={GRID_LINE_COLOR} strokeWidth={1} />
      <Rect x={cellX + 8} y={cellY + cellH * 0.35} width={cellW - 16} height={cellH * 0.28} rx={4} fill={color} />
      <Text
        x={cx}
        y={cy - 2}
        text={corr.toFixed(3)}
        fontSize={12}
        fontWeight="bold"
        fill={DIAG_TEXT_COLOR}
        textAlign="middle"
        textBaseline="bottom"
      />
      <Text
        x={cx}
        y={cy + 12}
        text={absCorr > 0.7 ? 'Strong' : absCorr > 0.4 ? 'Moderate' : 'Weak'}
        fontSize={7}
        fill={CORR_TEXT_COLOR}
        textAlign="middle"
        textBaseline="top"
      />
    </Group>
  );
};

/* ==================== Main Component ==================== */

interface Props {
  width?: number;
  height?: number;
}

/**
 * Interactive Scatterplot Matrix (SPLOM) with linked brushing.
 *
 * Demonstrates:
 * - Multi-dimension scatter plots with the Points primitive
 * - Brush component for rectangular selection
 * - Linked views / cross-filtering across all cells
 * - Hover tooltip with raw data values
 *
 * @param props.width  Canvas width (default 700)
 * @param props.height Canvas height (default 620)
 */
export function ScatterplotMatrix({ width = DEFAULT_W, height = DEFAULT_H }: Props) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [brushRects, setBrushRects] = useState<Map<string, BrushRect | null>>(new Map());
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Generate deterministic data
  const allData = useMemo(() => generateData(520), []);

  const layout = useMemo(() => computeLayout(width, height), [width, height]);
  const { cellW, cellH, plotW, plotH } = layout;

  /** 各维度数据域（不含像素 range，像素在单元格内再算） */
  const domains = useMemo(() => {
    const result: Record<string, [number, number]> = {};
    for (const dim of DIMENSIONS) {
      const values = allData.map((d) => d[dim.key] as number);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.05 || 1;
      result[dim.key] = [min - padding, max + padding];
    }
    return result;
  }, [allData]);

  /**
   * 为指定单元格构建 x/y 比例尺
   */
  const getCellScales = useCallback((row: number, col: number) => {
    const cellX = getCellX(col, cellW);
    const cellY = getCellY(row, cellH);
    const dimX = DIMENSIONS[col];
    const dimY = DIMENSIONS[row];
    const xDomain = domains[dimX.key];
    const yDomain = domains[dimY.key];
    const xRange: [number, number] = [cellX, cellX + plotW];
    const yRange: [number, number] = [cellY, cellY + plotH];
    return {
      cellX,
      cellY,
      xScale: scaleLinear(xDomain, xRange),
      yScale: scaleLinear(yDomain, yRange),
      xScaleInv: scaleInvert(xDomain, xRange),
      yScaleInv: scaleInvert(yDomain, yRange),
    };
  }, [cellW, cellH, plotW, plotH, domains]);

  // Compute correlation matrix
  const correlations = useMemo(() => {
    const result: number[][] = [];
    for (let ri = 0; ri < N; ri++) {
      result.push([]);
      for (let ci = 0; ci < N; ci++) {
        const xs = allData.map((d) => d[DIMENSIONS[ci].key] as number);
        const ys = allData.map((d) => d[DIMENSIONS[ri].key] as number);
        result[ri][ci] = pearsonR(xs, ys);
      }
    }
    return result;
  }, [allData]);

  // Handle brush change from a child scatter cell
  const handleBrushChange = useCallback((cellKey: string, rect: BrushRect | null) => {
    setBrushRects((prev) => {
      const next = new Map(prev);
      next.set(cellKey, rect);
      return next;
    });

    if (rect) {
      const [rowStr, colStr] = cellKey.split('-');
      const row = parseInt(rowStr, 10);
      const col = parseInt(colStr, 10);
      const dimX = DIMENSIONS[col];
      const dimY = DIMENSIONS[row];
      const { xScaleInv, yScaleInv } = getCellScales(row, col);

      const xMin = xScaleInv(rect.x);
      const xMax = xScaleInv(rect.x + rect.width);
      const yTop = yScaleInv(rect.y);
      const yBot = yScaleInv(rect.y + rect.height);
      const yMinData = Math.min(yTop, yBot);
      const yMaxData = Math.max(yTop, yBot);

      const newSelected = new Set<number>();
      allData.forEach((d, i) => {
        const dx = d[dimX.key] as number;
        const dy = d[dimY.key] as number;
        if (dx >= Math.min(xMin, xMax) && dx <= Math.max(xMin, xMax) &&
            dy >= yMinData && dy <= yMaxData) {
          newSelected.add(i);
        }
      });
      setSelectedIndices(newSelected);
    }
  }, [getCellScales, allData]);

  // Handle point hover from scatter cells
  const handlePointHover = useCallback((index: number | null, evt?: VizEvent) => {
    setHoveredPoint(index);
    if (index != null && evt) {
      setTooltipPos({ x: evt.offsetX, y: evt.offsetY });
    } else {
      setTooltipPos(null);
    }
  }, []);

  const handlePointLeave = useCallback(() => {
    setHoveredPoint(null);
    setTooltipPos(null);
  }, []);

  // Hovered data point
  const hoveredData = hoveredPoint != null ? allData[hoveredPoint] : null;

  return (
    <ReactVizComposer engine="canvas" width={width} height={height}>
      {/* Background */}
      <Rect x={0} y={0} width={width} height={height} fill="#ffffff" />

      {/* Header */}
      <Rect x={0} y={0} width={width} height={28} fill={HEADER_BG} />
      <Text x={16} y={18} text="Scatterplot Matrix (SPLOM)" fontSize={11} fontWeight="bold" fill="#fff" textBaseline="middle" />
      <Text x={width / 2} y={18} text={`${allData.length} points · 5 dimensions · linked brushing`} fontSize={9} fill="rgba(255,255,255,0.45)" textAlign="middle" textBaseline="middle" />

      {/* Selected count badge */}
      {selectedIndices.size > 0 && (
        <Group>
          <Rect x={width - 120} y={4} width={110} height={20} rx={10} fill="rgba(255,255,255,0.15)" />
          <Text x={width - 65} y={14} text={`${selectedIndices.size} selected`} fontSize={9} fill="#fff" textAlign="middle" textBaseline="middle" />
        </Group>
      )}

      {/* 5x5 Grid */}
      {Array.from({ length: N }, (_, row) =>
        Array.from({ length: N }, (_, col) => {
          const cellX = getCellX(col, cellW);
          const cellY = getCellY(row, cellH);
          const cellKey = `${row}-${col}`;

          // Diagonal: dimension name
          if (row === col) {
            return (
              <DiagonalCell
                key={cellKey}
                dim={DIMENSIONS[row]}
                cellX={cellX}
                cellY={cellY}
                cellW={cellW}
                cellH={cellH}
              />
            );
          }

          // Lower-triangle: correlation coefficients
          if (row > col) {
            return (
              <CorrCell
                key={cellKey}
                corr={correlations[row][col]}
                cellX={cellX}
                cellY={cellY}
                cellW={cellW}
                cellH={cellH}
              />
            );
          }

          // Upper-triangle: scatter plots
          const dimX = DIMENSIONS[col];
          const dimY = DIMENSIONS[row];
          const scales = getCellScales(row, col);

          return (
            <ScatterCell
              key={cellKey}
              data={allData}
              dimX={dimX}
              dimY={dimY}
              cellX={cellX}
              cellY={cellY}
              cellW={cellW}
              cellH={cellH}
              xScale={scales.xScale}
              yScale={scales.yScale}
              xScaleInv={scales.xScaleInv}
              yScaleInv={scales.yScaleInv}
              selectedIndices={selectedIndices}
              brushRect={brushRects.get(cellKey) ?? null}
              cellId={cellKey}
              onBrushChange={(rect) => handleBrushChange(cellKey, rect)}
              onPointHover={(idx) => handlePointHover(idx)}
              onPointLeave={handlePointLeave}
            />
          );
        })
      )}

      {/* Column headers (dimension names above grid) */}
      {DIMENSIONS.map((dim, col) => (
        <Text
          key={`ch-${col}`}
          x={getCellX(col, cellW) + cellW / 2}
          y={27}
          text={dim.label}
          fontSize={8}
          fontWeight="bold"
          fill={LABEL_COLOR}
          textAlign="middle"
          textBaseline="bottom"
        />
      ))}

      {/* Row headers (dimension names left of grid) */}
      {DIMENSIONS.map((dim, row) => (
        <Text
          key={`rh-${row}`}
          x={PAD_LEFT - 6}
          y={getCellY(row, cellH) + cellH / 2}
          text={dim.label}
          fontSize={8}
          fontWeight="bold"
          fill={LABEL_COLOR}
          textAlign="end"
          textBaseline="middle"
          transform={{ rotation: -90, x: PAD_LEFT - 6, y: getCellY(row, cellH) + cellH / 2 }}
        />
      ))}

      {/* Hover Tooltip */}
      {hoveredData && tooltipPos && (
        <Group>
          <Rect
            x={Math.min(tooltipPos.x + 12, width - 170)}
            y={Math.max(tooltipPos.y - 55, 32)}
            width={155}
            height={78}
            rx={4}
            fill={TOOLTIP_BG}
            opacity={0.92}
          />
          {DIMENSIONS.map((dim, i) => (
            <Text
              key={`tt-${i}`}
              x={Math.min(tooltipPos.x + 18, width - 164)}
              y={Math.max(tooltipPos.y - 47, 40) + i * 14}
              text={`${dim.label}: ${dim.format(hoveredData[dim.key] as number)}`}
              fontSize={9}
              fill="#fff"
              textBaseline="middle"
            />
          ))}
        </Group>
      )}

      {/* Legend */}
      <Group>
        <Rect x={width - 155} y={height - 22} width={140} height={16} rx={4} fill="rgba(255,255,255,0.85)" />
        <Ellipse cx={width - 142} cy={height - 14} rx={4} ry={4} fill={SELECTED_COLOR} opacity={SELECTED_OPACITY} />
        <Text x={width - 135} y={height - 14} text="Selected" fontSize={8} fill={DIAG_TEXT_COLOR} textBaseline="middle" />
        <Ellipse cx={width - 72} cy={height - 14} rx={4} ry={4} fill={UNSELECTED_COLOR} opacity={UNSELECTED_OPACITY} />
        <Text x={width - 65} y={height - 14} text="Unselected" fontSize={8} fill={CORR_TEXT_COLOR} textBaseline="middle" />
      </Group>
    </ReactVizComposer>
  );
}

export default ScatterplotMatrix;
