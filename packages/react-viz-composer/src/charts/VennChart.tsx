/**
 * VennChart —— 韦恩图
 *
 * 绘制 2 个重叠圆，通过半透明填充显示交集区域。
 */

import { useMemo } from 'react';
import { Ellipse, Text } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { useChartItemHover, hoverStrokeWidth, hoverOpacity, type ChartItemHoverProps } from './shared/chartEvents';
import { CATEGORY_12, TEXT_COLOR } from './shared/palette';
import { animValue } from './shared/useEntryProgress.ts';

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

export function VennChart(props: Props) {
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

  const cx = PLOT_WIDTH / 2;
  const cy = PLOT_HEIGHT / 2;

  // 计算两个圆的位置
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
      // 近似：重叠区域越大，圆心越近
      const overlapRatio = Math.max(0, Math.min(1, overlapArea / Math.min(s0.size, s1.size)));
      const dist = (r0 + r1) * (1 - overlapRatio * 0.5);
      return [
        { cx: cx - dist / 2, cy, r: r0, setName: s0.name },
        { cx: cx + dist / 2, cy, r: r1, setName: s1.name },
      ];
    }
    // 3 circles
    const r = vennSets.map((s) => Math.sqrt(s.size / Math.PI) * 2);
    const maxR = Math.max(...r);
    const d = maxR * 1.1;
    return [
      { cx: cx, cy: cy - d / 2, r: r[0], setName: vennSets[0].name },
      { cx: cx - d * 0.7, cy: cy + d / 3, r: r[1], setName: vennSets[1].name },
      { cx: cx + d * 0.7, cy: cy + d / 3, r: r[2], setName: vennSets[2].name },
    ];
  }, [vennSets, cx, cy]);

  return (
    <ChartFrame background="#fff" entryDuration={900}>
      {(progress) => (
        <>
          {circles.map((c, i) => {
            const color = CATEGORY_12[i % CATEGORY_12.length];
            const r = animValue(c.r, progress);
            const hovered = isHovering(c.setName);
            const payload: VennHoverPayload = {
              name: c.setName,
              size: vennSets[i]?.size ?? 0,
            };
            return (
              <Ellipse
                key={c.setName}
                cx={c.cx}
                cy={c.cy}
                rx={r}
                ry={r}
                fill={color}
                opacity={hoverOpacity(0.35, hovered)}
                stroke={color}
                strokeWidth={hoverStrokeWidth(1.5, hovered)}
                {...bindHover(payload)}
              />
            );
          })}

          {/* 标签 */}
          {progress > 0.3 &&
            circles.map((c, i) => {
              const color = CATEGORY_12[i % CATEGORY_12.length];
              const label = vennLabels[i] ?? c.setName;
              return (
                <Text
                  key={`lab-${c.setName}`}
                  x={c.cx}
                  y={c.cy + 5}
                  text={label}
                  fontSize={13}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  fill={TEXT_COLOR}
                  textAlign="middle"
                />
              );
            })}
        </>
      )}
    </ChartFrame>
  );
}

export default VennChart;
