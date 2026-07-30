/**
 * ArcDiagramChart —— 弧线图（基线节点 + 弧线连接）
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

interface ArcLink {
  source: string;
  target: string;
  value?: number;
}

interface NodeHoverPayload {
  id: string;
  degree: number;
}

interface LinkHoverPayload {
  source: string;
  target: string;
  value: number;
}

interface Props extends ChartItemHoverProps<NodeHoverPayload | LinkHoverPayload> {
  data?: { nodes: string[]; links: ArcLink[] };
}

const NODE_PLAYBOOK = [
  { attribute: 'rx', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
  { attribute: 'ry', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 50, delay: 300 },
] as const;

/** 构建基线上方弧线 Path */
function arcLinkPath(x1: number, x2: number, baseY: number, height: number): string {
  const mx = (x1 + x2) / 2;
  const my = baseY - height;
  return `M ${x1} ${baseY} Q ${mx} ${my} ${x2} ${baseY}`;
}

/**
 * 弧线图
 */
export function ArcDiagramChart(props: Props) {
  return (
    <ChartFrame>
      <ArcDiagramChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function ArcDiagramChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p) => 'id' in p ? p.id : `${p.source}-${p.target}`,
  );

  const graph = data ?? {
    nodes: ['React', 'Vue', 'Angular', 'Svelte', 'Solid', 'Lit'],
    links: [
      { source: 'React', target: 'Vue', value: 3 },
      { source: 'React', target: 'Angular', value: 2 },
      { source: 'React', target: 'Svelte', value: 4 },
      { source: 'Vue', target: 'Solid', value: 2 },
      { source: 'Angular', target: 'Lit', value: 1 },
      { source: 'Svelte', target: 'Solid', value: 3 },
      { source: 'Solid', target: 'Lit', value: 2 },
    ],
  };

  const baseY = plotHeight - 50;
  const nodeR = 10;
  const padX = 40;

  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const span = plotWidth - padX * 2;
    graph.nodes.forEach((id, i) => {
      map.set(id, {
        x: padX + (span * i) / Math.max(graph.nodes.length - 1, 1),
        y: baseY,
      });
    });
    return map;
  }, [graph.nodes, plotWidth, baseY, padX]);

  const degree = useMemo(() => {
    const map = new Map<string, number>();
    graph.nodes.forEach((n) => map.set(n, 0));
    graph.links.forEach((l) => {
      map.set(l.source, (map.get(l.source) ?? 0) + 1);
      map.set(l.target, (map.get(l.target) ?? 0) + 1);
    });
    return map;
  }, [graph]);

  const maxLinkValue = Math.max(...graph.links.map((l) => l.value ?? 1), 1);

  return (
    <>
      {graph.links.map((l, i) => {
        const sp = nodePositions.get(l.source);
        const tp = nodePositions.get(l.target);
        if (!sp || !tp) return null;
        const dist = Math.abs(tp.x - sp.x);
        const arcH = Math.min(plotHeight - baseY - 30, dist * 0.5 + 20);
        const strokeW = 1 + ((l.value ?? 1) / maxLinkValue) * 3;
        const linkKey = `${l.source}-${l.target}`;
        const payload: LinkHoverPayload = { source: l.source, target: l.target, value: l.value ?? 1 };
        const finalD = arcLinkPath(sp.x, tp.x, baseY, arcH);
        return (
          <Animation
            key={`arc-${i}`}
            playbook={[{
              duration: 700,
              easing: 'easeOutCubic',
              targets: 'arc',
              compute: ({ progress }: { progress: number }) => {
                const animX2 = sp.x + (tp.x - sp.x) * progress;
                return { d: arcLinkPath(sp.x, animX2, baseY, arcH * progress) };
              },
            }]}
          >
            <Path
              id="arc"
              d={finalD}
              fill="none"
              stroke={CATEGORY_12[i % CATEGORY_12.length]}
              strokeWidth={strokeW}
              opacity={hoverOpacity(0.5, isHovering(linkKey))}
              {...bindHover(payload)}
            />
          </Animation>
        );
      })}
      <Animation playbook={[...NODE_PLAYBOOK]}>
        {graph.nodes.map((id, i) => {
          const pos = nodePositions.get(id)!;
          const color = CATEGORY_12[i % CATEGORY_12.length];
          const payload: NodeHoverPayload = { id, degree: degree.get(id) ?? 0 };
          return (
            <Ellipse
              key={id}
              cx={pos.x}
              cy={pos.y}
              rx={nodeR}
              ry={nodeR}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1.5, isHovering(id))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {graph.nodes.map((id) => {
          const pos = nodePositions.get(id)!;
          return (
            <Text
              key={`lbl-${id}`}
              x={pos.x}
              y={baseY + 24}
              text={id}
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

export default ArcDiagramChart;
