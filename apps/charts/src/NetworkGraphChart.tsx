/**
 * NetworkGraphChart —— 网络图 / 力导向图
 *
 * 节点坐标会按实测 plot 尺寸等比缩放到绘图区内，避免固定像素布局被裁切。
 */

import { useMemo } from 'react';
import { Animation, Ellipse, Line, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  hoverOpacity,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface NetworkNode {
  id: string;
  label?: string;
  x: number;
  y: number;
}

interface NetworkEdge {
  source: string;
  target: string;
}

interface NodeHoverPayload {
  id: string;
  label: string;
  degree: number;
}

interface Props extends ChartItemHoverProps<NodeHoverPayload> {
  nodes?: NetworkNode[];
  edges?: NetworkEdge[];
}

const NODE_R = 14;
const LAYOUT_PAD = 28;

const NODE_PLAYBOOK = [
  { attribute: 'rx', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
  { attribute: 'ry', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 50, delay: 300 },
] as const;

/**
 * 将节点包围盒等比映射到绘图区（留边距）
 * @param nodes 原始坐标节点
 * @param plotWidth 绘图宽
 * @param plotHeight 绘图高
 */
function fitNodesToPlot(
  nodes: NetworkNode[],
  plotWidth: number,
  plotHeight: number,
): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return map;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  }

  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const innerW = Math.max(plotWidth - LAYOUT_PAD * 2, 1);
  const innerH = Math.max(plotHeight - LAYOUT_PAD * 2 - 16, 1);
  const scale = Math.min(innerW / spanX, innerH / spanY);
  const usedW = spanX * scale;
  const usedH = spanY * scale;
  const ox = LAYOUT_PAD + (innerW - usedW) / 2;
  const oy = LAYOUT_PAD + (innerH - usedH) / 2;

  for (const n of nodes) {
    map.set(n.id, {
      x: ox + (n.x - minX) * scale,
      y: oy + (n.y - minY) * scale,
    });
  }
  return map;
}

/**
 * 网络图
 */
export function NetworkGraphChart(props: Props) {
  return (
    <ChartFrame>
      <NetworkGraphChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function NetworkGraphChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { nodes, edges, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p) => p.id,
  );

  const rawNodes: NetworkNode[] = nodes ?? [
    { id: 'React', label: 'React', x: 150, y: 100 },
    { id: 'Vue', label: 'Vue', x: 350, y: 80 },
    { id: 'Angular', label: 'Angular', x: 100, y: 280 },
    { id: 'Svelte', label: 'Svelte', x: 400, y: 300 },
    { id: 'Solid', label: 'SolidJS', x: 250, y: 200 },
    { id: 'Preact', label: 'Preact', x: 500, y: 180 },
    { id: 'Lit', label: 'Lit', x: 520, y: 320 },
    { id: 'Qwik', label: 'Qwik', x: 300, y: 360 },
  ];
  const rawEdges: NetworkEdge[] = edges ?? [
    { source: 'React', target: 'Vue' },
    { source: 'React', target: 'Angular' },
    { source: 'React', target: 'Svelte' },
    { source: 'React', target: 'Preact' },
    { source: 'Vue', target: 'Angular' },
    { source: 'Vue', target: 'Solid' },
    { source: 'Angular', target: 'Svelte' },
    { source: 'Svelte', target: 'Solid' },
    { source: 'Solid', target: 'Preact' },
    { source: 'Preact', target: 'Qwik' },
    { source: 'Lit', target: 'Qwik' },
    { source: 'Lit', target: 'Svelte' },
  ];

  const positions = useMemo(
    () => fitNodesToPlot(rawNodes, plotWidth, plotHeight),
    [rawNodes, plotWidth, plotHeight],
  );

  const degree = useMemo(() => {
    const map = new Map<string, number>();
    rawNodes.forEach((n) => map.set(n.id, 0));
    rawEdges.forEach((e) => {
      map.set(e.source, (map.get(e.source) ?? 0) + 1);
      map.set(e.target, (map.get(e.target) ?? 0) + 1);
    });
    return map;
  }, [rawNodes, rawEdges]);

  return (
    <>
      {rawEdges.map((e, i) => {
        const sp = positions.get(e.source);
        const tp = positions.get(e.target);
        if (!sp || !tp) return null;
        return (
          <Animation
            key={`edge-${i}`}
            playbook={[{
              duration: 600,
              easing: 'easeOutCubic',
              targets: 'edge',
              compute: ({ progress }: { progress: number }) => ({
                points: [
                  { x: sp.x, y: sp.y },
                  { x: sp.x + (tp.x - sp.x) * progress, y: sp.y + (tp.y - sp.y) * progress },
                ],
                opacity: 0.6 * progress,
              }),
            }]}
          >
            <Line
              id="edge"
              points={[{ x: sp.x, y: sp.y }, { x: tp.x, y: tp.y }]}
              stroke="#cccccc"
              strokeWidth={1}
              opacity={0}
            />
          </Animation>
        );
      })}
      <Animation playbook={[...NODE_PLAYBOOK]}>
        {rawNodes.map((n, i) => {
          const pos = positions.get(n.id);
          if (!pos) return null;
          const color = CATEGORY_12[i % CATEGORY_12.length];
          const label = n.label ?? n.id;
          const payload: NodeHoverPayload = {
            id: n.id,
            label,
            degree: degree.get(n.id) ?? 0,
          };
          return (
            <Ellipse
              key={n.id}
              cx={pos.x}
              cy={pos.y}
              rx={NODE_R}
              ry={NODE_R}
              fill={color}
              opacity={hoverOpacity(0.85, isHovering(n.id))}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1.5, isHovering(n.id))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {rawNodes.map((n) => {
          const pos = positions.get(n.id);
          if (!pos) return null;
          const label = n.label ?? n.id;
          return (
            <Text
              key={`lab-${n.id}`}
              x={pos.x}
              y={pos.y + NODE_R + 14}
              text={label}
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


export default NetworkGraphChart;
