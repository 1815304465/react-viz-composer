/**
 * LiquidFillChart —— 水球图 / 液态填充图
 *
 * 圆形内带波浪水面填充。中心显示百分比文字。
 */

import { useMemo } from 'react';
import { Path, Ellipse, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, SEMANTIC_6, TEXT_COLOR, animValue } from '@react-viz-composer/components';

interface Props {
  value?: number;
  max?: number;
}

export function LiquidFillChart(props: Props) {
  const max = props.max ?? 100;
  const value = props.value ?? 72;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  const cx = PLOT_WIDTH / 2;
  const cy = PLOT_HEIGHT / 2;
  const r = Math.min(cx, cy) - 20;

  return (
    <ChartFrame background="#fff" entryDuration={1200}>
      {(progress) => {
        const waterLevel = cy + r - animValue((pct / 100) * 2 * r, progress);
        const wavePhase = progress * Math.PI * 6;

        const startX = cx - r;
        const endX = cx + r;
        const bottomY = cy + r;
        const steps = 60;
        const amplitude = 10;
        const frequency = 0.04;

        // 波浪上边界
        let waveSurfaceD = '';
        for (let i = 0; i <= steps; i++) {
          const sx = startX + (endX - startX) * (i / steps);
          const waveY =
            cy +
            amplitude * Math.sin(sx * frequency + wavePhase) +
            amplitude * 0.6 * Math.sin(sx * frequency * 2.3 - wavePhase * 0.7);
          const sy = waterLevel + waveY;
          if (i === 0) waveSurfaceD = `M ${sx} ${sy}`;
          else waveSurfaceD += ` L ${sx} ${sy}`;
        }

        const fullWaterD = `${waveSurfaceD} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;

        return (
          <>
            <Ellipse
              cx={cx} cy={cy} rx={r} ry={r}
              fill="#e8f4fd"
              stroke={SEMANTIC_6[0]}
              strokeWidth={2}
            />

            {progress > 0.02 && (
              <Path d={fullWaterD} fill={SEMANTIC_6[0]} opacity={0.6} />
            )}

            {progress > 0.05 && (() => {
              const wavePhase2 = wavePhase + Math.PI / 2;
              let d2 = '';
              const amp2 = 6;
              for (let i = 0; i <= steps; i++) {
                const sx = startX + (endX - startX) * (i / steps);
                const wy =
                  cy +
                  amp2 * Math.sin(sx * frequency + wavePhase2) +
                  amp2 * 0.5 * Math.sin(sx * frequency * 2.5 - wavePhase2 * 0.6);
                const sy = waterLevel + 4 + wy;
                if (i === 0) d2 = `M ${sx} ${sy}`;
                else d2 += ` L ${sx} ${sy}`;
              }
              return (
                <Path
                  d={`${d2} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`}
                  fill={SEMANTIC_6[0]}
                  opacity={0.35}
                />
              );
            })()}

            <Ellipse cx={cx} cy={cy} rx={r} ry={r} fill="none" stroke={SEMANTIC_6[0]} strokeWidth={3} />

            {progress > 0.15 && (
              <>
                <Text
                  x={cx} y={cy - 8}
                  text={`${Math.round(pct * progress)}%`}
                  fontSize={32} fontWeight="bold"
                  fontFamily="sans-serif"
                  fill={SEMANTIC_6[0]} opacity={0.9}
                  textAlign="middle"
                />
                <Text
                  x={cx} y={cy + 22}
                  text="完成率"
                  fontSize={13}
                  fontFamily="sans-serif"
                  fill={TEXT_COLOR}
                  textAlign="middle"
                />
              </>
            )}
          </>
        );
      }}
    </ChartFrame>
  );
}

export default LiquidFillChart;
