export interface Point {
  x: number;
  y: number;
}

/* ---- 变换 ---- */

export interface Transform {
  x?: number;
  y?: number;
  /** 旋转角度（度） */
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

/* ---- 基础形状数据 ---- */

export interface RectData {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  ry?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  transform?: Transform;
  clipPath?: string;
  filter?: string;
  mask?: string;
}

export interface EllipseData {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  transform?: Transform;
  clipPath?: string;
  filter?: string;
  mask?: string;
}

export interface LineData {
  points: Point[];
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  closed?: boolean;
  fill?: string;
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  transform?: Transform;
  clipPath?: string;
  filter?: string;
  mask?: string;
}

export interface PathData {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  transform?: Transform;
  clipPath?: string;
  filter?: string;
  mask?: string;
}

export interface TextData {
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'start' | 'middle' | 'end';
  textBaseline?: 'top' | 'middle' | 'bottom' | 'alphabetic';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  transform?: Transform;
  clipPath?: string;
  filter?: string;
  mask?: string;
}

export interface ImageData {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  preserveAspectRatio?: string;
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  transform?: Transform;
  clipPath?: string;
  filter?: string;
  mask?: string;
}

/* ---- 渐变 ---- */

export interface GradientStop {
  offset: number;
  color: string;
  opacity?: number;
}

export interface LinearGradientData {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: GradientStop[];
  /** 'userSpaceOnUse' | 'objectBoundingBox' */
  gradientUnits?: string;
}

export interface RadialGradientData {
  id: string;
  cx: number;
  cy: number;
  r: number;
  fx?: number;
  fy?: number;
  stops: GradientStop[];
  gradientUnits?: string;
}

/* ---- 裁剪 ---- */

export interface ClipPathData {
  id: string;
  /** 子形状数据的 JSON 序列化快照，供渲染器创建裁剪路径 */
  shapeType: ElementType;
  shapeData: ElementData;
}

/* ---- 滤镜 ---- */

/** 滤镜效果 —— 对标 Canvas 2D ctx.filter（CSS filter 字符串） */
export interface FilterEffect {
  /** 滤镜类型 */
  type: 'blur' | 'brightness' | 'contrast' | 'dropShadow' | 'grayscale' | 'opacity' | 'saturate' | 'sepia' | 'hueRotate';
  /** 滤镜参数 */
  value: number;
  /** dropShadow 专用参数 */
  offsetX?: number;
  offsetY?: number;
  color?: string;
}

export interface FilterData {
  id: string;
  effects: FilterEffect[];
}

/* ---- 遮罩 ---- */

/** 遮罩模式 */
export type MaskMode = 'alpha' | 'luminance';

export interface MaskData {
  id: string;
  /** 遮罩形状类型 */
  shapeType: 'rect' | 'ellipse' | 'path';
  /** 遮罩形状数据 */
  shapeData: RectData | EllipseData | PathData;
  /** 遮罩模式（alpha 使用形状透明度，luminance 使用亮度值），默认 'alpha' */
  maskMode?: MaskMode;
}

/** Group 数据（事件冒泡节点，可选样式属性） */
export interface GroupData {
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  transform?: Transform;
  filter?: string;
  mask?: string;
}

/** Animation 数据（动画容器节点） */
export interface AnimationData {
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  transform?: Transform;
}

export type ElementType =
  | 'rect' | 'ellipse' | 'line' | 'path'
  | 'text' | 'image'
  | 'linearGradient' | 'radialGradient' | 'clipPath' | 'filter' | 'mask'
  | 'group' | 'animation';

export type ElementData =
  | RectData | EllipseData | LineData | PathData
  | TextData | ImageData
  | LinearGradientData | RadialGradientData | ClipPathData
  | FilterData | MaskData
  | GroupData | AnimationData;

/* ---- 事件 ---- */

export type VizEventType =
  | 'click' | 'dblclick' | 'mousedown' | 'mouseup' | 'mousemove' | 'mouseenter' | 'mouseleave'
  | 'contextmenu' | 'wheel'
  | 'dragstart' | 'drag' | 'dragend';

/**
 * VizEvent —— 自定义合成事件对象
 *
 * 类似 React 的 SyntheticEvent，包含原生事件引用和自定义冒泡控制。
 * 事件在容器上代理执行，不依赖浏览器原生冒泡。
 */
export class VizEvent {
  readonly type: VizEventType;
  readonly originalEvent: MouseEvent | PointerEvent | WheelEvent;
  /** 相对于渲染容器的坐标 */
  readonly offsetX: number;
  readonly offsetY: number;

