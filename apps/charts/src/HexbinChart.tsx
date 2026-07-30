/**
 * HexbinChart —— 六边形分箱散点图
 */

import { useMemo } from 'react';
import { Animation, Path, Text } from '@react-viz-composer/core';
import { Axis, Grid } from '@react-viz-composer/kit';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  scaleLinear,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface ScatterPoint {
  x: number;
  y: number;
}

interface HexCell {
  q: number;
  r: number;
  count: number;
  cx: number;
  cy: number;
}

interface HexHoverPayload {
  q: number;
  r: number;
  count: number;
}

interface Props extends ChartItemHoverProps<HexHoverPayload> {
  data?: ScatterPoint[];
  hexRadius?: number;
}

const HEX_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 8 },
] as const;

/** 六边形顶点 Path */
function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

/** 根据计数取热力色 */
function countColor(count: number, max: number): string {
  const t = count / Math.max(max, 1);
  if (t < 0.2) return '#f0f5ff';
  if (t < 0.4) return '#adc6ff';
  if (t < 0.6) return '#69b1ff';
  if (t < 0.8) return '#1677ff';
  return '#003eb3';
}

/** 轴向坐标转像素 */
function axialToPixel(q: number, r: number, radius: number, ox: number, oy: number) {
  const cx = ox + radius * (3 / 2) * q;
  const cy = oy + radius * Math.sqrt(3) * (r + q / 2);
  return { cx, cy };
}

/** 像素转轴向坐标（近似） */
function pixelToAxial(px: number, py: number, radius: number, ox: number, oy: number) {
  const q = ((2 / 3) * (px - ox)) / radius;
  const r = ((-1 / 3) * (px - ox) + (Math.sqrt(3) / 3) * (py - oy)) / radius;
  return { q: Math.round(q), r: Math.round(r) };
}

/**
 * 六边形分箱图
 */
export function HexbinChart(props: Props) {
  return (
    <ChartFrame>
      <HexbinChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function HexbinChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, hexRadius = 14, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<HexHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.q}-${p.r}`,
  );

  const points: ScatterPoint[] = data ?? defaultScatter();

  const xExtent = useMemo(() => {
    const xs = points.map((p) => p.x);
    return [Math.min(...xs) * 0.95, Math.max(...xs) * 1.05] as [number, number];
  }, [points]);
  const yExtent = useMemo(() => {
    const ys = points.map((p) => p.y);
    return [Math.min(...ys) * 0.95, Math.max(...ys) * 1.05] as [number, number];
  }, [points]);

  const xScale = useMemo(() => scaleLinear(xExtent, [hexRadius, plotWidth - hexRadius]), [xExtent, plotWidth, hexRadius]);
  const yScale = useMemo(() => scaleLinear(yExtent, [plotHeight - hexRadius, hexRadius]), [yExtent, plotHeight, hexRadius]);

  const cells = useMemo(() => {
    const map = new Map<string, HexCell>();
    for (const p of points) {
      const px = xScale(p.x);
      const py = yScale(p.y);
      const { q, r } = pixelToAxial(px, py, hexRadius, hexRadius, hexRadius);
      const key = `${q},${r}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        const { cx, cy } = axialToPixel(q, r, hexRadius, hexRadius, hexRadius);
        map.set(key, { q, r, count: 1, cx, cy });
      }
    }
    return [...map.values()];
  }, [points, xScale, yScale, hexRadius]);

  const maxCount = Math.max(...cells.map((c) => c.count), 1);

  return (
    <>
      <Grid scale={yScale} orient="y" length={plotWidth} />
      <Grid scale={xScale} orient="x" length={plotHeight} />
      <Animation playbook={[...HEX_PLAYBOOK]}>
        {cells.map((c) => {
          const payload: HexHoverPayload = { q: c.q, r: c.r, count: c.count };
          const cellKey = `${c.q}-${c.r}`;
          return (
            <Path
              key={cellKey}
              d={hexPath(c.cx, c.cy, hexRadius - 1)}
              fill={countColor(c.count, maxCount)}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(1, isHovering(cellKey))}
              opacity={1}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      {cells.filter((c) => c.count > 2).map((c) => (
        <Text
          key={`t-${c.q}-${c.r}`}
          x={c.cx}
          y={c.cy + 4}
          text={String(c.count)}
          fontSize={9}
          fontFamily="sans-serif"
          fill={c.count / maxCount > 0.5 ? '#fff' : TEXT_COLOR}
          textAlign="middle"
        />
      ))}
      <Axis scale={xScale} orient="bottom" length={plotWidth} crossAt={plotHeight} />
      <Axis scale={yScale} orient="left" length={plotHeight} crossAt={0} />
    </>
  );
}

/** 生成默认散点数据 */
function defaultScatter(): ScatterPoint[] {
  const pts: ScatterPoint[] = [];
  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 40 + 10;
    pts.push({
      x: 50 + Math.cos(angle) * dist + (Math.random() - 0.5) * 15,
      y: 50 + Math.sin(angle) * dist + (Math.random() - 0.5) * 15,
    });
  }
  for (let i = 0; i < 80; i++) {
    pts.push({ x: 20 + Math.random() * 20, y: 75 + Math.random() * 15 });
  }
  return pts;
}

export default HexbinChart;
