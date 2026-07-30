/**
 * 实时数据模拟 Context —— 控制 demo 是否持续推送模拟数据做压测
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** 实时模拟配置 */
export interface LiveDataConfig {
  /** 是否开启持续模拟 */
  enabled: boolean;
  /** 刷新间隔（ms） */
  intervalMs: number;
  /** 开启 / 关闭 */
  setEnabled: (enabled: boolean) => void;
  /** 设置刷新间隔 */
  setIntervalMs: (ms: number) => void;
}

const DEFAULT_INTERVAL_MS = 200;

const LiveDataContext = createContext<LiveDataConfig | null>(null);

/**
 * 提供实时模拟开关与刷新间隔
 * @param props.children 子树
 */
export function LiveDataProvider(props: { children: ReactNode }) {
  const { children } = props;

  const [enabled, setEnabled] = useState(false);
  const [intervalMs, setIntervalMsState] = useState(DEFAULT_INTERVAL_MS);

  const setIntervalMs = useCallback((ms: number) => {
    setIntervalMsState(Math.max(16, Math.round(ms)));
  }, []);

  const value = useMemo(
    () => ({ enabled, intervalMs, setEnabled, setIntervalMs }),
    [enabled, intervalMs, setIntervalMs],
  );

  return (
    <LiveDataContext.Provider value={value}>
      {children}
    </LiveDataContext.Provider>
  );
}

/**
 * 读取实时模拟配置；未包 Provider 时返回关闭态
 */
export function useLiveMode(): LiveDataConfig {
  const ctx = useContext(LiveDataContext);
  if (!ctx) {
    return {
      enabled: false,
      intervalMs: DEFAULT_INTERVAL_MS,
      setEnabled: () => {},
      setIntervalMs: () => {},
    };
  }
  return ctx;
}
