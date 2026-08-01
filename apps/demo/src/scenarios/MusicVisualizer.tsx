/**
 * MusicVisualizer —— 音乐可视化 / 音频频谱
 *
 * 使用模拟音频引擎生成伪 FFT 频谱数据，通过 ReactVizComposer
 * 底层形状组件实时渲染三个可视化层：波形、频谱柱、圆形频谱。
 * 无需麦克风权限，开箱即用。
 */

import { useMemo, useState, useCallback, useRef } from 'react';
import {
  ReactVizComposer,
  Rect,
  Ellipse,
  Line,
  Path,
  Text,
  Group,
  Points,
} from 'react-viz-composer';
import { useSimulation } from './useSimulation';

/* ==================== 类型 ==================== */

interface AudioState {
  bins: number[];
  beat: number;
  beatTimer: number;
  waveform: number[];
  progress: number;
  time: number;
}

interface Props {
  width?: number;
  height?: number;
}

/* ==================== 常量 ==================== */

const BIN_COUNT = 64;
const WAVEFORM_LEN = 128;
const SIM_INTERVAL_MS = 50;
const DEFAULT_W = 750;
const DEFAULT_H = 400;
const LOOP_DURATION = 30;

// 频率分组边界
const LOW_END = 8;
const MID_END = 32;

// 颜色 (Dark/Neon Theme)
const BG_COLOR = '#0a0e1a';
const HEADER_BG = '#060912';
const TEXT_COLOR = 'rgba(255,255,255,0.7)';
const TEXT_DIM = 'rgba(255,255,255,0.35)';
const GRID_COLOR = 'rgba(255,255,255,0.05)';
const WAVEFORM_COLOR = '#00d4ff';
const BEAT_COLOR = '#ffffff';
const BEAT_GLOW = '#00d4ff';
const PROGRESS_BAR_BG = 'rgba(255,255,255,0.08)';
const PROGRESS_BAR_FILL = '#00d4ff';
const BUTTON_BG = 'rgba(255,255,255,0.06)';
const BUTTON_HOVER = 'rgba(255,255,255,0.12)';
const BUTTON_BORDER = 'rgba(255,255,255,0.12)';

// 频段颜色渐变：低→中→高
function binColor(i: number): string {
  if (i < LOW_END) {
    const t = i / LOW_END;
    const r = Math.round(0 + t * 22);      // 0 → 22
    const g = Math.round(212 - t * 38);    // 212 → 174
    const b = Math.round(255 - t * 18);    // 255 → 237
    return `rgb(${r},${g},${b})`;
  }
  if (i < MID_END) {
    const t = (i - LOW_END) / (MID_END - LOW_END);
    const r = Math.round(22 + t * 92);     // 22 → 114
    const g = Math.round(174 - t * 128);   // 174 → 46
    const b = Math.round(237 - t * 28);    // 237 → 209
    return `rgb(${r},${g},${b})`;
  }
  const t = (i - MID_END) / (BIN_COUNT - MID_END);
  const r = Math.round(114 + t * 136);    // 114 → 250
  const g = Math.round(46 + t * 94);       // 46 → 140
  const b = Math.round(209 - t * 159);     // 209 → 50
  return `rgb(${r},${g},${b})`;
}

// 每个频段的独立相位（让频谱看起来更丰富）
function binPhase(i: number): number {
  const seeds = [
    0.0, 0.17, 0.33, 0.5, 0.67, 0.83, 0.1, 0.25,
    0.4, 0.55, 0.7, 0.85, 0.05, 0.2, 0.35, 0.5,
    0.65, 0.8, 0.95, 0.12, 0.27, 0.42, 0.57, 0.72,
    0.87, 0.02, 0.18, 0.33, 0.48, 0.63, 0.78, 0.93,
    0.08, 0.23, 0.38, 0.53, 0.68, 0.83, 0.98, 0.13,
    0.28, 0.43, 0.58, 0.73, 0.88, 0.03, 0.2, 0.35,
    0.5, 0.65, 0.8, 0.95, 0.1, 0.25, 0.4, 0.55,
    0.7, 0.85, 0.0, 0.15, 0.3, 0.45, 0.6, 0.75,
  ];
  return seeds[i % seeds.length];
}

function binFrequency(i: number): number {
  // 低频慢，高频快
  if (i < LOW_END) return 0.4 + (i / LOW_END) * 1.6;        // 0.4 → 2.0 Hz
  if (i < MID_END) return 0.6 + ((i - LOW_END) / (MID_END - LOW_END)) * 4.4;  // 0.6 → 5.0 Hz
  return 1.0 + ((i - MID_END) / (BIN_COUNT - MID_END)) * 14; // 1.0 → 15 Hz
}

/* ==================== 种子 / 突变 ==================== */

