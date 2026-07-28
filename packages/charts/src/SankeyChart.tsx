/**
 * SankeyChart —— 桑基图
 */

import { Rect, Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, animSize, useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps, CATEGORY_12 } from '@react-viz-composer/components';

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

export function SankeyChart(props: Props) {
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
  const colGap = maxDepth > 0 ? (PLOT_WIDTH - colW * (maxDepth + 1)) / maxDepth : 0;
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
    const startY = (PLOT_HEIGHT - totalH) / 2;
    arr.forEach((n, i) => {
      nodeY[n.name] = startY + i * (nodeH + 10);
    });
  });

  const inValue = (name: string) =>
    lks.filter((l) => l.target === name).reduce((s, l) => s + l.value, 0);
  const outValue = (name: string) =>
    lks.filter((l) => l.source === name).reduce((s, l) => s + l.value, 0);

  return (
    <ChartFrame entryDuration={900}>
      {(progress) => (
        <>
      {lks.map((l, i) => {
        const sn = ns.find((n) => n.name === l.source);
        const tn = ns.find((n) => n.name === l.target);
        if (!sn || !tn) return null;
        const sx = xOfDepth(sn.depth) + colW;
        const sy = nodeY[sn.name] + nodeH / 2;
        const tx = xOfDepth(tn.depth);
        const ty = nodeY[tn.name] + nodeH / 2;
        const mx = sx + animValue(tx - sx, progress);
        const d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
        return (
          <Path
            key={`l-${i}`}
            d={d}
            fill="none"
            stroke={CATEGORY_12[i % CATEGORY_12.length] + '60'}
            strokeWidth={Math.max(1, animValue(l.value, progress) / 5)}
          />
        );
      })}

      {ns.map((n, i) => {
        const x = xOfDepth(n.depth);
        const y = nodeY[n.name];
        const color = CATEGORY_12[i % CATEGORY_12.length];
        const payload: NodeHoverPayload = {
          ...n,
          inValue: inValue(n.name),
          outValue: outValue(n.name),
        };
        const hovered = isHovering(n.name);
        return (
          <Rect
            key={n.name}
            x={x}
            y={y}
            width={animSize(colW, progress)}
            height={animSize(nodeH, progress)}
            fill={color}
            stroke={color}
            strokeWidth={hoverStrokeWidth(1, hovered)}
            {...bindHover(payload)}
          />
        );
      })}

      {ns.map((n) => {
        const x = xOfDepth(n.depth);
        const y = nodeY[n.name];
        if (progress < 0.4) return null;
        return (
          <Text
            key={`t-${n.name}`}
            x={x + colW / 2}
            y={y + nodeH / 2 + 4}
            text={n.name}
            fontSize={11}
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

export default SankeyChart;
