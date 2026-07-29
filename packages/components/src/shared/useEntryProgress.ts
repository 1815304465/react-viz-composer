import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  createElement,
  type ReactNode,
} from 'react';
import { useViz, useVizFrame } from '@react-viz-composer/core';
import type { ElementData } from '@react-viz-composer/core';
import { easeOutCubic } from '@react-viz-composer/utilities';

/** 入场进度外部 store */
export interface EntryProgressStore {
  getSnapshot: () => number;
  subscribe: (listener: () => void) => () => void;
  setProgress: (value: number) => void;
  isComplete: () => boolean;
}

/**
 * 创建进度 store
 * @param initial 初始进度
 */
export function createEntryProgressStore(initial = 0): EntryProgressStore {
  let progress = initial;
  let complete = initial >= 1;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => progress,
    isComplete: () => complete,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setProgress: (value) => {
      const next = Math.max(0, Math.min(1, value));
      if (next === progress) return;
      progress = next;
      if (next >= 1) complete = true;
      listeners.forEach((listener) => listener());
    },
  };
}

/**
 * EntryAnimationRegistry —— 动画注册中心
 *
 * 允许子节点注册自己的动画计算函数，Provider 在引擎 rAF 里统一 tick，
 * 直接通过 useViz().update() 推数据到 SceneTree，完全不走 React state。
 */
export class EntryAnimationRegistry {
  private items = new Map<string, (progress: number) => Partial<ElementData>>();

  /** 注册一个动画计算函数 */
  register(id: string, compute: (progress: number) => Partial<ElementData>): void {
    this.items.set(id, compute);
  }

  /** 注销 */
  unregister(id: string): void {
    this.items.delete(id);
  }

  /**
   * 遍历所有注册项，调用 compute(progress) 得到 partial data，
   * 通过 updateFn 推入 SceneTree
   */
  tick(progress: number, updateFn: (id: string, partial: { data?: Partial<ElementData> }) => void): void {
    for (const [id, compute] of this.items) {
      const partial = compute(progress);
      updateFn(id, { data: partial });
    }
  }

  /** 当前注册数量 */
  get size(): number {
    return this.items.size;
  }
}

/** Context 值类型：同时包含 store（废弃）和 registry（新） */
interface EntryProgressContextValue {
  store: EntryProgressStore;
  registry: EntryAnimationRegistry;
}

const fallbackStore = createEntryProgressStore(1);
const fallbackRegistry = new EntryAnimationRegistry();
const fallbackContext: EntryProgressContextValue = {
  store: fallbackStore,
  registry: fallbackRegistry,
};

const EntryProgressContext = createContext<EntryProgressContextValue>(fallbackContext);

interface ProviderProps {
  children: ReactNode;
  duration?: number;
}

/**
 * 图表入场进度 Provider（须放在 ReactVizComposer 内部）
 *
 * 两条路径同时工作：
 * 1. store.setProgress → useSyncExternalStore → React 重渲染（兼容现有图表）
 * 2. registry.tick → 直接 useViz().update() 推数据（新路径，无 React 重渲染开销）
 *
 * @param props.children 子节点
 * @param props.duration 动画时长 ms
 */
export function ChartEntryProgressProvider(props: ProviderProps) {
  const { children, duration = 900 } = props;
  const { requestFrame } = useVizFrame();
  const { update } = useViz();
  const storeRef = useRef<EntryProgressStore | null>(null);
  const registryRef = useRef<EntryAnimationRegistry | null>(null);
  const requestFrameRef = useRef(requestFrame);
  const updateRef = useRef(update);

  requestFrameRef.current = requestFrame;
  updateRef.current = update;

  if (!storeRef.current) {
    storeRef.current = createEntryProgressStore(0);
  }
  if (!registryRef.current) {
    registryRef.current = new EntryAnimationRegistry();
  }
  const store = storeRef.current;
  const registry = registryRef.current;

  useEffect(() => {
    if (store.isComplete()) return;

    store.setProgress(0);
    const start = performance.now();
    let unsub: (() => void) | null = null;

    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.max(0, Math.min(1, elapsed / duration));
      const eased = easeOutCubic(t);
      // store 路径：触发 useSyncExternalStore → React 重渲染（兼容现有图表）
      store.setProgress(eased);
      // registry 路径：直接推数据到 SceneTree（无 React 重渲染）
      registry.tick(eased, (id, partial) => updateRef.current(id, partial));
      if (t >= 1) unsub?.();
    };

    unsub = requestFrameRef.current(tick);
    return () => { unsub?.(); };
  }, [duration, store, registry]);

  const value: EntryProgressContextValue = { store, registry };
  return createElement(EntryProgressContext.Provider, { value }, children);
}

/**
 * @deprecated 读取 ChartFrame 内的入场进度 0→1（完成后保持 1）
 * 此 API 会触发每帧 React 重渲染，新图表推荐使用 useEntryAnimation
 */
export function useEntryProgress(): number {
  const { store } = useContext(EntryProgressContext);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/**
 * 注册入场动画
 *
 * 子节点在 mount 时注册自己的动画计算函数，Provider 在引擎 rAF 里统一 tick，
 * 直接通过 useViz().update() 推数据到 SceneTree，完全不走 React state。
 *
 * @param id 节点的唯一 id（通常是 shape 的 id）
 * @param compute 动画计算函数，接收 progress (0→1)，返回 Partial<ElementData>
 *
 * @example
 * useEntryAnimation(id, (progress) => ({
 *   y: PLOT_HEIGHT - fullHeight * progress,
 *   height: fullHeight * progress,
 * }));
 */
export function useEntryAnimation(
  id: string,
  compute: (progress: number) => Partial<ElementData>,
): void {
  const { registry } = useContext(EntryProgressContext);
  const computeRef = useRef(compute);
  computeRef.current = compute;

  useEffect(() => {
    // 用 ref 包装 compute，避免 compute 引用变化导致反复 register/unregister
    const wrappedCompute = (progress: number) => computeRef.current(progress);
    registry.register(id, wrappedCompute);
    return () => {
      registry.unregister(id);
    };
    // registry 和 id 稳定，effect 只在 mount/unmount 或 id 变化时执行
  }, [id, registry]);
}
