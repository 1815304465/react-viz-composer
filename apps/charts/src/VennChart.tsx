/**
 * VennChart —— 韦恩图
 */

import { useMemo } from 'react';
import { Animation, Ellipse, Text } from '@react-viz-composer/core';
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


interface VennSet {
  name: string;
  size: number;
  overlap: number[];
}

interface VennHoverPayload {
  name: string;
  size: number;
}

interface Props extends ChartItemHoverProps<VennHoverPayload> {
  sets?: VennSet[];
  labels?: string[];
}

const CIRCLE_PLAYBOOK = [
  { attribute: 'rx', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 120 },
  { attribute: 'ry', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 120 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 120, delay: 300 },
] as const;

/**
 * 韦恩图
 */
export function VennChart(props: Props) {
  return (
    <ChartFrame>
      <VennChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function VennChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { sets, labels, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p) => p.name,
  );

  const vennSets: VennSet[] = sets ?? [
    { name: '技术', size: 60, overlap: [12] },
    { name: '设计', size: 45, overlap: [12] },
  ];
  const vennLabels: string[] = labels ?? vennSets.map((s) => s.name);
  const cx = plotWidth / 2;
  const cy = plotHeight / 2;

  const circles = useMemo(() => {
    if (vennSets.length === 1) {
      return [{ cx, cy, r: Math.sqrt(vennSets[0].size / Math.PI) * 2.5, setName: vennSets[0].name }];
    }
    if (vennSets.length === 2) {
      const s0 = vennSets[0];
      const s1 = vennSets[1];
      const r0 = Math.sqrt(s0.size / Math.PI) * 2.5;
      const r1 = Math.sqrt(s1.size / Math.PI) * 2.5;
      const overlapArea = s0.overlap[0] ?? 0;
      const overlapRatio = Math.max(0, Math.min(1, overlapArea / Math.min(s0.size, s1.size)));
      const dist = (r0 + r1) * (1 - overlapRatio * 0.5);
      return [
        { cx: cx - dist / 2, cy, r: r0, setName: s0.name },
        { cx: cx + dist / 2, cy, r: r1, setName: s1.name },
      ];
    }
    const r = vennSets.map((s) => Math.sqrt(s.size / Math.PI) * 2);
    const maxR = Math.max(...r);
    const d = maxR * 1.1;
    return [
      { cx, cy: cy - d / 2, r: r[0], setName: vennSets[0].name },
      { cx: cx - d * 0.7, cy: cy + d / 3, r: r[1], setName: vennSets[1].name },
      { cx: cx + d * 0.7, cy: cy + d / 3, r: r[2], setName: vennSets[2].name },
    ];
  }, [vennSets, cx, cy]);

  return (
    <>
      <Animation playbook={[...CIRCLE_PLAYBOOK]}>
        {circles.map((c, i) => {
          const color = CATEGORY_12[i % CATEGORY_12.length];
          const payload: VennHoverPayload = {
            name: c.setName,
            size: vennSets[i]?.size ?? 0,
          };
          return (
            <Ellipse
              key={c.setName}
              cx={c.cx}
              cy={c.cy}
              rx={c.r}
              ry={c.r}
              fill={color}
              opacity={hoverOpacity(0.35, isHovering(c.setName))}
              stroke={color}
              strokeWidth={hoverStrokeWidth(1.5, isHovering(c.setName))}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {circles.map((c, i) => (
          <Text
            key={`lab-${c.setName}`}
            x={c.cx}
            y={c.cy + 5}
            text={vennLabels[i] ?? c.setName}
            fontSize={13}
            fontWeight="bold"
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="middle"
            opacity={1}
          />
        ))}
      </Animation>
    </>
  );
}


export default VennChart;
