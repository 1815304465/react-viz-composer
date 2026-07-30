/**
 * SankeyChart —— 桑基图
 */

import { Animation, Rect, Path, Text } from 'react-viz-composer';
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


interface SankeyNode {
  name: string;
  depth: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface NodeHoverPayload extends SankeyNode {
  inValue: number;
  outValue: number;
}

interface Props extends ChartItemHoverProps<NodeHoverPayload> {
  nodes?: SankeyNode[];
  links?: SankeyLink[];
}

const NODE_PLAYBOOK = [
  { attribute: 'width', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
  { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 50 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 50, delay: 200 },
] as const;

/**
 * 桑基图
 */
export function SankeyChart(props: Props) {
  return (
    <ChartFrame>
      <SankeyChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function SankeyChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { nodes, links, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (n: NodeHoverPayload) => n.name,
  );

  const ns: SankeyNode[] = nodes ?? [
    { name: '太阳能', depth: 0 },
    { name: '风能', depth: 0 },
    { name: '水电', depth: 0 },
    { name: '发电', depth: 1 },
    { name: '输电', depth: 2 },
    { name: '工业用电', depth: 3 },
    { name: '居民用电', depth: 3 },
  ];
  const lks: SankeyLink[] = links ?? [
    { source: '太阳能', target: '发电', value: 30 },
    { source: '风能', target: '发电', value: 25 },
    { source: '水电', target: '发电', value: 35 },
    { source: '发电', target: '输电', value: 80 },
    { source: '输电', target: '工业用电', value: 50 },
    { source: '输电', target: '居民用电', value: 30 },
  ];

  const maxDepth = Math.max(...ns.map((n) => n.depth));
  const colW = 100;
  const colGap = maxDepth > 0 ? (plotWidth - colW * (maxDepth + 1)) / maxDepth : 0;
  const nodeH = 26;
  const xOfDepth = (d: number) => d * (colW + colGap);

  const colNodes: Record<number, SankeyNode[]> = {};
  ns.forEach((n) => {
    if (!colNodes[n.depth]) colNodes[n.depth] = [];
    colNodes[n.depth].push(n);
  });
  const nodeY: Record<string, number> = {};
  Object.keys(colNodes).forEach((dk) => {
    const depth = Number(dk);
    const arr = colNodes[depth];
    const totalH = arr.length * (nodeH + 10);
    const startY = (plotHeight - totalH) / 2;
    arr.forEach((n, i) => {
      nodeY[n.name] = startY + i * (nodeH + 10);
    });
  });

  const inValue = (name: string) =>
    lks.filter((l) => l.target === name).reduce((s, l) => s + l.value, 0);
  const outValue = (name: string) =>
    lks.filter((l) => l.source === name).reduce((s, l) => s + l.value, 0);

  return (
    <>
      {lks.map((l, i) => {
        const sn = ns.find((n) => n.name === l.source);
        const tn = ns.find((n) => n.name === l.target);
        if (!sn || !tn) return null;
        const sx = xOfDepth(sn.depth) + colW;
        const sy = nodeY[sn.name] + nodeH / 2;
        const tx = xOfDepth(tn.depth);
        const ty = nodeY[tn.name] + nodeH / 2;
        const finalD = `M ${sx} ${sy} C ${(sx + tx) / 2} ${sy}, ${(sx + tx) / 2} ${ty}, ${tx} ${ty}`;
        return (
          <Animation
            key={`l-${i}`}
            playbook={[{
              duration: 700,
              easing: 'easeOutCubic',
              targets: 'link',
              compute: ({ progress }: { progress: number }) => {
                const mx = sx + (tx - sx) * progress;
                return {
                  d: `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`,
                  strokeWidth: Math.max(1, l.value * progress / 5),
                };
              },
            }]}
          >
            <Path
              id="link"
              d={finalD}
              fill="none"
              stroke={CATEGORY_12[i % CATEGORY_12.length] + '60'}
              strokeWidth={Math.max(1, l.value / 5)}
            />
          </Animation>
        );
      })}
      <Animation playbook={[...NODE_PLAYBOOK]}>
        {ns.map((n, i) => {
          const x = xOfDepth(n.depth);
          const y = nodeY[n.name];
          const color = CATEGORY_12[i % CATEGORY_12.length];
          const payload: NodeHoverPayload = {
            ...n,
            inValue: inValue(n.name),
            outValue: outValue(n.name),
          };
          return (
            <Rect
              key={n.name}
              x={x}
              y={y}
              width={colW}
              height={nodeH}
              fill={color}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1, isHovering(n.name))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {ns.map((n) => (
          <Text
            key={`t-${n.name}`}
            x={xOfDepth(n.depth) + colW / 2}
            y={nodeY[n.name] + nodeH / 2 + 4}
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


export default SankeyChart;
