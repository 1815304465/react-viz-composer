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
}

/**
 * 批量圆点数据 —— 单节点渲染多个椭圆，适用于大规模散点
 * cx/cy 等长数组；rx/ry/fill/stroke 可为标量或等长数组
 */
export interface PointsData {
  cx: number[];
  cy: number[];
  rx?: number | number[];
  ry?: number | number[];
  fill?: string | string[];
  stroke?: string | string[];
  strokeWidth?: number | number[];
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  transform?: Transform;
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

/* ---- 裁剪（容器节点：作用于子树） ---- */

export interface ClipPathData {
  /** 裁剪形状类型 */
  shapeType: 'rect' | 'ellipse' | 'path';
  /** 裁剪形状数据 */
  shapeData: RectData | EllipseData | PathData;
  transform?: Transform;
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
}

/* ---- 滤镜（容器节点：作用于子树） ---- */

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
  effects: FilterEffect[];
  transform?: Transform;
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
}

/* ---- 遮罩（容器节点：作用于子树） ---- */

/** 遮罩模式 */
export type MaskMode = 'alpha' | 'luminance';

export interface MaskData {
  /** 遮罩形状类型 */
  shapeType: 'rect' | 'ellipse' | 'path';
  /** 遮罩形状数据 */
  shapeData: RectData | EllipseData | PathData;
  /** 遮罩模式（alpha 使用形状透明度，luminance 使用亮度值），默认 'alpha' */
  maskMode?: MaskMode;
  transform?: Transform;
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
}

/** Group 数据（事件冒泡节点，可选样式属性） */
export interface GroupData {
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
  transform?: Transform;
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
  | 'text' | 'image' | 'points'
  | 'linearGradient' | 'radialGradient' | 'clipPath' | 'filter' | 'mask'
  | 'group' | 'animation';

export type ElementData =
  | RectData | EllipseData | LineData | PathData
  | TextData | ImageData | PointsData
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
 *
 * Points 命中时内部使用 `id#index`，对外拆成 `target`（元素 id）+ `pointIndex`。
 */
export class VizEvent {
  readonly type: VizEventType;
  readonly originalEvent: MouseEvent | PointerEvent | WheelEvent;
  /** 相对于渲染容器的坐标 */
  readonly offsetX: number;
  readonly offsetY: number;

  /** 事件最初触发的元素 id（Points 命中时不含 #index） */
  target: string;
  /** 当前冒泡阶段所在的元素 id */
  currentTarget: string;
  /** Points 批量点索引；非 Points 命中时为 undefined */
  readonly pointIndex?: number;

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
    const hash = targetId.indexOf('#');
    if (hash > 0) {
      this.target = targetId.slice(0, hash);
      const idx = Number.parseInt(targetId.slice(hash + 1), 10);
      this.pointIndex = Number.isNaN(idx) ? undefined : idx;
    } else {
      this.target = targetId;
    }
    this.currentTarget = this.target;
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
  /** 本次拖拽累计偏移（元素局部坐标，已扣除视口 scale 与祖先 transform） */
  dx: number;
  dy: number;
  /** 相对上一次 drag 的单次偏移（元素局部坐标） */
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

/** 缓动名称（声明式 playbook 使用） */
export type AnimEasing =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeInElastic'
  | 'easeOutElastic';

/** transform 动画属性（写入 group/animation 的 data.transform，由渲染层合成 worldMatrix） */
export type AnimTransformAttribute = 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY';

/**
 * 形状 data 动画属性（写入目标节点 data）
 * 注意：Path 的 d 字符串 morph 请用 compute 自定义
 */
export type AnimDataAttribute =
  | 'width' | 'height' | 'opacity'
  | 'rx' | 'ry' | 'cx' | 'cy'
  | 'strokeWidth' | 'fill' | 'stroke'
  | 'fontSize'
  | 'text';

export type AnimAttribute = AnimTransformAttribute | AnimDataAttribute;

/**
 * 动画作用目标
 * - `'self'`：Animation 容器自身（transform 常用）
 * - `'children'`：直接子节点（入场/交错常用）
 * - `string` / `string[]`：指定节点 id
 */
/**
 * 动画作用目标
 * - `self`：Animation 容器自身
 * - `children`：直接子节点；穿透 clipPath / filter / mask 取到真实形状
 * - string / string[]：按元素 id 指定（与效果容器混用时推荐）
 */
export type AnimTarget = 'self' | 'children' | string | string[];

/** compute 回调上下文（引擎每帧传入，不触发 React） */
export interface AnimComputeContext {
  /** 本轮循环内进度 0→1（sustain 时恒为 0） */
  progress: number;
  /** 相对本 track 起始的已过时间 ms */
  elapsed: number;
  /** 相对本 track 起始的秒数 */
  time: number;
  /** 目标在 targets 列表中的下标 */
  index: number;
  /** 目标节点 id */
  targetId: string;
  /** 全局时间戳 ms */
  now: number;
}

/**
 * 单个动画步骤（声明意图；from/to 可省略，播放时从 SceneTree 快照补齐）
 *
 * - 属性补间：提供 `attribute`，可选 `from` / `to`
 * - 自定义：提供 `compute`（水波、呼吸等持续效果）
 * - `sustain: true`：直到 cancel 为止每帧调用 compute
 */
export interface AnimStep {
  /** 要插值的属性；与 compute 二选一（可同时省略仅当 sustain+compute） */
  attribute?: AnimAttribute;
  /** 起始值；省略则取播放瞬间目标节点当前值 */
  from?: number | string;
  /** 结束值；省略则取播放瞬间目标节点当前值（入场：只写 from，to 来自子节点 props） */
  to?: number | string;
  /** 时长 ms；sustain 时可省略 */
  duration?: number;
  /** 步骤级延迟 ms（在 stagger 之前） */
  delay?: number;
  easing?: AnimEasing;
  /** 同 group 并行，group 升序串行 */
  group?: number;
  /** true 无限循环；数字为额外循环次数（播完一轮后再循环 N 次） */
  loop?: boolean | number;
  /** 循环时往返（奇数轮 reverse） */
  yoyo?: boolean;
  /** 作用目标；默认：transform 属性 → self，其余 → children（children 穿透效果容器） */
  targets?: AnimTarget;
  /** 多目标时按 index 递增的额外延迟 ms */
  stagger?: number;
  /** 持续动画：忽略 duration 完成条件，直到 cancel */
  sustain?: boolean;
  /** 自定义每帧写入（返回 partial ElementData）；引擎直推，不经 React */
  compute?: (ctx: AnimComputeContext) => Partial<ElementData>;
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