  /** 事件最初触发的元素 id */
  target: string;
  /** 当前冒泡阶段所在的元素 id */
  currentTarget: string;

  private _propagationStopped = false;
  private _defaultPrevented = false;

  constructor(
    type: VizEventType,
    nativeEvent: MouseEvent | PointerEvent | WheelEvent,
    targetId: string,
    offsetX: number,
    offsetY: number,
  ) {
    this.type = type;
    this.originalEvent = nativeEvent;
    this.target = targetId;
    this.currentTarget = targetId;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  /** 停止冒泡，后续父级元素的事件处理器不再执行 */
  stopPropagation(): void {
    this._propagationStopped = true;
  }

  /** 阻止原生浏览器默认行为 */
  preventDefault(): void {
    this._defaultPrevented = true;
    this.originalEvent.preventDefault();
  }

  get isPropagationStopped(): boolean {
    return this._propagationStopped;
  }

  get isDefaultPrevented(): boolean {
    return this._defaultPrevented;
  }
}

/** 新的事件处理器签名 —— 只接收 VizEvent */
export interface VizEventHandler {
  (evt: VizEvent): void;
}

/** 拖拽事件额外信息 */
export interface VizDragEvent {
  /** 本次拖拽的累计偏移（从 dragstart 开始） */
  dx: number;
  dy: number;
  /** 相对上一次 drag 事件的单次偏移 */
  stepX: number;
  stepY: number;
  originalEvent: MouseEvent;
  elementId: string;
}

export type VizDragEventHandler = (evt: VizDragEvent) => void;

/* ---- 内部存储记录（Renderer 使用） ---- */

export interface ElementRecord {
  id: string;
  type: ElementType;
  data: ElementData;
  /** 是否为脏（需要重新渲染） */
  dirty: boolean;
  /** 标记为待移除 */
  removed: boolean;
  /** 事件回调 */
  events: Partial<Record<VizEventType, VizEventHandler>>;
  /** 父元素 id，用于事件冒泡链 */
  parentId?: string;
  /** 父子引用（递归渲染用） */
  parent: ElementRecord | null;
  children: ElementRecord[];
  /** 子树结构脏（新增/删除子节点导致） */
  subtreeDirty: boolean;
  /** 世界矩阵（递归渲染时缓存，避免重算） */
  worldMatrix: Float32Array;
  /** worldMatrix 是否需要重算 */
  worldMatrixDirty: boolean;
}

/* ---- 视口 / 相机 ---- */

/** 视口配置 —— 表示画布的平移和缩放状态 */
export interface Viewport {
  /** 水平平移量（CSS 像素） */
  x: number;
  /** 垂直平移量（CSS 像素） */
  y: number;
  /** 缩放倍率，1 = 原始大小 */
  scale: number;
}

/* ---- 引擎 options ---- */

export type EngineType = 'svg' | 'canvas';

export interface ViewportCullMargin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface GraphOptions {
  engine?: EngineType;
  cullMargin?: ViewportCullMargin;
}

/* ---- Animation 类型 ---- */

export type AnimEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

/** transform 动画属性（写入 AnimationContext，由渲染层递归合成到子节点 worldMatrix） */
export type AnimTransformAttribute = 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY';

/**
 * 形状 data 动画属性（合并进 Rect/Ellipse/Path 等 data）
 * 注意：Path 的 d 字符串 morph 暂不支持
 */
export type AnimDataAttribute =
  | 'width' | 'height' | 'opacity'
  | 'rx' | 'ry' | 'cx' | 'cy'
  | 'strokeWidth' | 'fill' | 'stroke'
  | 'fontSize';

export type AnimAttribute = AnimTransformAttribute | AnimDataAttribute;

/** 单个动画步骤 */
export interface AnimStep {
  attribute: AnimAttribute;
  from: number | string;
  to: number | string;
  duration: number;
  easing?: AnimEasing;
  /** 同 group 并行，group 升序串行 */
  group?: number;
  loop?: boolean | number;
}

/** Animation 组件 ref 命令式 API */
export interface AnimationHandle {
  play: () => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
}

/* ---- 矩阵类型 ---- */

export type Mat3 = Float32Array;

/* ---- 上下文暴露给子组件的 API ---- */
// 注：新的 IVizContext（register / unregister / update）见 ../VizContext.tsx
