/**
 * SunburstChart —— 旭日图
 *
 * 环形层级可视化：将树展平为环（depth 0 = 内环 → depth N = 外环），
 * 每个节点渲染为扇形 Path（SVG arc 命令）。
 */

import { useMemo } from 'react';
import { Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps, CATEGORY_12, TEXT_COLOR } from '@react-viz-composer/components';

interface SunburstData {
  name: string;
  value: number;
  children?: SunburstData[];
}

interface SunburstArc {
  name: string;
  value: number;
  depth: number;
  startAngle: number;
  endAngle: number;
}

interface SunburstHoverPayload extends SunburstArc {
  percent: string;
}

interface Props extends ChartItemHoverProps<SunburstHoverPayload> {
  data?: SunburstData;
}

export function SunburstChart(props: Props) {
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p): string => `${p.name}-${p.depth}`,
  );

  const root: SunburstData = data ?? {
    name: '总销售',
    value: 1000,
    children: [
      {
        name: '华北', value: 350,
        children: [
          { name: '北京', value: 150 },
          { name: '天津', value: 80 },
          { name: '河北', value: 120 },
        ],
      },
      {
        name: '华东', value: 400,
        children: [
          { name: '上海', value: 180 },
          { name: '浙江', value: 130 },
          { name: '江苏', value: 90 },
        ],
      },
      {
        name: '华南', value: 250,
        children: [
          { name: '广东', value: 160 },
          { name: '福建', value: 90 },
        ],
      },
    ],
  };

  const arcs = useMemo(() => flattenToArcs(root), [root]);
  const maxDepth = Math.max(...arcs.map((a) => a.depth), 0);
  const cx = PLOT_WIDTH / 2;
  const cy = PLOT_HEIGHT / 2;
  const outerR = Math.min(cx, cy) - 20;
  const ringWidth = maxDepth > 0 ? outerR / (maxDepth + 1) : outerR;
  const totalValue = root.value;

  /** 绘制某一深度的扇形 path d */
  function arcPath(innerR: number, outerR: number, startAngle: number, endAngle: number) {
    const x0 = cx + innerR * Math.cos(startAngle);
    const y0 = cy + innerR * Math.sin(startAngle);
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x0} ${y0} Z`;
  }

  return (
    <ChartFrame background="#fff" entryDuration={900}>
      {(progress) => (
        <>
          {arcs.map((a) => {
            const innerR = a.depth * ringWidth;
            const outerR = (a.depth + 1) * ringWidth;
            const startAngle = a.startAngle * progress;
            const endAngle = a.startAngle + (a.endAngle - a.startAngle) * progress;
            if (endAngle <= startAngle) return null;
            const d = arcPath(innerR, outerR, startAngle, endAngle);
            const color = CATEGORY_12[a.depth % CATEGORY_12.length];
            const pct = ((a.value / totalValue) * 100).toFixed(0);
            const key = `${a.name}-${a.depth}`;
            const hovered = isHovering(key);
            const payload: SunburstHoverPayload = { ...a, percent: pct };
            return (
              <Path
                key={key}
                d={d}
                fill={color}
                stroke="#fff"
                strokeWidth={hoverStrokeWidth(1.2, hovered)}
                {...bindHover(payload)}
              />
            );
          })}

          {/* 中心文字 */}
          {progress > 0.3 && (
            <>
              <Text
                x={cx}
                y={cy - 8}
                text={root.name}
                fontSize={15}
                fontWeight="bold"
                fontFamily="sans-serif"
                fill={TEXT_COLOR}
                textAlign="middle"
              />
              <Text
                x={cx}
                y={cy + 14}
                text={`${totalValue}`}
                fontSize={13}
                fontFamily="sans-serif"
                fill={TEXT_COLOR}
                textAlign="middle"
              />
            </>
          )}
        </>
      )}
    </ChartFrame>
  );
}

/** 将层级数据展平为扇形列表 */
function flattenToArcs(
  node: SunburstData,
  depth = 0,
  startAngle = -Math.PI / 2,
  endAngle = (Math.PI * 3) / 2,
): SunburstArc[] {
  const total = node.value;
  const arcs: SunburstArc[] = [];

  if (node.children && node.children.length > 0) {
    let cursor = startAngle;
    node.children.forEach((child) => {
      const childAngle = (child.value / total) * (endAngle - startAngle);
      const childEnd = cursor + childAngle;
      arcs.push({
        name: child.name,
        value: child.value,
        depth,
        startAngle: cursor,
        endAngle: childEnd,
      });
      arcs.push(...flattenToArcs(child, depth + 1, cursor, childEnd));
      cursor = childEnd;
    });
  }

  return arcs;
}

export default SunburstChart;
