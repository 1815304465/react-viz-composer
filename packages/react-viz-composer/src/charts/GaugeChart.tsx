/**
 * GaugeChart —— 仪表盘
 *
 * 半圆弧轨道 + 填充弧 + 指针线 + 中心数值文本。
 */

import { Path, Line, Text, Ellipse } from '../shapes';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animValue } from './shared/useEntryProgress.ts';
import { SEMANTIC_6, AXIS_COLOR, TEXT_COLOR } from './shared/palette';

interface Props {
  value?: number;
  min?: number;
  max?: number;
  title?: string;
}

export function GaugeChart(props: Props) {
  const { value = 72, min = 0, max = 100, title } = props;

  const cx = PLOT_WIDTH / 2;
  const cy = PLOT_HEIGHT - 30;
  const outerR = 130;
  const innerR = outerR * 0.7;
  const startAngleDeg = 225; // 左下
  const endAngleDeg = 315;   // 右下（等价 -45）
  // 从 startAngle 顺时针到 endAngle 经过 90 度（下半圆）
  const arcRange = endAngleDeg - startAngleDeg; // = 90

  function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  const totalArc = endAngleDeg - startAngleDeg; // = 90（顺时针）
  const valueRatio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  function arcPath(r: number, fromRatio: number, toRatio: number): string {
    const fromDeg = startAngleDeg + totalArc * fromRatio;
    const toDeg = startAngleDeg + totalArc * toRatio;
    const fromRad = degToRad(fromDeg);
    const toRad = degToRad(toDeg);
    const x0 = cx + r * Math.cos(fromRad);
    const y0 = cy + r * Math.sin(fromRad);
    const x1 = cx + r * Math.cos(toRad);
    const y1 = cy + r * Math.sin(toRad);
    // SVG: sweep-flag=1 = 顺时针，从 225→315 顺时针走下半圆
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  }

  return (
    <ChartFrame entryDuration={900}>
      {(progress) => (
        <>
          {/* 轨道（灰色底） */}
          <Path
            d={arcPath(outerR, 0, 1)}
            fill="none"
            stroke="#f0f0f0"
            strokeWidth={outerR - innerR}
          />

          {/* 进度（蓝色覆盖在轨道上方） */}
          {(() => {
            const ratio = animValue(valueRatio, progress);
            if (ratio <= 0) return null;
            return (
              <Path
                d={arcPath(outerR, 0, ratio)}
                fill="none"
                stroke={SEMANTIC_6[0]}
                strokeWidth={outerR - innerR}
              />
            );
          })()}

          {/* 刻度线 */}
          {[0, 0.25, 0.5, 0.75, 1].map((r) => {
            const deg = startAngleDeg + totalArc * r;
            const rad = degToRad(deg);
            const x1 = cx + (innerR - 12) * Math.cos(rad);
            const y1 = cy + (innerR - 12) * Math.sin(rad);
            const x2 = cx + (outerR + 8) * Math.cos(rad);
            const y2 = cy + (outerR + 8) * Math.sin(rad);
            return (
              <Line
                key={`tick-${r}`}
                points={[{ x: x1, y: y1 }, { x: x2, y: y2 }]}
                stroke={AXIS_COLOR}
                strokeWidth={3}
              />
            );
          })}

          {[0, 0.25, 0.5, 0.75, 1].map((r) => {
            const deg = startAngleDeg + totalArc * r;
            const rad = degToRad(deg);
            const labelR = outerR + 22;
            const lx = cx + labelR * Math.cos(rad);
            const ly = cy + labelR * Math.sin(rad) + 4;
            const labelVal = min + (max - min) * r;
            return (
              <Text
                key={`tl-${r}`}
                x={lx}
                y={ly}
                text={String(Math.round(labelVal))}
                fontSize={11}
                fontFamily="sans-serif"
                fill={TEXT_COLOR}
                textAlign="middle"
              />
            );
          })}

          {(() => {
            const ratio = animValue(valueRatio, progress);
            const deg = startAngleDeg + totalArc * ratio;
            const rad = degToRad(deg);
            const px = cx + (innerR - 20) * Math.cos(rad);
            const py = cy + (innerR - 20) * Math.sin(rad);
            return (
              <Line
                points={[{ x: cx, y: cy }, { x: px, y: py }]}
                stroke={SEMANTIC_6[3]}
                strokeWidth={3}
              />
            );
          })()}

          <Ellipse cx={cx} cy={cy} rx={8} ry={8} fill={SEMANTIC_6[3]} />

          <Text
            x={cx}
            y={cy - 8}
            text={String(Math.round(animValue(value, progress)))}
            fontSize={28}
            fontWeight="bold"
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="middle"
          />
          <Text
            x={cx}
            y={cy + 16}
            text={`/ ${max}`}
            fontSize={12}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="middle"
          />
          {title && (
            <Text
              x={cx}
              y={cy + 36}
              text={title}
              fontSize={11}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              opacity={0.6}
              textAlign="middle"
            />
          )}
        </>
      )}
    </ChartFrame>
  );
}

export default GaugeChart;
