import type { StylePreset, StyleTriple, DrawingBoardState, BoardLayer, BoardSettings } from './types';
import { loadPersistedGlobalStyles, loadPersistedBoardSettings } from './storage';

/** 网格间距（世界坐标） */
export const GRID_SIZE = 20;

/** 左/右侧面板宽度 */
export const LEFT_PANEL_W = 228;
export const RIGHT_PANEL_W = 220;

/** 默认样式预设（可见填充 + 描边） */
export const DEFAULT_STYLE_PRESET: StylePreset = {
  fill: '#e6f4ff',
  stroke: '#1677ff',
  strokeWidth: 2,
  opacity: 1,
};

export const DEFAULT_HIGHLIGHT_PRESET: StylePreset = {
  fill: '#e6f4ff',
  stroke: '#0958d9',
  strokeWidth: 2.5,
  opacity: 1,
};

export const DEFAULT_DISABLED_PRESET: StylePreset = {
  fill: '#f5f5f5',
  stroke: '#bfbfbf',
  strokeWidth: 1,
  opacity: 0.45,
};

/** 全局默认三套样式 */
export const DEFAULT_GLOBAL_STYLES: StyleTriple = {
  default: { ...DEFAULT_STYLE_PRESET },
  highlight: { ...DEFAULT_HIGHLIGHT_PRESET },
  disabled: { ...DEFAULT_DISABLED_PRESET },
};

/** 初始图层 */
export const INITIAL_LAYER_ID = 'layer-1';

export function createInitialLayer(): BoardLayer {
  return {
    id: INITIAL_LAYER_ID,
    name: '图层 1',
    visible: true,
    order: 0,
  };
}

/** 画板初始状态（合并 localStorage 持久化配置） */
export function createInitialBoardState(): DrawingBoardState {
  const persistedStyles = loadPersistedGlobalStyles();
  const persistedSettings = loadPersistedBoardSettings();
  return {
    layers: [createInitialLayer()],
    elements: [],
    globalStyles: persistedStyles ?? {
      default: { ...DEFAULT_GLOBAL_STYLES.default },
      highlight: { ...DEFAULT_GLOBAL_STYLES.highlight },
      disabled: { ...DEFAULT_GLOBAL_STYLES.disabled },
    },
    boardSettings: {
      showGrid: true,
      showAxes: true,
      globalDisabled: false,
      ...persistedSettings,
    },
    activeLayerId: INITIAL_LAYER_ID,
    activeTool: 'select',
    selectedElementId: null,
    hoveredElementId: null,
    drawSession: null,
    textEdit: null,
  };
}

/** 生成唯一 id */
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** 获取图层内下一个 zIndex */
export function nextZIndexInLayer(elements: DrawingBoardState['elements'], layerId: string): number {
  const zs = elements.filter((e) => e.layerId === layerId).map((e) => e.zIndex);
  return zs.length ? Math.max(...zs) + 1 : 0;
}
