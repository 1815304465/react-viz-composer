/**
 * RadialTreeChart —— 径向树图（根节点居中极坐标布局）
 */

import { useMemo } from 'react';
import { Animation, Line, Ellipse, Text } from 'react-viz-composer';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface RadialNode {
  name: string;
  children?: RadialNode[];
}

interface RadialLayout {
  name: string;
  x: number;
  y: number;
  depth: number;
  angle: number;
  parent?: RadialLayout;
}

interface RadialHoverPayload {
  name: string;
  depth: number;
  angle: number;
}

interface Props extends ChartItemHoverProps<RadialHoverPayload> {
  data?: RadialNode;
}

const NODE_PLAYBOOK = [
  { attribute: 'rx', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
  { attribute: 'ry', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 300 },
] as const;

/** 统计叶子数 */
function countLeaves(node: RadialNode): number {
  if (!node.children?.length) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

/** 极坐标径向树布局 */
function computeRadialLayout(
  root: RadialNode,
  cx: number,
  cy: number,
  maxR: number,
): RadialLayout[] {
  const nodes: RadialLayout[] = [];
  const maxDepth = getMaxDepth(root);

  function walk(
    node: RadialNode,
    depth: number,
    startAngle: number,
    endAngle: number,
    parent?: RadialLayout,
  ): RadialLayout {
    const angle = (startAngle + endAngle) / 2;
    const r = depth === 0 ? 0 : (depth / maxDepth) * maxR;
    const x = cx + r * Math.cos(angle - Math.PI / 2);
    const y = cy + r * Math.sin(angle - Math.PI / 2);
    const ln: RadialLayout = { name: node.name, x, y, depth, angle, parent };
    nodes.push(ln);

    if (node.children?.length) {
      const leafTotal = node.children.reduce((s, c) => s + countLeaves(c), 0);
      let offset = startAngle;
      node.children.forEach((child) => {
        const childLeaves = countLeaves(child);
        const sweep = ((endAngle - startAngle) * childLeaves) / leafTotal;
        walk(child, depth + 1, offset, offset + sweep, ln);
        offset += sweep;
      });
    }
    return ln;
  }

  walk(root, 0, 0, Math.PI * 2);
  return nodes;
}

/** 计算最大深度 */
function getMaxDepth(node: RadialNode, d = 0): number {
  if (!node.children?.length) return d;
  return Math.max(...node.children.map((c) => getMaxDepth(c, d + 1)));
}

/**
 * 径向树图
 */
export function RadialTreeChart(props: Props) {
  return (
    <ChartFrame>
      <RadialTreeChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function RadialTreeChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<RadialHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.name}-${p.depth}`,
  );

  const root: RadialNode = data ?? {
    name: '根',
    children: [
      {
        name: '分支 A',
        children: [{ name: 'A1' }, { name: 'A2' }, { name: 'A3' }],
      },
      {
        name: '分支 B',
        children: [{ name: 'B1' }, { name: 'B2' }],
      },
      {
        name: '分支 C',
        children: [
          { name: 'C1', children: [{ name: 'C1-1' }, { name: 'C1-2' }] },
          { name: 'C2' },
        ],
      },
    ],
  };

  const cx = plotWidth / 2;
  const cy = plotHeight / 2;
  const maxR = Math.min(cx, cy) - 30;

  const layout = useMemo(
    () => computeRadialLayout(root, cx, cy, maxR),
    [root, cx, cy, maxR],
  );

  const nodeR = 6;

  return (
    <>
      {layout.map((n) => {
        if (!n.parent) return null;
        return (
          <Animation
            key={`link-${n.depth}-${n.name}`}
            playbook={[{
              duration: 600,
              easing: 'easeOutCubic',
              targets: 'link',
              compute: ({ progress }: { progress: number }) => ({
                points: [
                  { x: n.parent!.x, y: n.parent!.y },
                  {
                    x: n.parent!.x + (n.x - n.parent!.x) * progress,
                    y: n.parent!.y + (n.y - n.parent!.y) * progress,
                  },
                ],
              }),
            }]}
          >
            <Line
              id="link"
              points={[{ x: n.parent.x, y: n.parent.y }, { x: n.x, y: n.y }]}
              stroke="#d9d9d9"
              strokeWidth={1}
            />
          </Animation>
        );
      })}
      <Animation playbook={[...NODE_PLAYBOOK]}>
        {layout.map((n, i) => {
          const color = CATEGORY_12[n.depth % CATEGORY_12.length];
          const key = `${n.name}-${n.depth}`;
          const payload: RadialHoverPayload = { name: n.name, depth: n.depth, angle: n.angle };
          return (
            <Ellipse
              key={`node-${i}`}
              cx={n.x}
              cy={n.y}
              rx={n.depth === 0 ? nodeR + 2 : nodeR}
              ry={n.depth === 0 ? nodeR + 2 : nodeR}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1.5, isHovering(key))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {layout.filter((n) => n.depth > 0).map((n, i) => {
          const labelR = 14;
          const lx = n.x + labelR * Math.cos(n.angle - Math.PI / 2);
          const ly = n.y + labelR * Math.sin(n.angle - Math.PI / 2);
          return (
            <Text
              key={`lbl-${i}`}
              x={lx}
              y={ly + 4}
              text={n.name}
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

export default RadialTreeChart;
