/**
 * TreemapChart —— 矩形树图
 *
 * 使用简化的 squarified treemap 算法布局嵌套矩形。
 * area ∝ value，颜色按深度循环。
 */

import { useMemo } from 'react';
import { Rect, Text } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animSize } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { CATEGORY_12 } from './shared/palette';

interface TreemapData {
  name: string;
  value: number;
  children?: TreemapData[];
}

interface LayoutRect {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  value: number;
}

interface TreemapHoverPayload {
  name: string;
  value: number;
  depth: number;
}

interface Props extends ChartItemHoverProps<TreemapHoverPayload> {
  data?: TreemapData;
}

/**
 * 简化的 squarified treemap 布局：
 * - 始终横向切分（row）：arranged 区域放左/上，剩余区域继续递归
 * - aspect ratio 控制在 best effort
 */
function squarifyLayout(
  items: { name: string; value: number; depth: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
): LayoutRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ name: items[0].name, x, y, w, h, depth: items[0].depth, value: items[0].value }];
  }

  const total = items.reduce((s, it) => s + it.value, 0);
  if (total <= 0) return [];

  const out: LayoutRect[] = [];
  let remaining = [...items];
  let offsetX = x;
  let offsetY = y;
  let remainingW = w;
  let remainingH = h;

  // 决定切割方向：水平 or 垂直
  while (remaining.length > 0) {
    const direction = remainingW >= remainingH ? 'vertical' : 'horizontal';
    // greedy: 取1-2个使得 aspect ratio 较好的 items
    const groupSize = Math.min(remaining.length, 2);
    const group = remaining.slice(0, groupSize);
    remaining = remaining.slice(groupSize);

    const groupTotal = group.reduce((s, it) => s + it.value, 0);
    const ratio = groupTotal / total;

    if (direction === 'vertical') {
      const colW = remainingW * (ratio / (1 - (offsetX - x) / w || 0.1));
      const actualW = Math.min(colW, remainingW);
      let subY = offsetY;
      group.forEach((it) => {
        const itemRatio = it.value / groupTotal;
        const itemH = remainingH * itemRatio;
        out.push({ name: it.name, x: offsetX, y: subY, w: actualW, h: itemH, depth: it.depth, value: it.value });
        subY += itemH;
      });
      offsetX += actualW;
      remainingW -= actualW;
    } else {
      const rowH = remainingH * (ratio / (1 - (offsetY - y) / h || 0.1));
      const actualH = Math.min(rowH, remainingH);
      let subX = offsetX;
      group.forEach((it) => {
        const itemRatio = it.value / groupTotal;
        const itemW = remainingW * itemRatio;
        out.push({ name: it.name, x: subX, y: offsetY, w: itemW, h: actualH, depth: it.depth, value: it.value });
        subX += itemW;
      });
      offsetY += actualH;
      remainingH -= actualH;
    }
  }
  return out;
}

function flatten(
  data: TreemapData,
  depth = 0,
): { name: string; value: number; depth: number }[] {
  const leafValue = data.children
    ? data.children.reduce((s, c) => s + c.value, 0)
    : data.value;
  const entries: { name: string; value: number; depth: number }[] = [{ name: data.name, value: leafValue, depth }];
  if (data.children) {
    data.children.forEach((c) => {
      entries.push(...flatten(c, depth + 1));
    });
  }
  return entries;
}

export function TreemapChart(props: Props) {
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: TreemapHoverPayload) => `${p.name}-${p.depth}`,
  );

  const root: TreemapData = data ?? {
    name: '销售额',
    value: 1000,
    children: [
      {
        name: '华北',
        value: 350,
        children: [
          { name: '北京', value: 150 },
          { name: '天津', value: 80 },
          { name: '河北', value: 120 },
        ],
      },
      {
        name: '华东',
        value: 400,
        children: [
          { name: '上海', value: 180 },
          { name: '浙江', value: 130 },
          { name: '江苏', value: 90 },
        ],
      },
      {
        name: '华南',
        value: 250,
        children: [
          { name: '广东', value: 160 },
          { name: '福建', value: 90 },
        ],
      },
    ],
  };

  const layout = useMemo(() => {
    const entries = flatten(root);
    // 取叶子节点（最深层级）
    const maxDepth = Math.max(...entries.map((e) => e.depth));
    const leaves = entries.filter((e) => e.depth === maxDepth);
    // 如果叶子太少，回退到所有非根节点
    const items = leaves.length > 1 ? leaves : entries.filter((e) => e.depth > 0);
    return squarifyLayout(items, 0, 0, PLOT_WIDTH, PLOT_HEIGHT);
  }, [root]);

  return (
    <ChartFrame entryDuration={900}>
      {(progress) => (
        <>
          {layout.map((r, i) => {
            const color = CATEGORY_12[r.depth % CATEGORY_12.length];
            const hovered = isHovering(`${r.name}-${r.depth}`);
            const payload: TreemapHoverPayload = {
              name: r.name,
              value: r.value,
              depth: r.depth,
            };
            return (
              <Rect
                key={`${r.name}-${r.depth}-${i}`}
                x={r.x + 1}
                y={r.y + 1}
                width={animSize(r.w - 2, progress)}
                height={animSize(r.h - 2, progress)}
                fill={color}
                stroke="#fff"
                strokeWidth={hoverStrokeWidth(2, hovered)}
                {...bindHover(payload)}
              />
            );
          })}

          {layout.map((r, i) => {
            if (progress < 0.4) return null;
            if (r.w < 30 || r.h < 18) return null;
            return (
              <Text
                key={`t-${r.name}-${r.depth}-${i}`}
                x={r.x + animSize(r.w - 2, progress) / 2}
                y={r.y + animSize(r.h - 2, progress) / 2 + 4}
                text={`${r.name}\n${r.value}`}
                fontSize={10}
                fontFamily="sans-serif"
                fill="#fff"
                textAlign="middle"
              />
            );
          })}
        </>
      )}
    </ChartFrame>
  );
}

export default TreemapChart;
