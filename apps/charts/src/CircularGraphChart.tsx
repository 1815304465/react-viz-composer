/**
 * CircularGraphChart —— 环形布局关系图
 */

import { useMemo } from 'react';
import { Animation, Ellipse, Line, Text } from 'react-viz-composer';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface GraphNode {
  id: string;
  label: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphHoverPayload {
  id: string;
  label: string;
  type: 'node';
}

interface Props extends ChartItemHoverProps<GraphHoverPayload> {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}

const NODE_R = 12;

const NODE_PLAYBOOK = [
  { attribute: 'rx', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 60 },
  { attribute: 'ry', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 60 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 60, delay: 300 },
] as const;

/**
 * 环形布局关系图
 */
export function CircularGraphChart(props: Props) {
  return (
    <ChartFrame>
      <CircularGraphChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function CircularGraphChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { nodes: nodesProp, edges: edgesProp, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<GraphHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => p.id,
  );

  const ds = defaultCircularGraphData();
  const nodes = nodesProp ?? ds.nodes;
  const edges = edgesProp ?? ds.edges;
  const cx = plotWidth / 2;
  const cy = plotHeight / 2;
  const radius = Math.min(plotWidth, plotHeight) / 2 - 40;

  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    nodes.forEach((node, i) => map.set(node.id, i));
    return map;
  }, [nodes]);

  function nodeAngle(i: number): number {
    return -Math.PI / 2 + (2 * Math.PI * i) / nodes.length;
  }

  return (
    <>
      {edges.map((edge, i) => {
        const srcIdx = nodeIndexMap.get(edge.source);
        const tgtIdx = nodeIndexMap.get(edge.target);
        if (srcIdx === undefined || tgtIdx === undefined) return null;
        const srcAngle = nodeAngle(srcIdx);
        const tgtAngle = nodeAngle(tgtIdx);
        const src = { x: cx + radius * Math.cos(srcAngle), y: cy + radius * Math.sin(srcAngle) };
        const tgt = { x: cx + radius * Math.cos(tgtAngle), y: cy + radius * Math.sin(tgtAngle) };
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const trimR = NODE_R + 2;
        const finalPoints = [
          { x: src.x + (dx / dist) * trimR, y: src.y + (dy / dist) * trimR },
          { x: tgt.x - (dx / dist) * trimR, y: tgt.y - (dy / dist) * trimR },
        ];
        return (
          <Animation
            key={`edge-${i}`}
            playbook={[{
              duration: 600,
              easing: 'easeOutCubic',
              targets: 'edge',
              compute: ({ progress }: { progress: number }) => ({
                points: [
                  finalPoints[0],
                  {
                    x: finalPoints[0].x + (finalPoints[1].x - finalPoints[0].x) * progress,
                    y: finalPoints[0].y + (finalPoints[1].y - finalPoints[0].y) * progress,
                  },
                ],
                opacity: progress,
              }),
            }]}
          >
            <Line
              id="edge"
              points={finalPoints}
              stroke={CATEGORY_12[5]}
              strokeWidth={1.5}
              opacity={1}
            />
          </Animation>
        );
      })}
      <Animation playbook={[...NODE_PLAYBOOK]}>
        {nodes.map((node, i) => {
          const color = CATEGORY_12[i % CATEGORY_12.length];
          const angle = nodeAngle(i);
          const nx = cx + radius * Math.cos(angle);
          const ny = cy + radius * Math.sin(angle);
          const payload: GraphHoverPayload = { id: node.id, label: node.label, type: 'node' };
          const hovered = isHovering(node.id);
          return (
            <Ellipse
              key={node.id}
              cx={nx}
              cy={ny}
              rx={hovered ? NODE_R + 3 : NODE_R}
              ry={hovered ? NODE_R + 3 : NODE_R}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, hovered)}
              zIndex={hovered ? 10 : 0}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {nodes.map((node, i) => {
          const angle = nodeAngle(i);
          const nx = cx + radius * Math.cos(angle);
          const ny = cy + radius * Math.sin(angle) + NODE_R + 16;
          return (
            <Text
              key={`lbl-${node.id}`}
              x={nx}
              y={ny}
              text={node.label}
              fontSize={10}
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


function defaultCircularGraphData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return {
    nodes: [
      { id: 'A', label: '服务器A' },
      { id: 'B', label: '服务器B' },
      { id: 'C', label: '数据库' },
      { id: 'D', label: '缓存' },
      { id: 'E', label: '网关' },
      { id: 'F', label: '前端' },
      { id: 'G', label: '消息队列' },
    ],
    edges: [
      { source: 'F', target: 'E' },
      { source: 'E', target: 'A' },
      { source: 'E', target: 'B' },
      { source: 'A', target: 'C' },
      { source: 'B', target: 'C' },
      { source: 'A', target: 'D' },
      { source: 'B', target: 'D' },
      { source: 'A', target: 'G' },
      { source: 'B', target: 'G' },
    ],
  };
}

export default CircularGraphChart;
