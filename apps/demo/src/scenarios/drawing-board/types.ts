/** 画板工具类型 */
export type BoardTool = 'select' | 'rect' | 'ellipse' | 'line' | 'path' | 'text';

/** 样式预设（填充/描边/透明度） */
export interface StylePreset {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

/** 默认 / 高亮 / 禁用 三套样式 */
export interface StyleTriple {
  default: StylePreset;
  highlight: StylePreset;
  disabled: StylePreset;
}

/** 元素级样式覆盖（优先级高于全局） */
export type StyleOverride = Partial<StyleTriple>;

export type ElementKind = 'rect' | 'ellipse' | 'line' | 'path' | 'text';

/** 画板元素基类 */
export interface BoardElementBase {
  id: string;
  layerId: string;
  /** 图层内 z 序，越大越靠上 */
  zIndex: number;
  type: ElementKind;
  disabled?: boolean;
  styleOverride?: StyleOverride;
  /** 拖拽平移偏移 */
  gx: number;
  gy: number;
}

export interface RectElementData extends BoardElementBase {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EllipseElementData extends BoardElementBase {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface LineElementData extends BoardElementBase {
  type: 'line';
  points: Array<{ x: number; y: number }>;
}

export interface PathElementData extends BoardElementBase {
  type: 'path';
  d: string;
}

export interface TextElementData extends BoardElementBase {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export type BoardElement =
  | RectElementData
  | EllipseElementData
  | LineElementData
  | PathElementData
  | TextElementData;

/** 图层 */
export interface BoardLayer {
  id: string;
  name: string;
  visible: boolean;
  /** 越大越靠上（类似 PS 图层面板顶部） */
  order: number;
}

/** 绘制中的临时会话 */
export interface DrawSession {
  tool: Exclude<BoardTool, 'select' | 'text'>;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  pathPoints: Array<{ x: number; y: number }>;
}

/** 文本编辑会话 */
export interface TextEditSession {
  elementId: string | null;
  worldX: number;
  worldY: number;
  value: string;
}

/** 画板显示设置 */
export interface BoardSettings {
  showGrid: boolean;
  showAxes: boolean;
  /** 全局禁用：所有元素使用禁用样式且不可交互 */
  globalDisabled: boolean;
}

/** 画板完整状态 */
export interface DrawingBoardState {
  layers: BoardLayer[];
  elements: BoardElement[];
  globalStyles: StyleTriple;
  boardSettings: BoardSettings;
  activeLayerId: string;
  activeTool: BoardTool;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  drawSession: DrawSession | null;
  textEdit: TextEditSession | null;
}

export type DrawingBoardAction =
  | { type: 'SET_TOOL'; tool: BoardTool }
  | { type: 'SELECT_ELEMENT'; id: string | null }
  | { type: 'SET_HOVER'; id: string | null }
  | { type: 'SET_ACTIVE_LAYER'; id: string }
  | { type: 'ADD_LAYER'; name?: string }
  | { type: 'TOGGLE_LAYER_VISIBLE'; id: string }
  | { type: 'REORDER_LAYER'; id: string; toIndex: number }
  | { type: 'SET_GLOBAL_STYLE'; slot: keyof StyleTriple; preset: Partial<StylePreset> }
  | { type: 'SET_BOARD_SETTING'; key: keyof BoardSettings; value: boolean }
  | { type: 'PATCH_ELEMENT_STYLE'; id: string; slot: keyof StyleTriple; preset: Partial<StylePreset> }
  | { type: 'CLEAR_ELEMENT_STYLE'; id: string; slot?: keyof StyleTriple }
  | { type: 'MOVE_ELEMENT'; id: string; dx: number; dy: number }
  | { type: 'SET_ELEMENT_DISABLED'; id: string; disabled: boolean }
  | { type: 'ADD_ELEMENT'; element: BoardElement }
  | { type: 'UPDATE_ELEMENT'; id: string; patch: Partial<BoardElement> }
  | { type: 'DELETE_ELEMENT'; id: string }
  | { type: 'START_DRAW'; session: DrawSession }
  | { type: 'UPDATE_DRAW'; x: number; y: number; pathPoint?: { x: number; y: number } }
  | { type: 'END_DRAW' }
  | { type: 'CANCEL_DRAW' }
  | { type: 'OPEN_TEXT_EDIT'; session: TextEditSession }
  | { type: 'CLOSE_TEXT_EDIT' }
  | { type: 'COMMIT_TEXT'; text: string };