function createSeed(): AudioState {
  return {
    bins: Array.from({ length: BIN_COUNT }, () => 0.05),
    beat: 0,
    beatTimer: 0.6,
    waveform: Array.from({ length: WAVEFORM_LEN }, () => 0),
    progress: 0,
    time: 0,
  };
}

function simulateStep(state: AudioState, dt: number): AudioState {
  const time = state.time + dt;
  const beatDecay = 3;       // beat 衰减速度
  const beatBoost = 0.55;    // beat 时上涨幅度

  // 节拍计时器
  let beatTimer = state.beatTimer - dt;
  let beat = state.beat * Math.exp(-beatDecay * dt);
  let beatTriggered = false;

  if (beatTimer <= 0) {
    beatTriggered = true;
    beat = Math.min(1, beat + beatBoost);
    beatTimer = 0.5 + Math.random() * 0.3;
  }

  // 生成频谱 bins
  const bins = Array.from({ length: BIN_COUNT }, (_, i) => {
    const freq = binFrequency(i);
    const phase = binPhase(i) * Math.PI * 2;
    let value = Math.abs(Math.sin(time * freq * Math.PI * 2 + phase));

    // 低频：叠加一个更慢的包络模拟贝斯的"泵感"
    if (i < LOW_END) {
      value = value * (0.4 + 0.6 * Math.abs(Math.sin(time * 0.8 + phase)));
    }

    // 高频：更快的微变化
    if (i >= MID_END) {
      value = value * (0.5 + 0.5 * Math.abs(Math.sin(time * 3.5 + phase * 1.7)));
    }

    // 节拍瞬间全体抬升
    if (beatTriggered) {
      value = Math.min(1, value + 0.35 + Math.random() * 0.3);
    }

    // 中低频受 beat 影响更大（模拟 kick drum）
    const beatInfluence = i < LOW_END ? 0.5 : i < MID_END ? 0.25 : 0.08;
    value = Math.min(1, value + beat * beatInfluence);

    return +value.toFixed(3);
  });

  // 生成波形（IFFT 式合成：用带权正弦叠加）
  // 低频主导波形的包络，高频提供纹理
  const waveform = Array.from({ length: WAVEFORM_LEN }, (_, j) => {
    const t = j / WAVEFORM_LEN;
    let sample = 0;
    for (let k = 0; k < BIN_COUNT; k++) {
      const weight = bins[k] / (k + 1); // 低频权重大
      sample += weight * Math.sin(t * (k + 1) * Math.PI * 1.5 + binPhase(k) * Math.PI * 2 + time * 0.5);
    }
    sample = sample / 4; // 归一化
    if (beatTriggered) {
      sample += (Math.random() - 0.5) * 0.4;
    }
    return +Math.max(-1, Math.min(1, sample)).toFixed(3);
  });

  // 播放进度（循环 30s）
  const progress = ((time % LOOP_DURATION) / LOOP_DURATION);

  return {
    bins,
    beat,
    beatTimer,
    waveform,
    progress,
    time,
  };
}

/* ==================== 布局 ==================== */

interface Layout {
  headerH: number;
  pad: number;
  waveformH: number;
  waveformY: number;
  barsH: number;
  barsY: number;
  barW: number;
  barGap: number;
  barBaseY: number;
  circularCX: number;
  circularCY: number;
  circularR: number;
  progressH: number;
  progressY: number;
  btnX: number;
  btnY: number;
  btnW: number;
  btnH: number;
  titleX: number;
  titleY: number;
  trackX: number;
  trackY: number;
  bpmX: number;
  bpmY: number;
}

function computeLayout(w: number, h: number): Layout {
  const headerH = 36;
  const pad = 12;
  const progressH = 4;
  const progressY = h - progressH;
  const contentH = progressY - headerH;
  const waveformH = Math.floor(contentH * 0.28);
  const barsH = contentH - waveformH;
  const barsY = headerH;
  const waveformY = barsY + barsH;

  const barAreaW = w - pad * 2;
  const barW = Math.max(2, Math.floor((barAreaW - (BIN_COUNT - 1) * 1) / BIN_COUNT));
  const barGap = (barAreaW - barW * BIN_COUNT) / (BIN_COUNT - 1);
  const barBaseY = barsY + barsH - 10;

  // 圆形可视化放在右侧
  const circularR = Math.min(60, waveformH * 0.9, (w - pad * 2) * 0.1);
  const circularCX = w - pad - circularR - 4;
  const circularCY = waveformY + waveformH / 2;

  const btnW = 60;
  const btnH = 22;
  const btnX = w - pad - btnW;
  const btnY = Math.floor((headerH - btnH) / 2);

  const titleY = Math.floor(headerH / 2);
  const titleX = pad;
  const trackX = titleX;
  const trackY = titleY + 10;

  const bpmX = circularCX;
  const bpmY = circularCY;

  return {
    headerH, pad,
    waveformH, waveformY,
    barsH, barsY, barW, barGap, barBaseY,
    circularCX, circularCY, circularR,
    progressH, progressY,
    btnX, btnY, btnW, btnH,
    titleX, titleY, trackX, trackY,
    bpmX, bpmY,
  };
}

