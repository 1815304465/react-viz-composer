import type { Model } from '../Model';
import { VizEvent } from '../types';
import type {
  VizEventType, VizEventHandler, ElementRecord, RectData, EllipseData, LineData, PathData, TextData, ImageData, PointsData,
  ClipPathData, MaskData, Viewport,
} from '../types';
import { Path2DCache } from '../utils/pathCache';
import { isElementVisible, isPointerEventsEnabled } from '../utils/elements';
import { pointToSegmentDist, worldToLocalPoint } from '../utils/maths';
import { IDENTITY_MAT3, type Mat3 } from '../utils/constants/matrix';
import { SpatialIndex } from '../utils/spatialIndex';
import { hitTestPoints } from '../utils/points';

/** 容器级绑定的 pointer 事件类型列表（不含 click/dblclick，它们由 pointer 事件自动触发） */
const BOUND_POINTER_EVENTS: string[] = [
  'pointerdown',
  'pointerup',
  'pointermove',
  'click',
  'dblclick',
  'contextmenu',
];

/** 原生事件 → PointerEvent 的宽松类型 */
type NativePointerLike = MouseEvent | PointerEvent | WheelEvent;

/**
 * EventSystem —— 自定义合成事件系统
 *
 * 统一处理 SVG 和 Canvas 两种渲染器的事件分发：
 * - SVG：DOM elementFromPoint + pointer-events 属性命中
 * - Canvas：几何命中检测 + Path2D isPointInPath/isPointInStroke
 * - 支持 hover（mouseenter/mouseleave/mousemove）跟踪
 * - 支持 mouseenter/mouseleave 冒泡路径事件分发
 * - 支持滚轮缩放 + 鼠标拖拽平移（空白区域左键 / 中键）
 */
class EventSystem {
  private model: Model;
  private svgEl: SVGSVGElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;

  private svgElementMap: Map<string, SVGElement> = new Map();
  private canvasElements: ElementRecord[] = [];
  private viewport: Viewport = { x: 0, y: 0, scale: 1 };

  private boundContainer: Element | null = null;
  private boundListeners: Map<string, (e: Event) => void> = new Map();
  private lastHoverTarget: string | null = null;
  private wheelHandler: ((evt: VizEvent) => void) | null = null;
  private panHandler: ((deltaScreenX: number, deltaScreenY: number) => void) | null = null;
  /** 根事件处理器：当命中检测未命中任何子元素时调用，用于根组件事件透传 */
  private rootEventHandler: Partial<Record<VizEventType, VizEventHandler>> = {};
  private isPanning = false;
  private panPointerId = -1;
  private panLastClientX = 0;
  private panLastClientY = 0;

  private hitCtx: CanvasRenderingContext2D;
  private pathCache = new Path2DCache(512);
  private spatialIndex = new SpatialIndex(64);

  constructor(model: Model) {
    this.model = model;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('EventSystem: failed to create hit-test 2D context');
    this.hitCtx = ctx;
  }

  /** 绑定 SVG 渲染器的事件处理 */
  attachSVG(svg: SVGSVGElement): void {
    this.svgEl = svg;
    this.canvasEl = null;
    this.bindContainer(svg);
  }

