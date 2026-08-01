import type {
  BoardElement,
  BoardLayer,
  DrawingBoardAction,
  DrawingBoardState,
  DrawSession,
  StylePreset,
  StyleTriple,
  StyleOverride,
} from './types';
import { createInitialBoardState, nextZIndexInLayer, uid } from './defaults';
import { normalizeEllipse, normalizeRect, pointsToPathD } from './pathUtils';

/** 合并样式：元素覆盖 > 全局 */
export function resolveElementStyle(
  element: BoardElement,
  globalStyles: StyleTriple,
  mode: keyof StyleTriple,
  globalDisabled: boolean,
): StylePreset {
  const effectiveMode = (globalDisabled || element.disabled) ? 'disabled' : mode;
  const base = globalStyles[effectiveMode];
  const override = element.styleOverride?.[effectiveMode] ?? element.styleOverride?.[mode];
  return override ? { ...base, ...override } : base;
}

function sortLayers(layers: BoardLayer[]): BoardLayer[] {
  return [...layers].sort((a, b) => a.order - b.order);
}

function reorderLayerOrders(layers: BoardLayer[]): BoardLayer[] {
  return sortLayers(layers).map((l, i) => ({ ...l, order: i }));
}

function buildElementFromDraw(
  session: DrawSession,
  layerId: string,
  zIndex: number,
): BoardElement | null {
  const { tool, startX, startY, currentX, currentY, pathPoints } = session;
  const id = uid('el');
  const base = {
    id,
    layerId,
    zIndex,
    gx: 0,
    gy: 0,
  };

  if (tool === 'rect') {
    const { x, y, width, height } = normalizeRect(startX, startY, currentX, currentY);
    if (width < 1 || height < 1) return null;
    return { ...base, type: 'rect', x, y, width, height };
  }
  if (tool === 'ellipse') {
    const { cx, cy, rx, ry } = normalizeEllipse(startX, startY, currentX, currentY);
    if (rx < 0.5 || ry < 0.5) return null;
    return { ...base, type: 'ellipse', cx, cy, rx, ry };
  }
  if (tool === 'line') {
    if (Math.hypot(currentX - startX, currentY - startY) < 1) return null;
    return {
      ...base,
      type: 'line',
      points: [{ x: startX, y: startY }, { x: currentX, y: currentY }],
    };
  }
  if (tool === 'path') {
    if (pathPoints.length < 2) return null;
    return { ...base, type: 'path', d: pointsToPathD(pathPoints) };
  }
  return null;
}

/** 合并元素样式覆盖（仅保存差异字段） */
function patchStyleOverride(
  current: StyleOverride | undefined,
  slot: keyof StyleTriple,
  patch: Partial<StylePreset>,
): StyleOverride {
  return {
    ...current,
    [slot]: { ...(current?.[slot] ?? {}), ...patch },
  };
}

