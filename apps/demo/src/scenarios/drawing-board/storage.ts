import type { Viewport } from 'react-viz-composer';

const STORAGE_KEY_STYLES = 'rvc-drawing-board-global-styles';
const STORAGE_KEY_SETTINGS = 'rvc-drawing-board-settings';

/** 从 localStorage 读取持久化的全局默认样式 */
export function loadPersistedGlobalStyles(): import('./types').StyleTriple | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STYLES);
    if (!raw) return null;
    return JSON.parse(raw) as import('./types').StyleTriple;
  } catch {
    return null;
  }
}

/** 持久化全局默认样式 */
export function savePersistedGlobalStyles(styles: import('./types').StyleTriple): void {
  try {
    localStorage.setItem(STORAGE_KEY_STYLES, JSON.stringify(styles));
  } catch {
    /* 忽略存储失败 */
  }
}

/** 从 localStorage 读取画板显示设置 */
export function loadPersistedBoardSettings(): import('./types').BoardSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return null;
    return JSON.parse(raw) as import('./types').BoardSettings;
  } catch {
    return null;
  }
}

/** 持久化画板显示设置 */
export function savePersistedBoardSettings(settings: import('./types').BoardSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    /* 忽略存储失败 */
  }
}

/**
 * 以屏幕点为中心缩放视口
 * @param prev 当前视口
 * @param factor 缩放倍率
 * @param pointX 屏幕 x
 * @param pointY 屏幕 y
 */
export function zoomViewportAtPoint(
  prev: Viewport,
  factor: number,
  pointX: number,
  pointY: number,
): Viewport {
  const nextScale = Math.max(0.1, Math.min(10, prev.scale * factor));
  return {
    scale: nextScale,
    x: pointX / nextScale - pointX / prev.scale + prev.x,
    y: pointY / nextScale - pointY / prev.scale + prev.y,
  };
}

/** 滚轮 deltaY → 缩放因子 */
export function wheelDeltaToZoomFactor(deltaY: number): number {
  return deltaY > 0 ? 0.9 : 1.1;
}

/**
 * 按屏幕像素偏移平移视口
 * @param prev 当前视口
 * @param deltaScreenX 屏幕 x 偏移
 * @param deltaScreenY 屏幕 y 偏移
 */
export function panViewport(
  prev: Viewport,
  deltaScreenX: number,
  deltaScreenY: number,
): Viewport {
  return {
    ...prev,
    x: prev.x + deltaScreenX / prev.scale,
    y: prev.y + deltaScreenY / prev.scale,
  };
}
