/**
 * useSimulation —— 通用仿真 Hook
 *
 * 提供 setInterval 定时变异 + rAF 插值过渡，驱动 ReactVizComposer 形状
 * 组件的 props 随时间持续变化。类似 useLiveData 但更通用。
 */

import { useEffect, useRef, useState } from 'react';

/**
 * 持续按间隔调度 mutate（纯函数：当前仿真态 → 下一仿真态），
 * 返回当前应渲染的数据。在两次采样间用 rAF easeOutCubic 插值平滑过渡。
 *
 * @param seed 初始种子数据
 * @param mutate 纯变换函数，接收 (prev, dt_seconds)
 * @param intervalMs 采样间隔 ms
 * @returns 当前插值后的数据
 */
export function useSimulation<T>(
  seed: T,
  mutate: (prev: T, dt: number) => T,
  intervalMs: number,
): T {
  const [data, setData] = useState(seed);

  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;

  const fromRef = useRef(seed);
  const toRef = useRef(seed);
  const animStartRef = useRef(0);
  const rafRef = useRef(0);
  const committedRef = useRef(seed);

  // 深度插值：number 做 lerp，array/object 递归
  function lerpDeep<T>(from: T, to: T, t: number): T {
    if (t <= 0) return from;
    if (t >= 1) return to;
    if (typeof from === 'number' && typeof to === 'number') {
      return (from + (to - from) * t) as T;
    }
    if (Array.isArray(from) && Array.isArray(to)) {
      return to.map((item, i) => (i >= from.length ? item : lerpDeep(from[i], item, t))) as T;
    }
    if (from !== null && to !== null && typeof from === 'object' && typeof to === 'object' && !Array.isArray(from) && !Array.isArray(to)) {
      const a = from as Record<string, unknown>;
      const b = to as Record<string, unknown>;
      const out: Record<string, unknown> = { ...b };
      for (const key of Object.keys(b)) {
        if (key in a) out[key] = lerpDeep(a[key], b[key], t);
      }
      return out as T;
    }
    return to;
  }

  function startTransition(from: T, to: T) {
    fromRef.current = from;
    toRef.current = to;
    animStartRef.current = performance.now();
    // 插值时长 = 采样间隔的 90%，留 10% 余量避免重叠
    const duration = Math.max(16, intervalMs * 0.9);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const elapsed = now - animStartRef.current;
      const raw = Math.min(1, elapsed / duration);
      const t = 1 - Math.pow(1 - raw, 3); // easeOutCubic
      setData(lerpDeep(fromRef.current, toRef.current, t));
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    committedRef.current = seed;
    setData(seed);

    const id = window.setInterval(() => {
      const dt = intervalMs / 1000;
      const next = mutateRef.current(committedRef.current, dt);
      committedRef.current = next;
      startTransition(toRef.current, next);
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [intervalMs, seed]);

  return data;
}

/**
 * 工具：产生以 baseline 为中心的随机游走值。
 * 每次调用 delta 在 [-amplitude, +amplitude] 内，但加上均值回归：
 * 偏离越大，回归力越强。
 */
export function randomWalk(
  current: number,
  baseline: number,
  amplitude: number,
  min: number,
  max: number,
  regression = 0.3,
): number {
  const drift = (Math.random() - 0.5) * 2 * amplitude;
  const pull = (baseline - current) * regression;
  const next = current + drift + pull;
  return +Math.min(max, Math.max(min, next)).toFixed(
    Math.abs(amplitude) < 1 ? 2 : 0,
  );
}

/**
 * 工具：按步长缓慢旋转一个 0~1 的相位值（用于解耦同步振荡）
 */
export function advancePhase(phase: number, speed: number): number {
  return (phase + speed) % 1;
}
