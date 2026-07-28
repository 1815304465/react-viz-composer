import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  createElement,
  type ReactNode,
} from 'react';
import { useVizFrame } from '@react-viz-composer/core';
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

const fallbackStore = createEntryProgressStore(1);

const EntryProgressStoreContext = createContext<EntryProgressStore>(fallbackStore);

interface ProviderProps {
  children: ReactNode;
  duration?: number;
}

/**
 * 图表入场进度 Provider（须放在 ReactVizComposer 内部）
 * @param props.children 子节点
 * @param props.duration 动画时长 ms
 */
export function ChartEntryProgressProvider(props: ProviderProps) {
  const { children, duration = 900 } = props;
  const { requestFrame } = useVizFrame();
  const storeRef = useRef<EntryProgressStore | null>(null);
  const requestFrameRef = useRef(requestFrame);

  requestFrameRef.current = requestFrame;

  if (!storeRef.current) {
    storeRef.current = createEntryProgressStore(0);
  }
  const store = storeRef.current;

  useEffect(() => {
    if (store.isComplete()) return;

    store.setProgress(0);
    const start = performance.now();
    let unsub: (() => void) | null = null;

    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.max(0, Math.min(1, elapsed / duration));
      // 用 rAF 包裹 setProgress，确保在 React 渲染之外更新 store，
      // 避免 flushSync 在 lifecycle 中被 React 拒绝
      requestAnimationFrame(() => {
        store.setProgress(easeOutCubic(t));
      });
      if (t >= 1) unsub?.();
    };

    unsub = requestFrameRef.current(tick);
    return () => { unsub?.(); };
  }, [duration, store]);

  return createElement(EntryProgressStoreContext.Provider, { value: store }, children);
}

/**
 * 读取 ChartFrame 内的入场进度 0→1（完成后保持 1，不随 hover 等重渲染重置）
 */
export function useEntryProgress(): number {
  const store = useContext(EntryProgressStoreContext);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
