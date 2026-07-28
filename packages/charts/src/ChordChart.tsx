/**
 * ChordChart —— 弦图
 *
 * 外圈弧表示各分类总量，内部贝塞尔曲线带连接源→目标。
 * 简化实现：用 Path 弧线绘外圈 + 二次贝塞尔曲线近似弦带。
 */

import { Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, animValue, useChartItemHover, hoverStrokeWidth, hoverOpacity, type ChartItemHoverProps, CATEGORY_12, TEXT_COLOR } from '@react-viz-composer/components';

interface ChordNode {
  name: string;
  value: number;
}

interface ChordLink {
  source: number;
  target: number;
  value: number;
}

interface ChordHoverPayload {
  name: string;
  value: number;
  type: 'node' | 'link';
}

interface Props extends ChartItemHoverProps<ChordHoverPayload> {
  nodes?: ChordNode[];
  links?: ChordLink[];
}

export function ChordChart(props: Props) {
  const { nodes: nodesProp, links: linksProp, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<ChordHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.type}-${p.name}`,
  );

  const defaultData = defaultChordData();
  const nodes = nodesProp ?? defaultData.nodes;
  const links = linksProp ?? defaultData.links;
  const total = nodes.reduce((s, n) => s + n.value, 0);

  const cx = PLOT_WIDTH / 2;
  const cy = PLOT_HEIGHT / 2;
  const outerR = Math.min(PLOT_WIDTH, PLOT_HEIGHT) / 2 - 30;
  const innerR = outerR * 0.55;

  return (
    <ChartFrame>
      {(progress) => {
        // 计算外圈弧
        const arcProgress = progress;
        let startAngle = -Math.PI / 2;
        const arcs = nodes.map((node) => {
          const angle = (node.value / total) * Math.PI * 2 * arcProgress;
          const endAngle = startAngle + angle;
          const arc = { ...node, startAngle, endAngle, midAngle: startAngle + angle / 2 };
          startAngle = endAngle;
          return arc;
        });

        return (
          <>
            {/* 外圈弧 */}
            {arcs.map((arc, i) => {
              if (arc.endAngle <= arc.startAngle) return null;
              const color = CATEGORY_12[i % CATEGORY_12.length];
              const x0 = cx + outerR * Math.cos(arc.startAngle);
              const y0 = cy + outerR * Math.sin(arc.startAngle);
              const x1 = cx + outerR * Math.cos(arc.endAngle);
              const y1 = cy + outerR * Math.sin(arc.endAngle);
              const largeArc = arc.endAngle - arc.startAngle > Math.PI ? 1 : 0;
              const d = `M ${x0} ${y0} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x1} ${y1}`;
              const hovered = isHovering(`node-${arc.name}`);
              const payload: ChordHoverPayload = { name: arc.name, value: arc.value, type: 'node' };
              return (
                <Path
                  key={`arc-${arc.name}`}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={animSize(innerR - 8, progress) + 2}
                  opacity={hoverOpacity(0.88, hovered)}
                  {...bindHover(payload)}
                />
              );
            })}

            {/* 弦带（简化：直线连接弧中点） */}
            {links.map((link, i) => {
              if (progress < 0.3) return null;
              const src = arcs[link.source];
              const tgt = arcs[link.target];
              if (!src || !tgt) return null;
              if (src.endAngle <= src.startAngle || tgt.endAngle <= tgt.startAngle) return null;
              const color = CATEGORY_12[(link.source + link.target * 2) % CATEGORY_12.length];

              const srcAngle = src.midAngle;
              const tgtAngle = tgt.midAngle;

              const sx = cx + outerR * 0.82 * Math.cos(srcAngle);
              const sy = cy + outerR * 0.82 * Math.sin(srcAngle);
              const tx = cx + outerR * 0.82 * Math.cos(tgtAngle);
              const ty = cy + outerR * 0.82 * Math.sin(tgtAngle);

              // 二次贝塞尔控制点：偏向圆心
              const midAngle = (srcAngle + tgtAngle) / 2;
              const dist = Math.abs(srcAngle - tgtAngle) > Math.PI
                ? outerR * 0.35
                : outerR * 0.15;
              const cpx = cx + dist * Math.cos(midAngle);
              const cpy = cy + dist * Math.sin(midAngle);

              const d = `M ${sx} ${sy} Q ${cpx} ${cpy} ${tx} ${ty}`;
              const hovered = isHovering(`link-${src.name}-${tgt.name}`);
              const payload: ChordHoverPayload = {
                name: `${src.name} → ${tgt.name}`,
                value: link.value,
                type: 'link',
              };
              return (
                <Path
                  key={`ribbon-${i}`}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={animSize(Math.max(1, link.value * 0.5), progress)}
                  opacity={hoverOpacity(0.5, hovered)}
                  {...bindHover(payload)}
                />
              );
            })}

            {/* 弧标签 */}
            {arcs.map((arc, i) => {
              if (progress < 0.5 || arc.endAngle <= arc.startAngle) return null;
              const labelR = (outerR + innerR) / 2;
              const lx = cx + labelR * Math.cos(arc.midAngle);
              const ly = cy + labelR * Math.sin(arc.midAngle);
              return (
                <Text
                  key={`label-${arc.name}`}
                  x={lx}
                  y={ly + 4}
                  text={arc.name}
                  fontSize={10}
                  fontFamily="sans-serif"
                  fill={TEXT_COLOR}
                  textAlign="middle"
                />
              );
            })}
          </>
        );
      }}
    </ChartFrame>
  );
}

function defaultChordData(): { nodes: ChordNode[]; links: ChordLink[] } {
  return {
    nodes: [
      { name: '北京', value: 28 },
      { name: '上海', value: 32 },
      { name: '广州', value: 20 },
      { name: '深圳', value: 18 },
      { name: '杭州', value: 14 },
    ],
    links: [
      { source: 0, target: 1, value: 12 },
      { source: 0, target: 2, value: 8 },
      { source: 1, target: 3, value: 10 },
      { source: 2, target: 3, value: 6 },
      { source: 1, target: 4, value: 5 },
      { source: 3, target: 4, value: 4 },
    ],
  };
}

export default ChordChart;
