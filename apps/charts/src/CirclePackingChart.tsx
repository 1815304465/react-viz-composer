/**
 * CirclePackingChart —— 圆形打包图（递归嵌套圆）
 */

import { useMemo } from 'react';
import { Animation, Ellipse, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  hoverOpacity,
  CATEGORY_12,
  useChartSize,
} from './local';
import type { ChartItemHoverProps } from './local';

interface PackNode {
  name: string;
  value?: number;
  children?: PackNode[];
}

interface PackedCircle {
  name: string;
  cx: number;
  cy: number;
  r: number;
  depth: number;
  value: number;
}

interface PackHoverPayload {
  name: string;
  value: number;
  depth: number;
}

interface Props extends ChartItemHoverProps<PackHoverPayload> {
  data?: PackNode;
}

const CIRCLE_PLAYBOOK = [
  { attribute: 'rx', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
  { attribute: 'ry', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40, delay: 300 },
] as const;

/** 汇总节点值 */
function nodeValue(node: PackNode): number {
  if (node.value != null) return node.value;
  if (!node.children?.length) return 1;
  return node.children.reduce((s, c) => s + nodeValue(c), 0);
}

/** 简单递归圆形打包 */
function packCircles(
  node: PackNode,
  cx: number,
  cy: number,
  r: number,
  depth: number,
  out: PackedCircle[],
): void {
  const val = nodeValue(node);
  out.push({ name: node.name, cx, cy, r, depth, value: val });
  if (!node.children?.length) return;

  const total = node.children.reduce((s, c) => s + nodeValue(c), 0);
  const childR = r * 0.85;
  const n = node.children.length;
  node.children.forEach((child, i) => {
    const childVal = nodeValue(child);
    const ratio = childVal / total;
    const cr = childR * Math.sqrt(ratio);
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const dist = r - cr - 2;
    const ccx = cx + dist * Math.cos(angle) * 0.6;
    const ccy = cy + dist * Math.sin(angle) * 0.6;
    packCircles(child, ccx, ccy, cr, depth + 1, out);
  });
}

/**
 * 圆形打包图
 */
export function CirclePackingChart(props: Props) {
  return (
    <ChartFrame>
      <CirclePackingChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function CirclePackingChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<PackHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.name}-${p.depth}`,
  );

  const root: PackNode = data ?? {
    name: '生态',
    children: [
      {
        name: '前端',
        children: [
          { name: 'React', value: 40 },
          { name: 'Vue', value: 30 },
          { name: 'Angular', value: 20 },
        ],
      },
      {
        name: '后端',
        children: [
          { name: 'Node', value: 35 },
          { name: 'Java', value: 45 },
          { name: 'Go', value: 25 },
        ],
      },
      {
        name: '数据',
        children: [
          { name: 'MySQL', value: 30 },
          { name: 'Redis', value: 20 },
          { name: 'Mongo', value: 15 },
        ],
      },
    ],
  };

  const circles = useMemo(() => {
    const cx = plotWidth / 2;
    const cy = plotHeight / 2;
    const r = Math.min(cx, cy) - 16;
    const out: PackedCircle[] = [];
    packCircles(root, cx, cy, r, 0, out);
    return out;
  }, [root, plotWidth, plotHeight]);

  return (
    <>
      <Animation playbook={[...CIRCLE_PLAYBOOK]}>
        {circles.map((c, i) => {
          const color = CATEGORY_12[c.depth % CATEGORY_12.length];
          const key = `${c.name}-${c.depth}`;
          const payload: PackHoverPayload = { name: c.name, value: c.value, depth: c.depth };
          return (
            <Ellipse
              key={`circle-${key}-${i}`}
              cx={c.cx}
              cy={c.cy}
              rx={c.r}
              ry={c.r}
              fill={color}
              opacity={hoverOpacity(0.5 + c.depth * 0.1, isHovering(key))}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1.5, isHovering(key))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {circles.filter((c) => c.r > 18).map((c, i) => (
          <Text
            key={`lbl-${c.name}-${c.depth}-${i}`}
            x={c.cx}
            y={c.cy + 4}
            text={c.name}
            fontSize={Math.min(12, c.r / 3)}
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

export default CirclePackingChart;
