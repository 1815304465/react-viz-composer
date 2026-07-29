/**
 * GaugeChart —— 仪表盘
 *
 * 半圆弧轨道 + 填充弧 + 指针线 + 中心数值文本。
 * 入场后蓝色进度缓慢抖动，模拟实时波动。
 */

import { useMemo } from 'react';
import { Animation, Path, Line, Text, Ellipse } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  SEMANTIC_6,
  AXIS_COLOR,
  TEXT_COLOR,
  useChartSize,
} from './local';


interface Props {
  value?: number;
  min?: number;
  max?: number;
  title?: string;
}

const JITTER_AMPLITUDE = 0.04;

/**
 * 仪表盘
 */
export function GaugeChart(props: Props) {
  return (
    <ChartFrame>
      <GaugeChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function GaugeChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { value = 72, min = 0, max = 100, title } = props;
  const outerR = useMemo(() => 100 + Math.random() * 60, []);
  const cx = plotWidth / 2;
  const cy = plotHeight - 30;
  const valueRatio = Math.max(0, Math.min(1, (value - min) / (max - min)));

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

  function effectiveRatio(time: number): number {
    const jitter =
      Math.sin(time * 0.3) * JITTER_AMPLITUDE +
      Math.sin(time * 0.55 + 1.5) * JITTER_AMPLITUDE * 0.5;
    return Math.max(0, Math.min(1, valueRatio + jitter));
  }

  function pointerPoints(ratio: number): [{ x: number; y: number }, { x: number; y: number }] {
    const pointerDeg = startAngleDeg + totalArc * ratio;
    const pointerRad = degToRad(pointerDeg);
    const px = cx + (innerR - 20) * Math.cos(pointerRad);
    const py = cy + (innerR - 20) * Math.sin(pointerRad);
    return [{ x: cx, y: cy }, { x: px, y: py }];
  }

  return (
    <>
      <Path
        d={arcPath(arcCenterR, 0, 1)}
        fill="none"
        stroke="#f0f0f0"
        strokeWidth={outerR - innerR}
      />
      <Animation playbook={[
        {
          duration: 900,
          easing: 'easeOutCubic',
          targets: 'progress-arc',
          compute: ({ progress }: { progress: number }) => ({
            d: arcPath(arcCenterR, 0, valueRatio * progress),
          }),
          group: 0,
        },
        {
          duration: 900,
          easing: 'easeOutCubic',
          targets: 'pointer',
          compute: ({ progress }: { progress: number }) => ({
            points: pointerPoints(valueRatio * progress),
          }),
          group: 0,
        },
        {
          duration: 900,
          easing: 'easeOutCubic',
          targets: 'value-text',
          compute: ({ progress }: { progress: number }) => ({
            text: String(Math.round(min + valueRatio * progress * (max - min))),
          }),
          group: 0,
        },
        {
          sustain: true,
          targets: 'progress-arc',
          compute: ({ time }: { time: number }) => ({
            d: arcPath(arcCenterR, 0, effectiveRatio(time)),
          }),
          group: 1,
        },
        {
          sustain: true,
          targets: 'pointer',
          compute: ({ time }: { time: number }) => ({
            points: pointerPoints(effectiveRatio(time)),
          }),
          group: 1,
        },
        {
          sustain: true,
          targets: 'value-text',
          compute: ({ time }: { time: number }) => ({
            text: String(Math.round(min + effectiveRatio(time) * (max - min))),
          }),
          group: 1,
        },
      ]}>
        {valueRatio > 0 && (
          <Path
            id="progress-arc"
            d={arcPath(arcCenterR, 0, valueRatio)}
            fill="none"
            stroke={SEMANTIC_6[0]}
            strokeWidth={outerR - innerR}
          />
        )}
        <Line
          id="pointer"
          points={pointerPoints(valueRatio)}
          stroke={SEMANTIC_6[3]}
          strokeWidth={3}
        />
        <Text
          id="value-text"
          x={cx}
          y={cy - 8}
          text={String(value)}
          fontSize={28}
          fontWeight="bold"
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
        />
      </Animation>
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
      <Ellipse cx={cx} cy={cy} rx={8} ry={8} fill={SEMANTIC_6[3]} />
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