export function drawingBoardReducer(state: DrawingBoardState, action: DrawingBoardAction): DrawingBoardState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool, drawSession: null };

    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.id };

    case 'SET_HOVER':
      return { ...state, hoveredElementId: action.id };

    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.id, selectedElementId: null };

    case 'ADD_LAYER': {
      const maxOrder = state.layers.reduce((m, l) => Math.max(m, l.order), -1);
      const layer: BoardLayer = {
        id: uid('layer'),
        name: action.name ?? `图层 ${state.layers.length + 1}`,
        visible: true,
        order: maxOrder + 1,
      };
      return {
        ...state,
        layers: [...state.layers, layer],
        activeLayerId: layer.id,
      };
    }

    case 'TOGGLE_LAYER_VISIBLE':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, visible: !l.visible } : l,
        ),
      };

    case 'REORDER_LAYER': {
      const sorted = sortLayers(state.layers);
      const fromIndex = sorted.findIndex((l) => l.id === action.id);
      if (fromIndex < 0) return state;
      const next = [...sorted];
      const [item] = next.splice(fromIndex, 1);
      next.splice(action.toIndex, 0, item);
      return { ...state, layers: reorderLayerOrders(next) };
    }

    case 'SET_GLOBAL_STYLE':
      return {
        ...state,
        globalStyles: {
          ...state.globalStyles,
          [action.slot]: { ...state.globalStyles[action.slot], ...action.preset },
        },
      };

    case 'SET_BOARD_SETTING':
      return {
        ...state,
        boardSettings: { ...state.boardSettings, [action.key]: action.value },
      };

    case 'PATCH_ELEMENT_STYLE':
      return {
        ...state,
        elements: state.elements.map((e) =>
          e.id === action.id
            ? { ...e, styleOverride: patchStyleOverride(e.styleOverride, action.slot, action.preset) }
            : e,
        ),
      };

    case 'CLEAR_ELEMENT_STYLE':
      return {
        ...state,
        elements: state.elements.map((e) => {
          if (e.id !== action.id) return e;
          if (!action.slot) return { ...e, styleOverride: undefined };
          const next = { ...e.styleOverride };
          delete next[action.slot];
          return { ...e, styleOverride: Object.keys(next).length ? next : undefined };
        }),
      };

    case 'SET_ELEMENT_DISABLED':
      return {
        ...state,
        elements: state.elements.map((e) =>
          e.id === action.id ? { ...e, disabled: action.disabled } : e,
        ),
      };

    case 'MOVE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map((e) =>
          e.id === action.id
            ? { ...e, gx: e.gx + action.dx, gy: e.gy + action.dy }
            : e,
        ),
      };

    case 'ADD_ELEMENT':
      return {
        ...state,
        elements: [...state.elements, action.element],
        selectedElementId: action.element.id,
      };

    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map((e) =>
          e.id === action.id ? { ...e, ...action.patch } as BoardElement : e,
        ),
      };

    case 'DELETE_ELEMENT':
      return {
        ...state,
        elements: state.elements.filter((e) => e.id !== action.id),
        selectedElementId: state.selectedElementId === action.id ? null : state.selectedElementId,
      };

    case 'START_DRAW':
      return { ...state, drawSession: action.session, selectedElementId: null };

    case 'UPDATE_DRAW':
      if (!state.drawSession) return state;
      return {
        ...state,
        drawSession: {
          ...state.drawSession,
          currentX: action.x,
          currentY: action.y,
          pathPoints: action.pathPoint
            ? [...state.drawSession.pathPoints, action.pathPoint]
            : state.drawSession.pathPoints,
        },
      };

    case 'END_DRAW': {
      if (!state.drawSession) return state;
      const zIndex = nextZIndexInLayer(state.elements, state.activeLayerId);
      const el = buildElementFromDraw(state.drawSession, state.activeLayerId, zIndex);
      return {
        ...state,
        drawSession: null,
        elements: el ? [...state.elements, el] : state.elements,
        // 保持当前绘制工具，便于连续创建；不自动切回选择
        selectedElementId: el?.id ?? state.selectedElementId,
      };
    }

    case 'CANCEL_DRAW':
      return { ...state, drawSession: null };

    case 'OPEN_TEXT_EDIT':
      return { ...state, textEdit: action.session };

    case 'CLOSE_TEXT_EDIT':
      return { ...state, textEdit: null };

    case 'COMMIT_TEXT': {
      if (!state.textEdit) return state;
      const trimmed = action.text.trim();
      if (!trimmed) {
        return state.textEdit.elementId
          ? {
              ...state,
              elements: state.elements.filter((e) => e.id !== state.textEdit!.elementId),
              textEdit: null,
              selectedElementId: null,
            }
          : { ...state, textEdit: null };
      }
      if (state.textEdit.elementId) {
        return {
          ...state,
          elements: state.elements.map((e) =>
            e.id === state.textEdit!.elementId && e.type === 'text'
              ? { ...e, text: trimmed }
              : e,
          ),
          textEdit: null,
        };
      }
      const id = uid('el');
      const zIndex = nextZIndexInLayer(state.elements, state.activeLayerId);
      const textEl: BoardElement = {
        id,
        layerId: state.activeLayerId,
        zIndex,
        type: 'text',
        x: state.textEdit.worldX,
        y: state.textEdit.worldY,
        text: trimmed,
        fontSize: 14,
        gx: 0,
        gy: 0,
      };
      return {
        ...state,
        elements: [...state.elements, textEl],
        selectedElementId: id,
        textEdit: null,
      };
    }

    default:
      return state;
  }
}

export function useDrawingBoardReducer() {
  return { initialState: createInitialBoardState(), reducer: drawingBoardReducer };
}
