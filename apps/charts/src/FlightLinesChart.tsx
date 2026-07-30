/**
 * FlightLinesChart —— 飞线图（笛卡尔坐标点 + 弧线连接）
 */

import { useMemo } from 'react';
import { Animation, Path, Ellipse, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  hoverOpacity,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface FlightPoint {
  id: string;
  x: number;
  y: number;
  name?: string;
}

interface FlightRoute {
  from: string;
  to: string;
  value?: number;
}

interface PointHoverPayload {
  id: string;
  name: string;
  degree: number;
}

interface RouteHoverPayload {
  from: string;
  to: string;
  value: number;
}

interface Props extends ChartItemHoverProps<PointHoverPayload | RouteHoverPayload> {
  data?: { points: FlightPoint[]; routes: FlightRoute[] };
}

const NODE_PLAYBOOK = [
  { attribute: 'rx', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
  { attribute: 'ry', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 50, delay: 400 },
] as const;

const LAYOUT_PAD = 30;

/** 将数据坐标映射到绘图区 */
function fitPoints(
  points: FlightPoint[],
  plotWidth: number,
  plotHeight: number,
): Map<string, { x: number; y: number; name: string }> {
  const map = new Map<string, { x: number; y: number; name: string }>();
  if (points.length === 0) return map;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const innerW = plotWidth - LAYOUT_PAD * 2;
  const innerH = plotHeight - LAYOUT_PAD * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY);

  for (const p of points) {
    map.set(p.id, {
      x: LAYOUT_PAD + (p.x - minX) * scale,
      y: LAYOUT_PAD + (p.y - minY) * scale,
      name: p.name ?? p.id,
    });
  }
  return map;
}

/** 构建飞线弧线 Path（二次贝塞尔） */
function flightArcPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bend: number,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const cx = mx - (dy / len) * bend;
  const cy = my + (dx / len) * bend;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

/**
 * 飞线图
 */
export function FlightLinesChart(props: Props) {
  return (
    <ChartFrame>
      <FlightLinesChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function FlightLinesChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p) => 'id' in p ? p.id : `${p.from}-${p.to}`,
  );

  const graph = data ?? {
    points: [
      { id: 'bj', x: 50, y: 30, name: '北京' },
      { id: 'sh', x: 80, y: 55, name: '上海' },
      { id: 'gz', x: 60, y: 80, name: '广州' },
      { id: 'cd', x: 30, y: 60, name: '成都' },
      { id: 'wh', x: 55, y: 50, name: '武汉' },
      { id: 'hz', x: 75, y: 45, name: '杭州' },
    ],
    routes: [
      { from: 'bj', to: 'sh', value: 120 },
      { from: 'bj', to: 'gz', value: 80 },
      { from: 'bj', to: 'cd', value: 60 },
      { from: 'sh', to: 'gz', value: 90 },
      { from: 'sh', to: 'hz', value: 50 },
      { from: 'cd', to: 'wh', value: 40 },
      { from: 'wh', to: 'sh', value: 70 },
      { from: 'hz', to: 'gz', value: 35 },
    ],
  };

  const positions = useMemo(
    () => fitPoints(graph.points, plotWidth, plotHeight),
    [graph.points, plotWidth, plotHeight],
  );

  const degree = useMemo(() => {
    const map = new Map<string, number>();
    graph.points.forEach((p) => map.set(p.id, 0));
    graph.routes.forEach((r) => {
      map.set(r.from, (map.get(r.from) ?? 0) + 1);
      map.set(r.to, (map.get(r.to) ?? 0) + 1);
    });
    return map;
  }, [graph]);

  const maxRouteValue = Math.max(...graph.routes.map((r) => r.value ?? 1), 1);
  const nodeR = 8;

  return (
    <>
      {graph.routes.map((r, i) => {
        const sp = positions.get(r.from);
        const tp = positions.get(r.to);
        if (!sp || !tp) return null;
        const dist = Math.sqrt((tp.x - sp.x) ** 2 + (tp.y - sp.y) ** 2);
        const bend = dist * 0.25;
        const strokeW = 1 + ((r.value ?? 1) / maxRouteValue) * 3;
        const routeKey = `${r.from}-${r.to}`;
        const payload: RouteHoverPayload = { from: r.from, to: r.to, value: r.value ?? 1 };
        const finalD = flightArcPath(sp.x, sp.y, tp.x, tp.y, bend);
        const color = CATEGORY_12[i % CATEGORY_12.length];
        return (
          <Animation
            key={`route-${i}`}
            playbook={[{
              duration: 800,
              easing: 'easeOutCubic',
              targets: 'flight',
              compute: ({ progress }: { progress: number }) => {
                const ax = sp.x + (tp.x - sp.x) * progress;
                const ay = sp.y + (tp.y - sp.y) * progress;
                return { d: flightArcPath(sp.x, sp.y, ax, ay, bend * progress) };
              },
            }]}
          >
            <Path
              id="flight"
              d={finalD}
              fill="none"
              stroke={color}
              strokeWidth={strokeW}
              opacity={hoverOpacity(0.6, isHovering(routeKey))}
              {...bindHover(payload)}
            />
          </Animation>
        );
      })}
      <Animation playbook={[...NODE_PLAYBOOK]}>
        {graph.points.map((p, i) => {
          const pos = positions.get(p.id);
          if (!pos) return null;
          const color = CATEGORY_12[i % CATEGORY_12.length];
          const payload: PointHoverPayload = {
            id: p.id,
            name: pos.name,
            degree: degree.get(p.id) ?? 0,
          };
          return (
            <Ellipse
              key={p.id}
              cx={pos.x}
              cy={pos.y}
              rx={nodeR}
              ry={nodeR}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, isHovering(p.id))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {graph.points.map((p) => {
          const pos = positions.get(p.id);
          if (!pos) return null;
          return (
            <Text
              key={`lbl-${p.id}`}
              x={pos.x}
              y={pos.y - nodeR - 6}
              text={pos.name}
              fontSize={11}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              textAlign="middle"
              opacity={1}
            />
          );
        })}
      </Animation>
    </>
  );
}

export default FlightLinesChart;
