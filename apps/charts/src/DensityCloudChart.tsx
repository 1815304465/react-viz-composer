/**
 * DensityCloudChart —— 云图 / 核密度估计图
 */

import { useMemo } from 'react';
import { Animation, Rect, Ellipse } from '@react-viz-composer/core';
import {
  Axis,
  Grid,
} from '@react-viz-composer/kit';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  scaleLinear,
  useChartSize,
} from './local';


interface Point {
  x: number;
  y: number;
}

interface Props {
  data?: Point[];
  bandwidth?: number;
  gridSize?: number;
}

function cloudColor(v: number): string {
  const t = Math.max(0, Math.min(1, v));
  if (t < 0.25) {
    const s = t / 0.25;
    return `rgb(${Math.round(30 + s * 70)},${Math.round(100 + s * 155)},${Math.round(200)})`;
  }
  if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return `rgb(${Math.round(100)},${Math.round(255 - s * 55)},${Math.round(200 - s * 200)})`;
  }
  if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return `rgb(${Math.round(100 + s * 155)},${Math.round(200 - s * 100)},${Math.round(0)})`;
  }
  const s = (t - 0.75) / 0.25;
  return `rgb(${Math.round(255)},${Math.round(100 - s * 100)},${Math.round(s * 100)})`;
}

const GRID_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 600, easing: 'easeOut', targets: 'children', stagger: 2 },
] as const;

/**
 * 云图 / 核密度估计图
 */
export function DensityCloudChart(props: Props) {
  return (
    <ChartFrame>
      <DensityCloudChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function DensityCloudChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, bandwidth, gridSize = 40 } = props;
  const points: Point[] = data ?? defaultDensityData();
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const padX = (maxX - minX) * 0.1 || 1;
  const padY = (maxY - minY) * 0.1 || 1;
  const xDomain: [number, number] = [minX - padX, maxX + padX];
  const yDomain: [number, number] = [minY - padY, maxY + padY];
  const xScale = scaleLinear(xDomain, [0, plotWidth]);
  const yScale = scaleLinear(yDomain, [plotHeight, 0]);
  const bw = bandwidth ?? ((maxX - minX) / 20 || 1);
  const cellW = plotWidth / gridSize;
  const cellH = plotHeight / gridSize;

  const { cells, densityScale } = useMemo(() => {
    const result: number[][] = [];
    let maxDensity = 0;
    for (let ri = 0; ri < gridSize; ri++) {
      const row: number[] = [];
      const cy = yDomain[1] - (ri + 0.5) * (yDomain[1] - yDomain[0]) / gridSize;
      for (let ci = 0; ci < gridSize; ci++) {
        const cx = xDomain[0] + (ci + 0.5) * (xDomain[1] - xDomain[0]) / gridSize;
        let density = 0;
        for (const p of points) {
          const dx = (cx - p.x) / bw;
          const dy = (cy - p.y) / bw;
          density += Math.exp(-(dx * dx + dy * dy) / 2);
        }
        if (density > maxDensity) maxDensity = density;
        row.push(density);
      }
      result.push(row);
    }
    return { cells: result, densityScale: maxDensity > 0 ? 1 / maxDensity : 1 };
  }, [points, gridSize, bw, xDomain, yDomain]);

  const flatCells = useMemo(() => cells.flat(), [cells]);

  return (
    <>
      <Grid scale={xScale} orient="x"  length={plotHeight} />
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[...GRID_PLAYBOOK]}>
        {flatCells.map((d, idx) => {
          if (d * densityScale < 0.01) return null;
          const ci = idx % gridSize;
          const ri = Math.floor(idx / gridSize);
          return (
            <Rect
              key={`c-${idx}`}
              x={ci * cellW}
              y={ri * cellH}
              width={cellW}
              height={cellH}
              fill={cloudColor(d * densityScale)}
              stroke="none"
              opacity={1}
            />
          );
        })}
      </Animation>
      {points.map((p, i) => (
        <Ellipse
          key={`p-${i}`}
          cx={xScale(p.x)}
          cy={yScale(p.y)}
          rx={2}
          ry={2}
          fill="rgba(255,255,255,0.3)"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={0.5}
        />
      ))}
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
    </>
  );
}


function defaultDensityData(): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(-2 * Math.log(Math.max(1e-5, Math.random()))) * 15;
    out.push({ x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) });
  }
  return out;
}

export default DensityCloudChart;
