/**
 * GaugeChart —— 仪表盘
 *
 * 半圆弧轨道 + 填充弧 + 指针线 + 中心数值文本。
 * 入场后蓝色进度缓慢抖动，模拟实时波动。
 * 尺寸随机变化。
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Path, Line, Text, Ellipse } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, SEMANTIC_6, AXIS_COLOR, TEXT_COLOR } from '@react-viz-composer/components';
import { useVizFrame } from '@react-viz-composer/core';
import { useEntryProgress } from '@react-viz-composer/components';

interface Props {
  value?: number;
  min?: number;
  max?: number;
  title?: string;
}

/** 持续动画 hook：管理入场后的持续计时。必须在 EntryProgressProvider 内部调用。 */
function useSustainT(): number {
  const progress = useEntryProgress();
  const isIdle = progress >= 1;
  const [t, setT] = useState(0);
  const { requestFrame } = useVizFrame();
  const startRef = useRef(0);

  useEffect(() => {
    if (!isIdle) {
      startRef.current = 0;
      setT(0);
      return;
    }
    if (startRef.current === 0) startRef.current = performance.now();

    const tick = () => {
      setT((performance.now() - startRef.current) / 1000);
    };
    const unsub = requestFrame(tick);
    return () => { unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIdle]);

  return t;
}

export function GaugeChart(props: Props) {
  const { value = 72, min = 0, max = 100, title } = props;

  // 随机尺寸（组件生命周期内不变）
  const outerR = useMemo(() => 100 + Math.random() * 60, []);

  const cx = PLOT_WIDTH / 2;
  const cy = PLOT_HEIGHT - 30;

  const valueRatio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  return (
    <ChartFrame entryDuration={900}>
      {(progress) => (
        <GaugeInner
          cx={cx} cy={cy} outerR={outerR}
          min={min} max={max} value={value} valueRatio={valueRatio}
          progress={progress} title={title}
        />
      )}
    </ChartFrame>
  );
}

/** 内部组件：持有持续动画状态 */
function GaugeInner({
  cx, cy, outerR, min, max, value, valueRatio, progress, title,
}: {
  cx: number; cy: number; outerR: number;
  min: number; max: number; value: number; valueRatio: number;
  progress: number; title?: string;
}) {
  const sustainT = useSustainT();
  const isIdle = progress >= 1;

  const innerR = outerR * 0.7;
  const arcCenterR = (innerR + outerR) / 2;
  const startAngleDeg = 225;
  const endAngleDeg = 315;
  const totalArc = endAngleDeg - startAngleDeg;

  function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  function arcPath(r: number, fromRatio: number, toRatio: number): string {
    const fromDeg = startAngleDeg + totalArc * fromRatio;
    const toDeg = startAngleDeg + totalArc * toRatio;
    const fromRad = degToRad(fromDeg);
    const toRad = degToRad(toDeg);
    const x0 = cx + r * Math.cos(fromRad);
    const y0 = cy + r * Math.sin(fromRad);
    const x1 = cx + r * Math.cos(toRad);
    const y1 = cy + r * Math.sin(toRad);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  }

  // 空闲时的进度抖动（周期约 20 秒，缓慢柔和）
  const jitterAmplitude = 0.04;
  const jitter = isIdle
    ? Math.sin(sustainT * 0.3) * jitterAmplitude +
      Math.sin(sustainT * 0.55 + 1.5) * jitterAmplitude * 0.5
    : 0;
  const effectiveRatio = isIdle
    ? Math.max(0, Math.min(1, valueRatio + jitter))
    : animValue(valueRatio, progress);

  // 指针
  const pointerRatio = isIdle ? effectiveRatio : animValue(valueRatio, progress);
  const pointerDeg = startAngleDeg + totalArc * pointerRatio;
  const pointerRad = degToRad(pointerDeg);
  const px = cx + (innerR - 20) * Math.cos(pointerRad);
  const py = cy + (innerR - 20) * Math.sin(pointerRad);

  const displayValue = isIdle
    ? Math.round(min + effectiveRatio * (max - min))
    : Math.round(animValue(value, progress));

  return (
    <>
      {/* 轨道（灰色底） */}
      <Path
        d={arcPath(arcCenterR, 0, 1)}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth={outerR - innerR}
      />

      {/* 进度（蓝色） */}
      {effectiveRatio > 0 && (
        <Path
          d={arcPath(arcCenterR, 0, effectiveRatio)}
          fill="none"
          stroke={SEMANTIC_6[0]}
          strokeWidth={outerR - innerR}
        />
      )}

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

      {/* 指针 */}
      <Line
        points={[{ x: cx, y: cy }, { x: px, y: py }]}
        stroke={SEMANTIC_6[3]}
        strokeWidth={3}
      />

      <Ellipse cx={cx} cy={cy} rx={8} ry={8} fill={SEMANTIC_6[3]} />

      <Text
        x={cx}
        y={cy - 8}
        text={String(displayValue)}
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
  );
}

export default GaugeChart;
