/**
 * DendrogramChart —— 树状图（水平正交布局）
 */

import { useMemo } from 'react';
import { Animation, Path, Ellipse, Text } from 'react-viz-composer';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface DendroNode {
  name: string;
  children?: DendroNode[];
}

interface LayoutNode {
  name: string;
  x: number;
  y: number;
  depth: number;
  parent?: LayoutNode;
  leafIndex: number;
}

interface DendroHoverPayload {
  name: string;
  depth: number;
  leafIndex: number;
}

interface Props extends ChartItemHoverProps<DendroHoverPayload> {
  data?: DendroNode;
}

const NODE_PLAYBOOK = [
  { attribute: 'rx', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
  { attribute: 'ry', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 200 },
] as const;

/** 统计叶子数 */
function countLeaves(node: DendroNode): number {
  if (!node.children?.length) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

/** 计算水平树状布局 */
function computeDendroLayout(root: DendroNode, plotHeight: number): LayoutNode[] {
  const leafTotal = countLeaves(root);
  const rowGap = Math.min(32, (plotHeight - 24) / Math.max(leafTotal, 1));
  const levelGap = 80;
  const nodes: LayoutNode[] = [];
  let leafIdx = 0;

  function walk(node: DendroNode, depth: number, parent?: LayoutNode): LayoutNode {
    const ln: LayoutNode = {
      name: node.name,
      x: depth * levelGap + 20,
      y: 0,
      depth,
      parent,
      leafIndex: -1,
    };
    nodes.push(ln);
    if (node.children?.length) {
      const childLayouts = node.children.map((c) => walk(c, depth + 1, ln));
      ln.y = (childLayouts[0].y + childLayouts[childLayouts.length - 1].y) / 2;
    } else {
      ln.y = 12 + leafIdx * rowGap;
      ln.leafIndex = leafIdx;
      leafIdx += 1;
    }
    return ln;
  }

  walk(root, 0);
  return nodes;
}

/** 构建正交连接线 Path */
function linkPath(parent: LayoutNode, child: LayoutNode): string {
  const midX = (parent.x + child.x) / 2;
  return `M ${parent.x} ${parent.y} H ${midX} V ${child.y} H ${child.x}`;
}

/**
 * 树状图
 */
export function DendrogramChart(props: Props) {
  return (
    <ChartFrame>
      <DendrogramChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function DendrogramChartPlot(props: Props) {
  const { plotHeight } = useChartSize();
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<DendroHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.name}-${p.depth}`,
  );

  const root: DendroNode = data ?? {
    name: '生物分类',
    children: [
      {
        name: '动物界',
        children: [
          { name: '哺乳纲', children: [{ name: '灵长目' }, { name: '食肉目' }] },
          { name: '鸟纲', children: [{ name: '雀形目' }, { name: '隼形目' }] },
        ],
      },
      {
        name: '植物界',
        children: [
          { name: '被子植物', children: [{ name: '蔷薇科' }, { name: '豆科' }] },
          { name: '裸子植物', children: [{ name: '松科' }] },
        ],
      },
    ],
  };

  const layout = useMemo(() => computeDendroLayout(root, plotHeight), [root, plotHeight]);
  const nodeR = 5;

  return (
    <>
      {layout.map((n) => {
        if (!n.parent) return null;
        const d = linkPath(n.parent, n);
        return (
          <Animation
            key={`link-${n.depth}-${n.name}`}
            playbook={[{
              duration: 600,
              easing: 'easeOutCubic',
              targets: 'link',
              compute: ({ progress }: { progress: number }) => {
                const animX = n.parent!.x + (n.x - n.parent!.x) * progress;
                const animY = n.parent!.y + (n.y - n.parent!.y) * progress;
                const midX = (n.parent!.x + animX) / 2;
                return { d: `M ${n.parent!.x} ${n.parent!.y} H ${midX} V ${animY} H ${animX}` };
              },
            }]}
          >
            <Path id="link" d={d} fill="none" stroke="#bfbfbf" strokeWidth={1} />
          </Animation>
        );
      })}
      <Animation playbook={[...NODE_PLAYBOOK]}>
        {layout.map((n, i) => {
          const color = CATEGORY_12[n.depth % CATEGORY_12.length];
          const key = `${n.name}-${n.depth}`;
          const payload: DendroHoverPayload = { name: n.name, depth: n.depth, leafIndex: n.leafIndex };
          return (
            <Ellipse
              key={`node-${i}`}
              cx={n.x}
              cy={n.y}
              rx={nodeR}
              ry={nodeR}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(key))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {layout.filter((n) => n.leafIndex >= 0).map((n, i) => (
          <Text
            key={`lbl-${i}`}
            x={n.x + 12}
            y={n.y + 4}
            text={n.name}
            fontSize={11}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="start"
            opacity={1}
          />
        ))}
      </Animation>
    </>
  );
}

export default DendrogramChart;
