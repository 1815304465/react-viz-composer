/**
 * ParticleFlow —— 粒子流动系统（物理仿真版）
 *
 * 使用实时物理引擎驱动粒子运动：每个粒子具有位置/速度/加速度，
 * 由流场方向力 + 随机布朗噪声 + 边界约束驱动。
 * 通过 useSimulation Hook 推进物理步进，rAF 插值渲染。
 */

import { useMemo } from 'react';
import {
  ReactVizComposer,
  Rect,
  Ellipse,
  Path,
  Text,
  Group,
} from 'react-viz-composer';
import { useSimulation } from './useSimulation';

/* ==================== 物理引擎 ==================== */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  /** 所属流道的归一化进度（0→1） */
  t: number;
  /** 独立的速度倍率（每个粒子不同，避免同步） */
  speedMult: number;
}

interface FlowChannel {
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  p3: { x: number; y: number };
  color: string;
  particleCount: number;
}

interface SimulationState {
  particles: Particle[];
  time: number;
}

/* ==================== 贝塞尔 ==================== */

function bezierPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function bezierTangent(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
): { x: number; y: number } {
  const u = 1 - t;
  const x = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const y = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len };
}

function bezierPathStr(p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): string {
  return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
}

/* ==================== 参数 ==================== */

const WIDTH = 700;
const HEIGHT = 400;

const CHANNELS: FlowChannel[] = [
  { p0: { x: 40, y: 110 }, p1: { x: 180, y: 30 },  p2: { x: 450, y: 190 }, p3: { x: WIDTH - 40, y: 110 }, color: '#1677ff', particleCount: 16 },
  { p0: { x: 40, y: 200 }, p1: { x: 220, y: 310 }, p2: { x: 400, y: 80 },  p3: { x: WIDTH - 40, y: 200 }, color: '#52c41a', particleCount: 12 },
  { p0: { x: 40, y: 280 }, p1: { x: 150, y: 190 }, p2: { x: 520, y: 360 }, p3: { x: WIDTH - 40, y: 280 }, color: '#fa8c16', particleCount: 10 },
  { p0: { x: 40, y: 70 },  p1: { x: 280, y: 360 }, p2: { x: 350, y: 40 },  p3: { x: WIDTH - 40, y: 70 },  color: '#722ed1', particleCount: 8 },
];

const TOTAL_PARTICLES = CHANNELS.reduce((s, c) => s + c.particleCount, 0);
const SIM_INTERVAL_MS = 80;

// 物理常量（已调慢）
const BASE_SPEED = 0.008;       // 归一化速度（比原来慢 3 倍）
const FLOW_FORCE = 0.15;        // 流向力强度
const TANGENT_FORCE = 25;       // 切线推力
const NOISE_STRENGTH = 2;       // 布朗噪声（降低）
const VELOCITY_DECAY = 0.96;    // 速度保持（更平滑）
const MAX_SPEED = 80;           // 速度上限（降低）

/* ==================== 种子 ==================== */

function createSeed(): SimulationState {
  const particles: Particle[] = [];
  for (const ch of CHANNELS) {
    for (let i = 0; i < ch.particleCount; i++) {
      particles.push({
        x: ch.p0.x,
        y: ch.p0.y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        mass: 0.5 + Math.random() * 0.8,
        t: Math.random(),              // 随机初始位置，避免同步
        speedMult: 0.6 + Math.random() * 0.8, // 每颗粒子速度不同
      });
    }
  }
  return { particles, time: 0 };
}

/* ==================== 物理步进 ==================== */

function simulateStep(state: SimulationState, dt: number): SimulationState {
  const scaledDt = dt * 8; // 将 dt 映射到合理范围

  const newParticles = state.particles.map((p, idx) => {
    // 确定流道
    let acc = 0;
    let channelIdx = 0;
    for (let ci = 0; ci < CHANNELS.length; ci++) {
      acc += CHANNELS[ci].particleCount;
      if (idx < acc) { channelIdx = ci; break; }
    }
    const ch = CHANNELS[channelIdx];

    // 推进进度
    let t = p.t + BASE_SPEED * p.speedMult * scaledDt;
    if (t > 1) t -= 1;

    // 目标点与切线
    const target = bezierPoint(t, ch.p0, ch.p1, ch.p2, ch.p3);
    const tan = bezierTangent(t, ch.p0, ch.p1, ch.p2, ch.p3);

    // 合成力
    const fx = (target.x - p.x) * FLOW_FORCE + tan.x * BASE_SPEED * p.speedMult * TANGENT_FORCE;
    const fy = (target.y - p.y) * FLOW_FORCE + tan.y * BASE_SPEED * p.speedMult * TANGENT_FORCE;

    // 布朗噪声
    const nx = (Math.random() - 0.5) * NOISE_STRENGTH;
    const ny = (Math.random() - 0.5) * NOISE_STRENGTH;

    // 半隐式 Euler 积分
    let vx = (p.vx + fx * scaledDt + nx) * VELOCITY_DECAY;
    let vy = (p.vy + fy * scaledDt + ny) * VELOCITY_DECAY;

    // 限速
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > MAX_SPEED) {
      vx = (vx / speed) * MAX_SPEED;
      vy = (vy / speed) * MAX_SPEED;
    }

    let x = +((p.x + vx * scaledDt)).toFixed(1);
    let y = +((p.y + vy * scaledDt)).toFixed(1);

    // 边界反弹
    const margin = 12;
    if (x < margin) { x = margin; vx *= -0.3; }
    if (x > WIDTH - margin) { x = WIDTH - margin; vx *= -0.3; }
    if (y < margin) { y = margin; vy *= -0.3; }
    if (y > HEIGHT - margin) { y = HEIGHT - margin; vy *= -0.3; }

    return { x, y, vx, vy, mass: p.mass, t, speedMult: p.speedMult };
  });

  return { ...state, particles: newParticles, time: state.time + dt };
}

