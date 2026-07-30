/**
 * useLiveData —— 按 Live 开关定时变异种子数据，并在两次采样间 rAF 插值过渡
 *
 * 卡顿根因：原先 setInterval 直接把新 data 塞进图表，几何瞬间跳变。
 * 入场 Animation 只在 mount 播一次，不会补间后续数据更新。
 * 这里在 demo 层把「逻辑采样」与「展示插值」分开：interval 推进目标值，
 * rAF + easeOutCubic 在本周期内滑到目标，500ms 档也会感觉连续。
 */

import { useEffect, useRef, useState } from 'react';
import { useLiveMode } from './LiveDataContext';
import { easeOutCubic, lerpDeep } from './lerpDeep';

/** 高压档（≤80ms）仍硬切，方便压测 React→引擎；更长间隔走补间 */
const SMOOTH_MIN_INTERVAL_MS = 80;

/**
 * 开启实时模式后按 interval 采样 mutate；展示层在周期内插值过渡
 * @param seed 静态种子数据（模块常量）
 * @param mutate 纯函数：上一逻辑帧 → 下一逻辑帧（基于已提交值，非插值中值）
 * @returns 当前应传入图表的数据
 */
export function useLiveData<T>(seed: T, mutate: (prev: T) => T): T {
  const { enabled, intervalMs } = useLiveMode();
  const [data, setData] = useState(seed);

  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;

  const displayRef = useRef(seed);
  const committedRef = useRef(seed);
  const fromRef = useRef(seed);
  const toRef = useRef(seed);
  const animStartRef = useRef(0);
  const animDurationRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    displayRef.current = data;
  }, [data]);

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    if (!enabled) {
      committedRef.current = seed;
      displayRef.current = seed;
      setData(seed);
      return;
    }

    committedRef.current = seed;
    displayRef.current = seed;
    setData(seed);

    const smooth = intervalMs > SMOOTH_MIN_INTERVAL_MS;

    /** 将展示值从 from 插到 to */
    function startTransition(from: T, to: T) {
      if (!smooth) {
        displayRef.current = to;
        setData(to);
        return;
      }

      fromRef.current = from;
      toRef.current = to;
      animStartRef.current = performance.now();
      // 略短于采样周期，避免与下一跳重叠撕裂
      animDurationRef.current = Math.max(60, intervalMs * 0.88);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const tick = (now: number) => {
        const elapsed = now - animStartRef.current;
        const raw = animDurationRef.current > 0 ? elapsed / animDurationRef.current : 1;
        const t = easeOutCubic(Math.min(1, raw));
        const next = lerpDeep(fromRef.current, toRef.current, t);
        displayRef.current = next;
        setData(next);

        if (raw < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = 0;
          displayRef.current = toRef.current;
          setData(toRef.current);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    }

    const id = window.setInterval(() => {
      const next = mutateRef.current(committedRef.current);
      committedRef.current = next;
      startTransition(displayRef.current, next);
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [enabled, intervalMs, seed]);

  return enabled ? data : seed;
}