  /** 绑定 Canvas 渲染器的事件处理 */
  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvasEl = canvas;
    this.svgEl = null;
    this.bindContainer(canvas);
  }

  /** 注册 SVG 元素到命中映射表 */
  registerSVGElement(id: string, el: SVGElement): void {
    this.svgElementMap.set(id, el);
    el.setAttribute('data-viz-id', id);
  }

  /** 从命中映射表中移除 SVG 元素 */
  unregisterSVGElement(id: string): void {
    this.svgElementMap.delete(id);
  }

  /**
   * 同步 Canvas 渲染模式下的元素列表（用于逆序命中检测）
   * 入参顺序须与绘制一致（CanvasRenderer DFS + 兄弟 zIndex），此处不再全局 sort，
   * 避免深层高 zIndex 子节点压过祖先兄弟的后绘制者。
   * 排除 defs / 效果容器 / 结构容器（group/animation）：
   * group 不做实心 AABB 命中，避免挡住镂空区域；事件仍可经子形状冒泡到 group
   * @param elements 可命中元素列表（绘制顺序）
   * @param visible 视口裁剪区域（世界坐标），null 表示不过滤
   */
  syncCanvasElements(
    elements: ElementRecord[],
    visible: { x: number; y: number; w: number; h: number } | null = null,
  ): void {
    this.canvasElements = elements.filter(
      (e) => !e.removed
        && e.type !== 'linearGradient' && e.type !== 'radialGradient'
        && e.type !== 'clipPath' && e.type !== 'filter' && e.type !== 'mask'
        && e.type !== 'group' && e.type !== 'animation',
    );
    this.spatialIndex.rebuild(this.canvasElements, visible);
  }

  /** 设置当前视口状态 */
  setViewport(v: Viewport): void {
    this.viewport = { ...v };
  }

  /** 注册 wheel 回调（用于视口缩放等） */
  setWheelHandler(handler: ((evt: VizEvent) => void) | null): void {
    this.wheelHandler = handler;
  }

  /** 注册视口平移回调（空白区域左键或中键拖拽） */
  setPanHandler(handler: ((deltaScreenX: number, deltaScreenY: number) => void) | null): void {
    this.panHandler = handler;
  }

  /**
   * 设置根事件处理器（当命中检测未命中任何子元素时触发）
   * 根组件可借此监听画布空白区域的点击/移动等事件
   */
  setRootEventHandler(events: Partial<Record<VizEventType, VizEventHandler>>): void {
    this.rootEventHandler = events;
  }

  /**
   * 合成事件派发（供拖拽等内部逻辑使用）
   * @param type 事件类型
   * @param nativeEvent 原生事件
   * @param targetId 目标元素 id
   * @param offsetX 容器内 x 坐标（CSS 像素）
   * @param offsetY 容器内 y 坐标（CSS 像素）
   */
  dispatchSynthetic(
    type: VizEventType,
    nativeEvent: NativePointerLike | WheelEvent,
    targetId: string,
    offsetX: number,
    offsetY: number,
  ): void {
    this.dispatch(type, nativeEvent, targetId, offsetX, offsetY);
  }

  /**
   * 绑定容器指针事件监听器
   * 包括 pointerdown/pointerup/pointermove/click/dblclick/contextmenu 和 wheel
   */
  private bindContainer(container: Element): void {
    if (this.boundContainer) this.unbindContainer();
    this.boundContainer = container;

    for (const type of BOUND_POINTER_EVENTS) {
      const listener = (e: Event) => {
        this.handlePointerEvent(type, e as PointerEvent);
      };
      container.addEventListener(type, listener);
      this.boundListeners.set(type, listener);
    }

    const wheelListener = (e: Event) => this.handleWheel(e as WheelEvent);
    container.addEventListener('wheel', wheelListener, { passive: false });
    this.boundListeners.set('wheel', wheelListener);
  }

  /** 解绑容器的所有事件监听器 */
  private unbindContainer(): void {
    if (!this.boundContainer) return;
    for (const [type, listener] of this.boundListeners) {
      this.boundContainer.removeEventListener(type, listener);
    }
    this.boundListeners.clear();
    this.boundContainer = null;
  }

  /**
   * 处理滚轮事件
   * 优先派发给命中的元素（若元素有 wheel 事件处理器），否则交给全局 wheelHandler
   */
  private handleWheel(nativeEvent: WheelEvent): void {
    if (!this.boundContainer) return;
    const rect = this.boundContainer.getBoundingClientRect();
    const offsetX = nativeEvent.clientX - rect.left;
    const offsetY = nativeEvent.clientY - rect.top;

    const targetId = this.hitTest(offsetX, offsetY, nativeEvent as unknown as PointerEvent);
    if (targetId && this.model.getElement(targetId)?.events?.wheel) {
      this.dispatch('wheel', nativeEvent, targetId, offsetX, offsetY);
      return;
    }

    if (!this.wheelHandler) return;
    const evt = new VizEvent('wheel', nativeEvent, '', offsetX, offsetY);
    this.wheelHandler(evt);
  }

  /**
   * 处理指针事件（pointerdown/pointerup/pointermove/click 等）
   * 管理平移拖拽状态、hover 跟踪、事件冒泡路径分发
   */
  private handlePointerEvent(domType: string, nativeEvent: PointerEvent): void {
    const vizType = this.mapPointerType(domType);
    if (!vizType) return;

    const rect = this.boundContainer!.getBoundingClientRect();
    const offsetX = nativeEvent.clientX - rect.left;
    const offsetY = nativeEvent.clientY - rect.top;

    if (this.isPanning) {
      if (domType === 'pointermove' && nativeEvent.pointerId === this.panPointerId) {
        const dx = nativeEvent.clientX - this.panLastClientX;
        const dy = nativeEvent.clientY - this.panLastClientY;
        this.panLastClientX = nativeEvent.clientX;
        this.panLastClientY = nativeEvent.clientY;
        this.panHandler?.(dx, dy);
        nativeEvent.preventDefault();
        return;
      }
      if (domType === 'pointerup' && nativeEvent.pointerId === this.panPointerId) {
        this.isPanning = false;
        this.panPointerId = -1;
        return;
      }
    }

    const targetId = this.hitTest(offsetX, offsetY, nativeEvent);

    if (domType === 'pointerdown' && this.panHandler) {
      const isMiddle = nativeEvent.button === 1;
      const isLeftOnEmpty = nativeEvent.button === 0 && !targetId;
      if (isMiddle || isLeftOnEmpty) {
        this.isPanning = true;
        this.panPointerId = nativeEvent.pointerId;
        this.panLastClientX = nativeEvent.clientX;
        this.panLastClientY = nativeEvent.clientY;
        this.lastHoverTarget = null;
        nativeEvent.preventDefault();
        return;
      }
    }

    if (vizType === 'mousedown' && targetId) {
      nativeEvent.preventDefault();
    }

    if (!targetId) {
      // 未命中任何子元素 → 触发根事件处理器 + 清理 hover
      if (vizType === 'mousemove' && this.lastHoverTarget) {
        this.dispatch('mouseleave', nativeEvent, this.lastHoverTarget, offsetX, offsetY);
        this.lastHoverTarget = null;
      }
      this.invokeRootHandler(vizType, nativeEvent, offsetX, offsetY);
      return;
    }

    if (vizType === 'mousemove') {
      if (this.lastHoverTarget && this.lastHoverTarget !== targetId) {
        this.dispatch('mouseleave', nativeEvent, this.lastHoverTarget, offsetX, offsetY);
        this.dispatch('mouseenter', nativeEvent, targetId, offsetX, offsetY);
      } else if (!this.lastHoverTarget) {
        this.dispatch('mouseenter', nativeEvent, targetId, offsetX, offsetY);
      }
      this.lastHoverTarget = targetId;
      this.dispatch('mousemove', nativeEvent, targetId, offsetX, offsetY);
      return;
    }

    if (vizType === 'mouseenter' || vizType === 'mouseleave') return;

    this.dispatch(vizType, nativeEvent, targetId, offsetX, offsetY);
  }

  /** 将 DOM 指针事件类型映射为 Viz 事件类型 */
  private mapPointerType(domType: string): VizEventType | null {
    switch (domType) {
      case 'pointerdown': return 'mousedown';
      case 'pointerup': return 'mouseup';
      case 'pointermove': return 'mousemove';
      case 'click': return 'click';
      case 'dblclick': return 'dblclick';
      case 'contextmenu': return 'contextmenu';
      default: return null;
    }
  }

  /**
   * 沿冒泡路径依次派发事件
   * 支持 stopPropagation 中断冒泡
   */
  private dispatch(
    type: VizEventType,
    nativeEvent: NativePointerLike | WheelEvent,
    targetId: string,
    offsetX: number,
    offsetY: number,
  ): void {
    const vizEvent = new VizEvent(type, nativeEvent, targetId, offsetX, offsetY);
    const path = this.buildBubblePath(targetId);

    for (let i = 0; i < path.length; i++) {
      if (vizEvent.isPropagationStopped) return;
      this.invokeHandler(path[i], type, vizEvent);
    }
  }

  /** 构建从目标元素到根的事件冒泡路径 */
  private buildBubblePath(targetId: string): string[] {
    const elementId = this.resolveElementId(targetId);
    const path: string[] = [];
    let current: ElementRecord | undefined = this.model.getElement(elementId);
    while (current) {
      path.push(current.id);
      if (current.parentId) {
        current = this.model.getElement(current.parentId);
      } else {
        break;
      }
    }
    return path;
  }

  /**
   * 从命中 id 解析元素 id（支持 Points 的 id#index 格式）
   * @param targetId 命中目标 id
   */
  private resolveElementId(targetId: string): string {
    const hash = targetId.indexOf('#');
    if (hash <= 0) return targetId;
    const elementId = targetId.slice(0, hash);
    return this.model.getElement(elementId) ? elementId : targetId;
  }

  /** 在指定元素上调用事件处理器，临时设置 currentTarget */
  private invokeHandler(id: string, type: VizEventType, event: VizEvent): void {
    const record = this.model.getElement(id);
    if (!record || record.removed) return;
    const handler = record.events?.[type];
    if (!handler) return;
    const prevCurrent = event.currentTarget;
    event.currentTarget = id;
    try {
      handler(event);
    } finally {
      event.currentTarget = prevCurrent;
    }
  }

  /**
   * 调用根事件处理器（空白区域事件）
   * 当 hitTest 未命中任何子元素时，将事件投递给根组件注册的处理器
   */
  private invokeRootHandler(
    type: VizEventType,
    nativeEvent: NativePointerLike | WheelEvent,
    offsetX: number,
    offsetY: number,
  ): void {
    const handler = this.rootEventHandler[type];
    if (!handler) return;
    const event = new VizEvent(type, nativeEvent, '__root__', offsetX, offsetY);
    handler(event);
  }

  /** 命中检测入口：根据渲染引擎选择 SVG/Canvas 策略 */
  private hitTest(x: number, y: number, nativeEvent: PointerEvent): string | null {
    if (this.svgEl) return this.hitTestSVG(nativeEvent);
    if (this.canvasEl) return this.hitTestCanvas(x, y);
    return null;
  }

  /** SVG 命中检测：利用 DOM elementFromPoint + data-viz-id 属性查找 */
  private hitTestSVG(nativeEvent: PointerEvent): string | null {
    const el = document.elementFromPoint(nativeEvent.clientX, nativeEvent.clientY);
    if (!el) return null;

    let current: Element | null = el;
    while (current && current !== this.boundContainer) {
      if (current instanceof SVGElement) {
        const vizId = current.getAttribute('data-viz-id');
        if (vizId) {
          const baseId = vizId.includes('#') ? vizId.split('#')[0] : vizId;
          if (this.model.getElement(baseId)) return vizId;
        }
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * Canvas 命中检测：逆序遍历叶子形状，坐标转换到局部后做几何测试
   * 命中前校验祖先 ClipPath / Mask（裁剪外 / 遮罩外视为未命中）
   * 空间索引为加速：候选未几何命中时回退全量逆序，避免 AABB 低估漏点
   */
  private hitTestCanvas(offsetX: number, offsetY: number): string | null {
    const { x: vx, y: vy, scale } = this.viewport;
    const worldX = offsetX / scale - vx;
    const worldY = offsetY / scale - vy;

    const paintTopFirst = [...this.canvasElements].reverse();
    const spatialHits = this.spatialIndex.query(worldX, worldY);
    if (spatialHits.length > 0) {
      const hitIds = new Set(spatialHits.map((r) => r.id));
      const spatialFirst = paintTopFirst.filter((r) => hitIds.has(r.id));
      const hit = this.hitTestCanvasList(spatialFirst, worldX, worldY);
      if (hit) return hit;
      // 空间格子有候选但几何未中：回退测其余节点（防 AABB 低估漏点）
      return this.hitTestCanvasList(
        paintTopFirst.filter((r) => !hitIds.has(r.id)),
        worldX,
        worldY,
      );
    }
    return this.hitTestCanvasList(paintTopFirst, worldX, worldY);
  }

  /**
   * 对给定候选列表做几何命中（已按绘制从上到下）
   * @param searchList 候选（顶层优先）
   * @param worldX 世界 x
   * @param worldY 世界 y
   */
  private hitTestCanvasList(
    searchList: ElementRecord[],
    worldX: number,
    worldY: number,
  ): string | null {
    for (const record of searchList) {
      if (!isElementVisible(this.model, record)) continue;
      if (!isPointerEventsEnabled(this.model, record)) continue;
      if (!this.isInsideClipAndMaskAncestors(record, worldX, worldY)) continue;

      const { lx, ly } = this.toLocalPoint(worldX, worldY, record);

      if (record.type === 'points') {
        const idx = hitTestPoints(record.data as PointsData, lx, ly);
        if (idx >= 0) return `${record.id}#${idx}`;
        continue;
      }

      if (this.testShape(record, lx, ly)) {
        return record.id;
      }
    }
    return null;
  }

  /**
   * 将世界坐标逆变换为元素局部坐标
   * 使用渲染阶段合成的 worldMatrix，包含祖先 Group 的 translate / rotate / scale
   */
  private toLocalPoint(
    worldX: number,
    worldY: number,
    record: ElementRecord,
  ): { lx: number; ly: number } {
    const wm = (record.worldMatrix ?? IDENTITY_MAT3) as Mat3;
    const p = worldToLocalPoint(wm, worldX, worldY);
    return { lx: p.x, ly: p.y };
  }

  /**
   * 沿 parent 链检查点是否落在所有祖先 ClipPath / Mask 形状内
   * @param record 被测元素
   * @param worldX 世界 x
   * @param worldY 世界 y
   */
  private isInsideClipAndMaskAncestors(
    record: ElementRecord,
    worldX: number,
    worldY: number,
  ): boolean {
    let parentId = record.parentId;
    while (parentId) {
      const parent = this.model.getElement(parentId);
      if (!parent) break;
      if (parent.type === 'clipPath' || parent.type === 'mask') {
        const { lx, ly } = this.toLocalPoint(worldX, worldY, parent);
        if (!this.testClipOrMaskShape(parent, lx, ly)) return false;
      }
      parentId = parent.parentId;
    }
    return true;
  }

  /** 测试点是否落在 ClipPath / Mask 声明的裁剪/遮罩形状内 */
  private testClipOrMaskShape(record: ElementRecord, x: number, y: number): boolean {
    const data = record.data as ClipPathData | MaskData;
    switch (data.shapeType) {
      case 'rect':
        return this.testRect(data.shapeData as RectData, x, y);
      case 'ellipse':
        return this.testEllipse(data.shapeData as EllipseData, x, y);
      case 'path':
        return this.testPath(data.shapeData as PathData, x, y);
      default:
        return true;
    }
  }

  /** 按元素类型分发到对应的几何命中检测方法 */
  private testShape(record: ElementRecord, x: number, y: number): boolean {
    switch (record.type) {
      case 'rect':
        return this.testRect(record.data as RectData, x, y);
      case 'ellipse':
        return this.testEllipse(record.data as EllipseData, x, y);
      case 'line':
        return this.testLine(record.data as LineData, x, y);
      case 'path':
        return this.testPath(record.data as PathData, x, y);
      case 'text':
        return this.testText(record.data as TextData, x, y);
      case 'image':
        return this.testImage(record.data as ImageData, x, y);
      case 'points':
        return hitTestPoints(record.data as PointsData, x, y) >= 0;
      default:
        return false;
    }
  }

  /**
   * 矩形命中检测
   * 圆角：中间主体区直接命中；四角口袋用椭圆方程；主体外且不在圆角内未命中
   */
  private testRect(d: RectData, x: number, y: number): boolean {
    const w = Math.max(0, d.width);
    const h = Math.max(0, d.height);
    if (x < d.x || x > d.x + w || y < d.y || y > d.y + h) return false;

    const rx = Math.min(Math.max(0, d.rx ?? 0), w / 2);
    const ry = Math.min(Math.max(0, d.ry ?? 0), h / 2);
    if (rx <= 0 || ry <= 0) return true;

    // 非圆角口袋（十字形主体）
    if (x >= d.x + rx && x <= d.x + w - rx) return true;
    if (y >= d.y + ry && y <= d.y + h - ry) return true;

    // 四角口袋：相对最近圆角圆心做椭圆内测
    const cx = x < d.x + rx ? d.x + rx : d.x + w - rx;
    const cy = y < d.y + ry ? d.y + ry : d.y + h - ry;
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    return nx * nx + ny * ny <= 1;
  }

  /** 椭圆命中检测：归一化后判断点是否在单位圆内 */
  private testEllipse(d: EllipseData, x: number, y: number): boolean {
    if (d.rx <= 0 || d.ry <= 0) return false;
    const nx = (x - d.cx) / d.rx;
    const ny = (y - d.cy) / d.ry;
    return nx * nx + ny * ny <= 1;
  }

  /**
   * 折线命中检测
   * 遍历各线段，使用点到线段的距离与阈值（strokeWidth + 4）比较
   */
  private testLine(d: LineData, x: number, y: number): boolean {
    const threshold = (d.strokeWidth ?? 1) + 4;
    for (let i = 1; i < d.points.length; i++) {
      const p0 = d.points[i - 1];
      const p1 = d.points[i];
      if (pointToSegmentDist(x, y, p0.x, p0.y, p1.x, p1.y) < threshold) return true;
    }
    if (d.closed && d.points.length > 2) {
      const p0 = d.points[d.points.length - 1];
      const p1 = d.points[0];
      if (pointToSegmentDist(x, y, p0.x, p0.y, p1.x, p1.y) < threshold) return true;
    }
    return false;
  }

  /**
   * Path 命中检测
   * 使用缓存的 Path2D 对象 + isPointInPath/isPointInStroke
   */
  private testPath(d: PathData, x: number, y: number): boolean {
    const path = this.pathCache.get(d.d);
    if (!path) return false;

    const ctx = this.hitCtx;
    const hasFill = !!(d.fill && d.fill !== 'none' && d.fill !== 'transparent');
    if (hasFill && ctx.isPointInPath(path, x, y)) return true;

    if (d.stroke && d.stroke !== 'none') {
      ctx.lineWidth = (d.strokeWidth ?? 1) + 4;
      if (ctx.isPointInStroke(path, x, y)) return true;
    }
    return false;
  }

  /**
   * 文本命中检测
   * 保守测量文本宽度和行高，做 AABB 包含检测
   */
  private testText(d: TextData, x: number, y: number): boolean {
    const fs = d.fontSize ?? 16;
    const lineHeight = d.lineHeight ?? fs * 1.2;
    const lines = d.text.split('\n');
    const ctx = this.hitCtx;
    ctx.font = `${d.fontWeight ?? 'normal'} ${fs}px ${d.fontFamily ?? 'sans-serif'}`;

    const widths = lines.map((line) => ctx.measureText(line).width);
    const textWidth = Math.max(...widths, 0);
    const textHeight = lines.length * lineHeight;

    let textX = d.x;
    if (d.textAlign === 'middle') textX -= textWidth / 2;
    else if (d.textAlign === 'end') textX -= textWidth;

    let topY = d.y;
    if (d.textBaseline === 'middle') topY -= textHeight / 2;
    else if (d.textBaseline === 'bottom' || d.textBaseline === 'alphabetic') topY -= textHeight;
    else if (d.textBaseline === 'top') topY = d.y;

    if (x < textX || x > textX + textWidth) return false;

    for (let i = 0; i < lines.length; i++) {
      const lineTop = topY + i * lineHeight;
      const lineBottom = lineTop + lineHeight;
      if (y >= lineTop && y <= lineBottom) return true;
    }
    return false;
  }

  /** 图片命中检测：简单 AABB 包含测试 */
  private testImage(d: ImageData, x: number, y: number): boolean {
    const w = Math.max(0, d.width);
    const h = Math.max(0, d.height);
    return x >= d.x && x <= d.x + w && y >= d.y && y <= d.y + h;
  }

  /** 销毁事件系统：解绑所有监听器，清理缓存 */
  dispose(): void {
    this.unbindContainer();
    this.svgElementMap.clear();
    this.canvasElements.length = 0;
    this.pathCache.clear();
    this.svgEl = null;
    this.canvasEl = null;
    this.lastHoverTarget = null;
    this.wheelHandler = null;
    this.panHandler = null;
    this.rootEventHandler = {};
    this.isPanning = false;
  }
}

export { EventSystem };