/* ==================== 组件 ==================== */

interface Props { width?: number; height?: number; }

export function ParticleFlow({ width = WIDTH, height = HEIGHT }: Props) {
  const seed = useMemo(() => createSeed(), []);
  const state = useSimulation(seed, simulateStep, SIM_INTERVAL_MS);

  const trackPaths = useMemo(
    () => CHANNELS.map((ch) => bezierPathStr(ch.p0, ch.p1, ch.p2, ch.p3)),
    [],
  );

  return (
    <ReactVizComposer engine="canvas" width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill="#0a0e27" />

      <Text x={width / 2} y={22} text="物理粒子流仿真" fontSize={15} fontWeight="bold" fill="rgba(255,255,255,0.85)" textAlign="middle" />
      <Text x={width / 2} y={40} text={`${TOTAL_PARTICLES} 粒子 · ${CHANNELS.length} 流道 · 物理引擎驱动`} fontSize={9} fill="rgba(255,255,255,0.35)" textAlign="middle" />

      {/* 轨迹线 */}
      {CHANNELS.map((ch, i) => (
        <Path key={`track-${i}`} d={trackPaths[i]} fill="none" stroke={ch.color} strokeWidth={1} opacity={0.1} />
      ))}

      {/* 端点 */}
      <Ellipse cx={40} cy={110} rx={7} ry={7} fill="#1677ff" opacity={0.4} />
      <Ellipse cx={40} cy={200} rx={7} ry={7} fill="#52c41a" opacity={0.4} />
      <Ellipse cx={40} cy={280} rx={7} ry={7} fill="#fa8c16" opacity={0.4} />
      <Ellipse cx={40} cy={70} rx={7} ry={7} fill="#722ed1" opacity={0.4} />
      <Ellipse cx={WIDTH - 40} cy={110} rx={9} ry={9} fill="none" stroke="#1677ff" strokeWidth={2} opacity={0.2} />
      <Ellipse cx={WIDTH - 40} cy={200} rx={9} ry={9} fill="none" stroke="#52c41a" strokeWidth={2} opacity={0.2} />
      <Ellipse cx={WIDTH - 40} cy={280} rx={9} ry={9} fill="none" stroke="#fa8c16" strokeWidth={2} opacity={0.2} />
      <Ellipse cx={WIDTH - 40} cy={70} rx={9} ry={9} fill="none" stroke="#722ed1" strokeWidth={2} opacity={0.2} />

      <Text x={40} y={95} text="源集群" fontSize={8} fill="rgba(255,255,255,0.2)" textAlign="middle" />
      <Text x={WIDTH - 40} y={95} text="目标" fontSize={8} fill="rgba(255,255,255,0.2)" textAlign="middle" />

      {/* 粒子 */}
      {state.particles.map((p, i) => {
        let channelIdx = 0;
        let acc = 0;
        for (let ci = 0; ci < CHANNELS.length; ci++) {
          acc += CHANNELS[ci].particleCount;
          if (i < acc) { channelIdx = ci; break; }
        }
        const color = CHANNELS[channelIdx].color;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const alpha = 0.25 + Math.min(0.5, speed / MAX_SPEED * 0.5);
        const r = 1.5 + p.mass * 1.5;

        return <Ellipse key={`p-${i}`} cx={p.x} cy={p.y} rx={r} ry={r} fill={color} opacity={+alpha.toFixed(2)} />;
      })}

      {/* 图例 */}
      <Group x={width - 220} y={height - 28}>
        {CHANNELS.map((ch, i) => (
          <Group key={i} x={i * 52}>
            <Rect x={0} y={2} width={6} height={6} rx={2} fill={ch.color} opacity={0.8} />
            <Text x={10} y={7} text={`流 ${i + 1}`} fontSize={8} fill="rgba(255,255,255,0.3)" />
          </Group>
        ))}
      </Group>
    </ReactVizComposer>
  );
}

export default ParticleFlow;