/* ==================== 组件 ==================== */

export function MusicVisualizer(props: Props) {
  const { width = DEFAULT_W, height = DEFAULT_H } = props;
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const layout = useMemo(() => computeLayout(width, height), [width, height]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      const next = !p;
      playingRef.current = next;
      return next;
    });
  }, []);

  const seed = useMemo(() => createSeed(), []);

  /** 非播放态冻结仿真数据 */
  function mutate(prev: AudioState, dt: number): AudioState {
    return playingRef.current ? simulateStep(prev, dt) : prev;
  }

  const state = useSimulation(seed, mutate, SIM_INTERVAL_MS);

  const {
    headerH, pad,
    waveformH, waveformY,
    barsH, barsY, barW, barGap, barBaseY,
    circularCX, circularCY, circularR,
    progressH, progressY,
    btnX, btnY, btnW, btnH,
    titleX, titleY, trackX, trackY,
    bpmX, bpmY,
  } = layout;

  // 频谱柱
  const barElements = state.bins.map((val, i) => {
    const maxBarH = barsH * 0.7;
    const barH = Math.max(1, val * maxBarH);
    const bx = pad + i * (barW + barGap);
    const by = barBaseY - barH;

    // 反射柱（下方，降低透明度）
    const reflectH = barH * 0.5;
    const reflectY = barBaseY + 2;

    return (
      <Group key={`bar-${i}`}>
        {/* 主柱 */}
        <Rect
          x={bx}
          y={by}
          width={barW}
          height={barH}
          rx={Math.min(1, barW / 2)}
          fill={binColor(i)}
          opacity={0.9}
        />
        {/* 反射 */}
        <Rect
          x={bx}
          y={reflectY}
          width={barW}
          height={reflectH}
          rx={Math.min(1, barW / 2)}
          fill={binColor(i)}
          opacity={0.18}
        />
      </Group>
    );
  });

  // 波形 Path
  const waveformPath = useMemo(() => {
    const wf = state.waveform;
    if (wf.length < 2) return '';
    const x0 = pad;
    const x1 = width - pad;
    const cy = waveformY + waveformH / 2;
    const amp = waveformH * 0.42;
    const pts = wf.map((v, i) => {
      const x = x0 + (i / (wf.length - 1)) * (x1 - x0);
      const y = cy + v * amp;
      return { x: +x.toFixed(1), y: +y.toFixed(1) };
    });

    // 用二次贝塞尔平滑
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cx = (pts[i].x + pts[i + 1].x) / 2;
      const cy = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x} ${pts[i].y} ${+cx.toFixed(1)} ${+cy.toFixed(1)}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return d;
  }, [state.waveform, pad, width, waveformY, waveformH]);

  // 波形发光（较宽的半透明描边）
  const waveformGlowPath = waveformPath;

  // 圆形可视化：从圆心向外的放射线段
  const circularSegments = state.bins.map((val, i) => {
    const angle = (i / BIN_COUNT) * Math.PI * 2 - Math.PI / 2;
    const outerR = circularR * (0.2 + val * 0.75);
    const innerR = circularR * 0.15;
    const x1 = +(circularCX + Math.cos(angle) * innerR).toFixed(1);
    const y1 = +(circularCY + Math.sin(angle) * innerR).toFixed(1);
    const x2 = +(circularCX + Math.cos(angle) * outerR).toFixed(1);
    const y2 = +(circularCY + Math.sin(angle) * outerR).toFixed(1);
    return (
      <Line
        key={`cs-${i}`}
        points={[{ x: x1, y: y1 }, { x: x2, y: y2 }]}
        stroke={binColor(i)}
        strokeWidth={1.2}
        opacity={0.85}
      />
    );
  });

  // 节拍脉冲圆
  const beatScale = 1 + state.beat * 1.8;
  const beatRX = 18 * beatScale;
  const beatRY = 18 * beatScale;
  const beatOpacity = 0.2 + state.beat * 0.6;

  // BPM 估算（基于节拍间隔）
  const bpm = Math.round(60 / (0.5 + 0.3 / 2));

  // 圆形中心背景
  const circularBgR = circularR * 0.16;

  return (
    <ReactVizComposer engine="canvas" width={width} height={height}>
      {/* ===== 背景 ===== */}
      <Rect x={0} y={0} width={width} height={height} fill={BG_COLOR} />

      {/* ===== 头部 ===== */}
      <Rect x={0} y={0} width={width} height={headerH} fill={HEADER_BG} />
      <Text
        x={titleX} y={titleY}
        text="MUSIC VISUALIZER"
        fontSize={13}
        fontWeight="bold"
        fill={TEXT_COLOR}
        textBaseline="middle"
      />
      <Text
        x={titleX} y={trackY}
        text="Track: Synthwave Dreams — Artist: Neon Pulse"
        fontSize={9}
        fill={TEXT_DIM}
      />

      {/* 播放/暂停按钮 */}
      <Rect
        x={btnX}
        y={btnY}
        width={btnW}
        height={btnH}
        rx={4}
        fill={BUTTON_BG}
        stroke={BUTTON_BORDER}
        strokeWidth={1}
        onClick={togglePlay}
      />
      <Text
        x={btnX + btnW / 2}
        y={btnY + btnH / 2}
        text={playing ? '⏸ Pause' : '▶ Play'}
        fontSize={10}
        fill={TEXT_COLOR}
        textAlign="middle"
        textBaseline="middle"
        pointerEvents="none"
      />

      {/* ===== 频谱柱 ===== */}
      {barElements}

      {/* 频谱基线的微细网格线 */}
      {[0.25, 0.5, 0.75, 1].map((r) => {
        const gy = barBaseY - (barsH * 0.7) * r;
        return (
          <Line
            key={`grid-${r}`}
            points={[
              { x: pad, y: gy },
              { x: width - pad, y: gy },
            ]}
            stroke={GRID_COLOR}
            strokeWidth={0.5}
          />
        );
      })}

      {/* ===== 波形 ===== */}
      {/* 波形发光层 */}
      {waveformPath && (
        <Path
          d={waveformGlowPath}
          fill="none"
          stroke={WAVEFORM_COLOR}
          strokeWidth={0.6}
          opacity={0.25}
        />
      )}
      {/* 波形主线 */}
      {waveformPath && (
        <Path
          d={waveformPath}
          fill="none"
          stroke={WAVEFORM_COLOR}
          strokeWidth={1.8}
        />
      )}

      {/* ===== 圆形可视化 ===== */}
      {/* 圆形背景暗圈 */}
      <Ellipse
        cx={circularCX}
        cy={circularCY}
        rx={circularR + 8}
        ry={circularR + 8}
        fill="none"
        stroke={GRID_COLOR}
        strokeWidth={1}
      />
      {/* 中心暗点 */}
      <Ellipse
        cx={circularCX}
        cy={circularCY}
        rx={circularBgR}
        ry={circularBgR}
        fill="#0a0e1a"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={0.5}
      />
      {/* 频段射线 */}
      {circularSegments}

      {/* 节拍脉冲 */}
      <Ellipse
        cx={circularCX}
        cy={circularCY}
        rx={beatRX}
        ry={beatRY}
        fill={BEAT_GLOW}
        opacity={beatOpacity}
      />
      {/* 节拍核心 */}
      <Ellipse
        cx={circularCX}
        cy={circularCY}
        rx={6}
        ry={6}
        fill={BEAT_COLOR}
        opacity={0.3 + state.beat * 0.7}
      />

      {/* BPM 文字 */}
      <Text
        x={bpmX}
        y={bpmY + circularR + 18}
        text={`${bpm} BPM`}
        fontSize={9}
        fill={TEXT_DIM}
        fontWeight="bold"
        textAlign="middle"
      />

      {/* 播放状态指示 */}
      <Text
        x={circularCX}
        y={circularCY + circularR + 32}
        text={playing ? '● LIVE' : '❚❚ PAUSED'}
        fontSize={8}
        fill={playing ? '#52c41a' : TEXT_DIM}
        textAlign="middle"
      />

      {/* ===== 进度条 ===== */}
      <Rect
        x={0}
        y={progressY}
        width={width}
        height={progressH}
        fill={PROGRESS_BAR_BG}
      />
      <Rect
        x={0}
        y={progressY}
        width={width * state.progress}
        height={progressH}
        fill={PROGRESS_BAR_FILL}
        opacity={0.7}
      />
      {/* 进度条拖动手柄 */}
      <Ellipse
        cx={width * state.progress}
        cy={progressY + progressH / 2}
        rx={4}
        ry={4}
        fill={PROGRESS_BAR_FILL}
        opacity={0.9}
      />

      {/* 时间文本 */}
      <Text
        x={width - pad}
        y={progressY - 6}
        text={formatTime(state.progress * LOOP_DURATION)}
        fontSize={9}
        fill={TEXT_DIM}
        textAlign="end"
      />
    </ReactVizComposer>
  );
}

/* ==================== 工具函数 ==================== */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default MusicVisualizer;
