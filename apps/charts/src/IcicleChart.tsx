/**
 * IcicleChart —— 冰柱图（横向分层矩形树）
 */

import { useMemo } from 'react';
import { Animation, Rect, Text } from 'react-viz-composer';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface IcicleNode {
  name: string;
  value?: number;
  children?: IcicleNode[];
}

interface IcicleRect {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  value: number;
}

interface IcicleHoverPayload {
  name: string;
  value: number;
  depth: number;
}

interface Props extends ChartItemHoverProps<IcicleHoverPayload> {
  data?: IcicleNode;
}

const CELL_PLAYBOOK = [
  { attribute: 'width', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 25 },
  { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 25 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 25, delay: 200 },
] as const;

/** 汇总节点值 */
function nodeValue(node: IcicleNode): number {
  if (node.value != null) return node.value;
  if (!node.children?.length) return 1;
  return node.children.reduce((s, c) => s + nodeValue(c), 0);
}

/** 递归布局冰柱矩形（横向按深度分层） */
function layoutIcicle(
  node: IcicleNode,
  depth: number,
  maxDepth: number,
  x: number,
  y: number,
  w: number,
  h: number,
  out: IcicleRect[],
): void {
  const val = nodeValue(node);
  const layerW = w / (maxDepth + 1);
  out.push({ name: node.name, x: x + depth * layerW, y, w: layerW - 1, h, depth, value: val });
  if (!node.children?.length) return;
  const total = node.children.reduce((s, c) => s + nodeValue(c), 0);
  let offsetY = y;
  node.children.forEach((child) => {
    const childVal = nodeValue(child);
    const childH = (childVal / total) * h;
    layoutIcicle(child, depth + 1, maxDepth, x, offsetY, w, childH, out);
    offsetY += childH;
  });
}

/** 计算树最大深度 */
function maxDepth(node: IcicleNode, d = 0): number {
  if (!node.children?.length) return d;
  return Math.max(...node.children.map((c) => maxDepth(c, d + 1)));
}

/**
 * 冰柱图
 */
export function IcicleChart(props: Props) {
  return (
    <ChartFrame>
      <IcicleChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function IcicleChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<IcicleHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.name}-${p.depth}`,
  );

  const root: IcicleNode = data ?? {
    name: '全部',
    children: [
      {
        name: '技术部',
        children: [
          { name: '前端', value: 35 },
          { name: '后端', value: 45 },
          { name: '测试', value: 20 },
        ],
      },
      {
        name: '产品部',
        children: [
          { name: '设计', value: 30 },
          { name: '运营', value: 25 },
        ],
      },
      {
        name: '市场部',
        children: [
          { name: '推广', value: 40 },
          { name: '销售', value: 50 },
        ],
      },
    ],
  };

  const layout = useMemo(() => {
    const depth = maxDepth(root);
    const rects: IcicleRect[] = [];
    layoutIcicle(root, 0, depth, 0, 0, plotWidth, plotHeight, rects);
    return rects;
  }, [root, plotWidth, plotHeight]);

  return (
    <>
      <Animation playbook={[...CELL_PLAYBOOK]}>
        {layout.map((r, i) => {
          const color = CATEGORY_12[r.depth % CATEGORY_12.length];
          const payload: IcicleHoverPayload = { name: r.name, value: r.value, depth: r.depth };
          const key = `${r.name}-${r.depth}`;
          return (
            <Rect
              key={`cell-${key}-${i}`}
              x={r.x}
              y={r.y + 1}
              width={r.w}
              height={r.h - 2}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(1, isHovering(key))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {layout.filter((r) => r.w > 30 && r.h > 16).map((r, i) => (
          <Text
            key={`lbl-${r.name}-${r.depth}-${i}`}
            x={r.x + 4}
            y={r.y + r.h / 2 + 4}
            text={r.name}
            fontSize={10}
            fontFamily="sans-serif"
            fill="#fff"
            textAlign="start"
            opacity={1}
          />
        ))}
      </Animation>
    </>
  );
}

export default IcicleChart;
