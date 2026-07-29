/**
 * TreeChart —— 树图（横向 tidy-tree）
 */

import { Animation, Rect, Path, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


const NODE_W = 100;
const NODE_H = 28;
const LEVEL_GAP = 130;
const MARGIN_TOP = 12;

interface TreeNode {
  name: string;
  children?: TreeNode[];
}

interface LayoutNode {
  name: string;
  x: number;
  y: number;
  depth: number;
  parent?: LayoutNode;
  childCount: number;
  leafCount: number;
}

interface TreeHoverPayload {
  name: string;
  depth: number;
  childCount: number;
  leafCount: number;
}

interface Props extends ChartItemHoverProps<TreeHoverPayload> {
  data?: TreeNode;
}

const NODE_PLAYBOOK = [
  { attribute: 'width', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
  { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
  { attribute: 'x', duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 200 },
] as const;

/**
 * 树图
 */
export function TreeChart(props: Props) {
  return (
    <ChartFrame>
      <TreeChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function TreeChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: TreeHoverPayload): string => `${p.name}-${p.depth}`,
  );

  const root: TreeNode = data ?? {
    name: '根节点',
    children: [
      {
        name: '子节点 A',
        children: [{ name: '叶子 A1' }, { name: '叶子 A2' }, { name: '叶子 A3' }],
      },
      {
        name: '子节点 B',
        children: [{ name: '叶子 B1' }, { name: '叶子 B2' }],
      },
      {
        name: '子节点 C',
        children: [
          { name: '子节点 C1', children: [{ name: '叶子 C1-1' }, { name: '叶子 C1-2' }] },
          { name: '叶子 C2' },
        ],
      },
    ],
  };

  const layout = computeTreeLayout(root, plotHeight);
  const rootNode = layout[0];

  return (
    <>
      {layout.map((n) => {
        if (!n.parent) return null;
        const sx = n.parent.x + NODE_W;
        const sy = n.parent.y;
        const finalD = `M ${sx} ${sy} C ${(sx + n.x) / 2} ${sy}, ${(sx + n.x) / 2} ${n.y}, ${n.x} ${n.y}`;
        return (
          <Animation
            key={`link-${n.depth}-${n.name}`}
            playbook={[{
              duration: 700,
              easing: 'easeOutCubic',
              targets: 'link',
              compute: ({ progress }: { progress: number }) => {
                const linkP = Math.min(1, progress * 1.1);
                const animTx = sx + (n.x - sx) * linkP;
                const animTy = sy + (n.y - sy) * linkP;
                const mx = (sx + animTx) / 2;
                return { d: `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${animTy}, ${animTx} ${animTy}` };
              },
            }]}
          >
            <Path
              id="link"
              d={finalD}
              fill="none"
              stroke="#bfbfbf"
              strokeWidth={1}
            />
          </Animation>
        );
      })}
      <Animation playbook={NODE_PLAYBOOK.map((step) =>
        step.attribute === 'x'
          ? { ...step, from: rootNode.x }
          : step,
      )}>
        {layout.map((n, i) => {
          const color = CATEGORY_12[n.depth % CATEGORY_12.length];
          const payload: TreeHoverPayload = {
            name: n.name,
            depth: n.depth,
            childCount: n.childCount,
            leafCount: n.leafCount,
          };
          const nodeKey = `${n.name}-${n.depth}`;
          return (
            <Rect
              key={`node-${i}`}
              x={n.x}
              y={n.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(nodeKey))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {layout.map((n, i) => (
          <Text
            key={`label-${i}`}
            x={n.x + NODE_W / 2}
            y={n.y + 4}
            text={n.name}
            fontSize={11}
            fontFamily="sans-serif"
            fill="#fff"
            textAlign="middle"
            opacity={1}
          />
        ))}
      </Animation>
    </>
  );
}


function countLeaves(node: TreeNode): number {
  if (!node.children?.length) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

function computeTreeLayout(root: TreeNode, plotHeight: number): LayoutNode[] {
  const leafTotal = countLeaves(root);
  const rowGap = Math.min(36, (plotHeight - MARGIN_TOP * 2) / Math.max(leafTotal, 1));
  const nodes: LayoutNode[] = [];
  let leafIndex = 0;

  function walk(node: TreeNode, depth: number, parent?: LayoutNode): LayoutNode {
    const childCount = node.children?.length ?? 0;
    const leafCount = countLeaves(node);
    const ln: LayoutNode = {
      name: node.name,
      x: depth * LEVEL_GAP + 16,
      y: 0,
      depth,
      parent,
      childCount,
      leafCount,
    };
    nodes.push(ln);
    if (childCount > 0) {
      const childLayouts = node.children!.map((c) => walk(c, depth + 1, ln));
      ln.y = (childLayouts[0].y + childLayouts[childLayouts.length - 1].y) / 2;
    } else {
      ln.y = MARGIN_TOP + leafIndex * rowGap + NODE_H / 2;
      leafIndex += 1;
    }
    return ln;
  }

  walk(root, 0);
  return nodes;
}

export default TreeChart;
