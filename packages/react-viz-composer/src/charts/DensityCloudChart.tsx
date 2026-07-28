/**
 * DensityCloudChart —— 云图 / 核密度估计图
 *
 * 将散点数据通过 KDE 转换为密度热力网格，叠加原始散点。
 */

import { Rect, Ellipse } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animValue } from './shared/useEntryProgress.ts';
import { scaleLinear } from './shared/scales';
import { Axis, Grid } from './shared/Axis';

interface Point {
  x: number;
  y: number;
}

interface Props {
  data?: Point[];
  bandwidth?: number;
  gridSize?: number;
}

/** 颜色映射：蓝→青→绿→黄→红 */
function cloudColor(v: number): string {
  // v in [0, 1]
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

export function DensityCloudChart(props: Props) {
  const { data, bandwidth, gridSize = 40 } = props;

  const points: Point[] = data ?? defaultDensityData();

  // 数据范围
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const padX = (maxX - minX) * 0.1 || 1;
  const padY = (maxY - minY) * 0.1 || 1;

  const xDomain: [number, number] = [minX - padX, maxX + padX];
  const yDomain: [number, number] = [minY - padY, maxY + padY];

  const xScale = scaleLinear(xDomain, [0, PLOT_WIDTH]);
  const yScale = scaleLinear(yDomain, [PLOT_HEIGHT, 0]);

  // KDE 计算
  const bw = bandwidth ?? ((maxX - minX) / 20 || 1);
  const cells: number[][] = [];
  let maxDensity = 0;

  const cellW = PLOT_WIDTH / gridSize;
  const cellH = PLOT_HEIGHT / gridSize;

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
    cells.push(row);
  }

  // 归一化
  const scale = maxDensity > 0 ? 1 / maxDensity : 1;

  return (
    <ChartFrame>
      {(progress) => (
        <>
          <Grid scale={xScale} orient="x" />
          <Grid scale={yScale} orient="y" />

          {/* 密度热力网格 */}
          {cells.map((row, ri) =>
            row.map((d, ci) => {
              const av = animValue(d * scale, progress);
              if (av < 0.01) return null;
              return (
                <Rect
                  key={`c-${ri}-${ci}`}
                  x={ci * cellW}
                  y={ri * cellH}
                  width={cellW}
                  height={cellH}
                  fill={cloudColor(av)}
                  stroke="none"
                />
              );
            }),
          )}

          {/* 原始散点叠加 */}
          {points.map((p, i) => {
            const px = xScale(p.x);
            const py = yScale(p.y);
            return (
              <Ellipse
                key={`p-${i}`}
                cx={px}
                cy={py}
                rx={2}
                ry={2}
                fill="rgba(255,255,255,0.3)"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={0.5}
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

function defaultDensityData(): Point[] {
  const out: Point[] = [];
  // 中心密集 + 外围稀疏
  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    // 使用 Box-Muller 近似做高斯分布
    const r = Math.sqrt(-2 * Math.log(Math.max(1e-5, Math.random()))) * 15;
    out.push({
      x: 50 + r * Math.cos(angle),
      y: 50 + r * Math.sin(angle),
    });
  }
  return out;
}

export default DensityCloudChart;
