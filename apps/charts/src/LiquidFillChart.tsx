/**
 * LiquidFillChart —— 水球图 / 液态填充图
 *
 * 圆形内带波浪水面填充。中心显示百分比文字。
 * 入场后波浪持续循环流动，振幅呼吸式变化。
 */

import { Animation, Path, Ellipse, Text, ClipPath } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  SEMANTIC_6,
  TEXT_COLOR,
  useChartSize,
} from './local';


interface Props {
  value?: number;
  max?: number;
}

const WAVE_SPEED = 0.7;
const STEPS = 60;
const FREQUENCY = 0.04;

/**
 * 构建波浪路径
 * @param cx 圆心 x
 * @param cy 圆心 y
 * @param r 半径
 * @param pct 填充百分比 0-100
 * @param time 时间（秒），用于持续动画
 * @param fillRatio 填充比例 0-1（入场）或 1（持续）
 */
function buildWavePaths(
  cx: number,
  cy: number,
  r: number,
  pct: number,
  time: number,
  fillRatio: number,
) {
  const targetWaterH = (pct / 100) * 2 * r;
  const waterLevelOffset = fillRatio >= 1
    ? Math.sin(time * 0.3) * r * 0.015
    : 0;
  const waterLevel = cy + r - targetWaterH * fillRatio + waterLevelOffset;
  const wavePhase = fillRatio >= 1
    ? time * WAVE_SPEED * Math.PI
    : fillRatio * Math.PI * 6;
  const breatheFactor = fillRatio >= 1
    ? 1 + Math.sin(time * 0.4) * 0.4
    : 1;
  const amplitude = 10 * breatheFactor;
  const amp2Base = 6 * breatheFactor;
  const wavePhase2 = wavePhase + Math.PI / 2;
  const startX = cx - r;
  const endX = cx + r;
  const bottomY = cy + r;

  let waveSurfaceD = '';
  for (let i = 0; i <= STEPS; i++) {
    const sx = startX + (endX - startX) * (i / STEPS);
    const waveOffset =
      amplitude * Math.sin(sx * FREQUENCY + wavePhase) +
      amplitude * 0.6 * Math.sin(sx * FREQUENCY * 2.3 - wavePhase * 0.7);
    const sy = waterLevel + waveOffset;
    if (i === 0) waveSurfaceD = `M ${sx} ${sy}`;
    else waveSurfaceD += ` L ${sx} ${sy}`;
  }
  const fullWaterD = `${waveSurfaceD} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;

  let d2 = '';
  for (let i = 0; i <= STEPS; i++) {
    const sx = startX + (endX - startX) * (i / STEPS);
    const waveOffset2 =
      amp2Base * Math.sin(sx * FREQUENCY + wavePhase2) +
      amp2Base * 0.5 * Math.sin(sx * FREQUENCY * 2.5 - wavePhase2 * 0.6);
    const sy = waterLevel + 4 + waveOffset2;
    if (i === 0) d2 = `M ${sx} ${sy}`;
    else d2 += ` L ${sx} ${sy}`;
  }
  const fullWaterD2 = `${d2} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;

  return { fullWaterD, fullWaterD2, visible: fillRatio > 0.02 };
}

/**
 * 水球图
 */
export function LiquidFillChart(props: Props) {
  return (
    <ChartFrame>
      <LiquidFillChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function LiquidFillChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const max = props.max ?? 100;
  const value = props.value ?? 72;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const cx = plotWidth / 2;
  const cy = plotHeight / 2;
  const r = Math.min(cx, cy) - 20;

  return (
    <>
      <Ellipse
        cx={cx}
        cy={cy}
        rx={r}
        ry={r}
        fill="#e8f4fd"
        stroke={SEMANTIC_6[0]}
        strokeWidth={2}
      />
      <Animation playbook={[
        {
          duration: 1200,
          easing: 'easeOutCubic',
          targets: 'water',
          compute: ({ progress }: { progress: number }) => {
            const paths = buildWavePaths(cx, cy, r, pct, 0, progress);
            return { d: paths.fullWaterD, opacity: paths.visible ? 0.6 : 0 };
          },
          group: 0,
        },
        {
          duration: 1200,
          easing: 'easeOutCubic',
          targets: 'water2',
          compute: ({ progress }: { progress: number }) => {
            const paths = buildWavePaths(cx, cy, r, pct, 0, progress);
            return { d: paths.fullWaterD2, opacity: paths.visible ? 0.35 : 0 };
          },
          group: 0,
        },
        {
          duration: 1200,
          easing: 'easeOutCubic',
          targets: 'value-text',
          compute: ({ progress }: { progress: number }) => ({
            text: `${Math.round(pct * progress)}%`,
            opacity: progress < 0.15 ? 0 : 1,
          }),
          group: 0,
        },
        {
          duration: 1200,
          easing: 'easeOutCubic',
          targets: 'subtitle',
          compute: ({ progress }: { progress: number }) => ({
            opacity: progress < 0.15 ? 0 : 1,
          }),
          group: 0,
        },
        {
          sustain: true,
          targets: 'water',
          compute: ({ time }: { time: number }) => {
            const paths = buildWavePaths(cx, cy, r, pct, time, 1);
            return { d: paths.fullWaterD, opacity: paths.visible ? 0.6 : 0 };
          },
          group: 1,
        },
        {
          sustain: true,
          targets: 'water2',
          compute: ({ time }: { time: number }) => {
            const paths = buildWavePaths(cx, cy, r, pct, time, 1);
            return { d: paths.fullWaterD2, opacity: paths.visible ? 0.35 : 0 };
          },
          group: 1,
        },
      ]}>
        <ClipPath clip={<Ellipse cx={cx} cy={cy} rx={r} ry={r} />}>
          <Path
            id="water"
            d={buildWavePaths(cx, cy, r, pct, 0, 1).fullWaterD}
            fill={SEMANTIC_6[0]}
            opacity={0.6}
          />
          <Path
            id="water2"
            d={buildWavePaths(cx, cy, r, pct, 0, 1).fullWaterD2}
            fill={SEMANTIC_6[0]}
            opacity={0.35}
          />
        </ClipPath>
        <Text
          id="value-text"
          x={cx}
          y={cy - 8}
          text={`${pct}%`}
          fontSize={32}
          fontWeight="bold"
          fontFamily="sans-serif"
          fill={SEMANTIC_6[0]}
          opacity={0.9}
          textAlign="middle"
        />
        <Text
          id="subtitle"
          x={cx}
          y={cy + 22}
          text="完成率"
          fontSize={13}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
          opacity={1}
        />
      </Animation>
      <Ellipse cx={cx} cy={cy} rx={r} ry={r} fill="none" stroke={SEMANTIC_6[0]} strokeWidth={3} />
    </>
  );
}


export default LiquidFillChart;
