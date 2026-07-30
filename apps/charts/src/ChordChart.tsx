/**
 * ChordChart —— 弦图
 */

import { Animation, Path, Text } from 'react-viz-composer';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  hoverOpacity,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


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

interface ChordArcData {
  name: string;
  value: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  sliceAngle: number;
}

const ARC_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 80 },
] as const;

const RIBBON_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 600, easing: 'easeOut', targets: 'children', stagger: 40, delay: 200 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 80, delay: 400 },
] as const;

/**
 * 构建弦图外圈弧路径
 */
function buildChordArcPath(
  cx: number,
  cy: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  if (endAngle <= startAngle) return '';
  const x0 = cx + outerR * Math.cos(startAngle);
  const y0 = cy + outerR * Math.sin(startAngle);
  const x1 = cx + outerR * Math.cos(endAngle);
  const y1 = cy + outerR * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x1} ${y1}`;
}

/**
 * 弦图
 */
export function ChordChart(props: Props) {
  return (
    <ChartFrame>
      <ChordChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function ChordChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { nodes: nodesProp, links: linksProp, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<ChordHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.type}-${p.name}`,
  );

  const defaultData = defaultChordData();
  const nodes = nodesProp ?? defaultData.nodes;
  const links = linksProp ?? defaultData.links;
  const total = nodes.reduce((s, n) => s + n.value, 0);
  const cx = plotWidth / 2;
  const cy = plotHeight / 2;
  const outerR = Math.min(plotWidth, plotHeight) / 2 - 30;
  const innerR = outerR * 0.55;

  let startAngle = -Math.PI / 2;
  const arcs: ChordArcData[] = nodes.map((node) => {
    const sliceAngle = (node.value / total) * Math.PI * 2;
    const arc: ChordArcData = {
      name: node.name,
      value: node.value,
      startAngle,
      endAngle: startAngle + sliceAngle,
      midAngle: startAngle + sliceAngle / 2,
      sliceAngle,
    };
    startAngle += sliceAngle;
    return arc;
  });

  return (
    <>
      <Animation playbook={[...ARC_PLAYBOOK]}>
        {arcs.map((arc, i) => {
          const hovered = isHovering(`node-${arc.name}`);
          const payload: ChordHoverPayload = { name: arc.name, value: arc.value, type: 'node' };
          return (
            <Path
              key={`arc-${arc.name}`}
              d={buildChordArcPath(cx, cy, outerR, arc.startAngle, arc.endAngle)}
              fill="none"
              stroke={CATEGORY_12[i % CATEGORY_12.length]}
              strokeWidth={innerR - 8 + 2}
              opacity={hoverOpacity(0.88, hovered)}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...RIBBON_PLAYBOOK]}>
        {links.map((link, i) => {
          const src = arcs[link.source];
          const tgt = arcs[link.target];
          if (!src || !tgt) return null;
          const color = CATEGORY_12[(link.source + link.target * 2) % CATEGORY_12.length];
          const sx = cx + outerR * 0.82 * Math.cos(src.midAngle);
          const sy = cy + outerR * 0.82 * Math.sin(src.midAngle);
          const tx = cx + outerR * 0.82 * Math.cos(tgt.midAngle);
          const ty = cy + outerR * 0.82 * Math.sin(tgt.midAngle);
          const midAngle = (src.midAngle + tgt.midAngle) / 2;
          const dist = Math.abs(src.midAngle - tgt.midAngle) > Math.PI ? outerR * 0.35 : outerR * 0.15;
          const cpx = cx + dist * Math.cos(midAngle);
          const cpy = cy + dist * Math.sin(midAngle);
          const hovered = isHovering(`link-${src.name}-${tgt.name}`);
          const payload: ChordHoverPayload = {
            name: `${src.name} → ${tgt.name}`,
            value: link.value,
            type: 'link',
          };
          return (
            <Path
              key={`ribbon-${i}`}
              d={`M ${sx} ${sy} Q ${cpx} ${cpy} ${tx} ${ty}`}
              fill="none"
              stroke={color}
              strokeWidth={Math.max(1, link.value * 0.5)}
              opacity={hoverOpacity(0.5, hovered)}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {arcs.map((arc) => {
          const labelR = (outerR + innerR) / 2;
          return (
            <Text
              key={`label-${arc.name}`}
              x={cx + labelR * Math.cos(arc.midAngle)}
              y={cy + labelR * Math.sin(arc.midAngle) + 4}
              text={arc.name}
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
