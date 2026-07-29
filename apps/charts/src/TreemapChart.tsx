/**
 * TreemapChart —— 矩形树图
 */

import { useMemo } from 'react';
import { Animation, Rect, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


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

const CELL_PLAYBOOK = [
  { attribute: 'width', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 30 },
  { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 30 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 30, delay: 200 },
] as const;

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
  while (remaining.length > 0) {
    const direction = remainingW >= remainingH ? 'vertical' : 'horizontal';
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

function flatten(data: TreemapData, depth = 0): { name: string; value: number; depth: number }[] {
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

/**
 * 矩形树图
 */
export function TreemapChart(props: Props) {
  return (
    <ChartFrame>
      <TreemapChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function TreemapChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

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
    const maxDepth = Math.max(...entries.map((e) => e.depth));
    const leaves = entries.filter((e) => e.depth === maxDepth);
    const items = leaves.length > 1 ? leaves : entries.filter((e) => e.depth > 0);
    return squarifyLayout(items, 0, 0, plotWidth, plotHeight);
  }, [root]);

  return (
    <>
      <Animation playbook={[...CELL_PLAYBOOK]}>
        {layout.map((r, i) => {
          const color = CATEGORY_12[r.depth % CATEGORY_12.length];
          const payload: TreemapHoverPayload = { name: r.name, value: r.value, depth: r.depth };
          return (
            <Rect
              key={`${r.name}-${r.depth}-${i}`}
              x={r.x + 1}
              y={r.y + 1}
              width={r.w - 2}
              height={r.h - 2}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, isHovering(`${r.name}-${r.depth}`))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {layout.map((r, i) => (
          <Text
            key={`t-${r.name}-${r.depth}-${i}`}
            x={r.x + r.w / 2}
            y={r.y + r.h / 2 + 4}
            text={`${r.name}\n${r.value}`}
            fontSize={10}
            fontFamily="sans-serif"
            fill="#fff"
            textAlign="middle"
            opacity={r.w < 30 || r.h < 18 ? 0 : 1}
          />
        ))}
      </Animation>
    </>
  );
}


export default TreemapChart;
