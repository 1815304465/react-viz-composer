import type { Model } from '../Model';
import { VizEvent } from '../types';
import type {
  VizEventType, VizEventHandler, ElementRecord, RectData, EllipseData, LineData, PathData, TextData, ImageData,
  Transform, Viewport,
} from '../types';
import { Path2DCache } from '../utils/pathCache';
import { getGroupBounds, getElementBounds } from '../utils/bounds';
import { isElementVisible, isPointerEventsEnabled } from '../utils/elements';
import { sortByPaintOrder } from '../utils/paintOrder';
import { pointToSegmentDist } from '../utils/maths';

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
   * 排除 defs 类节点（渐变/裁剪/滤镜/遮罩），它们不参与命中测试
   */
  syncCanvasElements(elements: ElementRecord[]): void {
    const drawable = elements.filter(
      (e) => !e.removed
        && e.type !== 'linearGradient' && e.type !== 'radialGradient'
        && e.type !== 'clipPath' && e.type !== 'filter' && e.type !== 'mask',
    );
    this.canvasElements = sortByPaintOrder(drawable);
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
    const path: string[] = [];
    let current: ElementRecord | undefined = this.model.getElement(targetId);
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
        if (vizId && this.model.getElement(vizId)) {
          return vizId;
        }
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * Canvas 命中检测：逆序遍历可绘制元素，坐标转换到局部后做几何测试
   * 先测 group 包围盒，再测具体形状
   */
  private hitTestCanvas(offsetX: number, offsetY: number): string | null {
    const { x: vx, y: vy, scale } = this.viewport;
    const worldX = offsetX / scale - vx;
    const worldY = offsetY / scale - vy;

    for (let i = this.canvasElements.length - 1; i >= 0; i--) {
      const record = this.canvasElements[i];
      if (!isElementVisible(this.model, record)) continue;
      if (!isPointerEventsEnabled(this.model, record)) continue;

      const { lx, ly } = this.toLocalPoint(worldX, worldY, record.data as { transform?: Transform });

      if (record.type === 'group') {
        if (this.testGroup(record, lx, ly)) return record.id;
        continue;
      }

      if (this.testShape(record, lx, ly)) {
        return record.id;
      }
    }
    return null;
  }

  /** 将世界坐标逆变换为元素局部坐标（逆序：translate → rotate → scale） */
  private toLocalPoint(worldX: number, worldY: number, data: { transform?: Transform }): { lx: number; ly: number } {
    let lx = worldX;
    let ly = worldY;
    const t = data.transform;
    if (!t) return { lx, ly };

    lx -= t.x ?? 0;
    ly -= t.y ?? 0;

    if (t.rotation) {
      const rad = (-(t.rotation ?? 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = lx * cos - ly * sin;
      const ry = lx * sin + ly * cos;
      lx = rx;
      ly = ry;
    }

    const sx = t.scaleX ?? 1;
    const sy = t.scaleY ?? 1;
    if (sx !== 0) lx /= sx;
    if (sy !== 0) ly /= sy;

    return { lx, ly };
  }

  /** Group 命中检测：计算子树包围盒后做 AABB 包含测试 */
  private testGroup(record: ElementRecord, x: number, y: number): boolean {
    const bounds = getGroupBounds(this.model, record.id);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return false;
    return x >= bounds.x && x <= bounds.x + bounds.width
      && y >= bounds.y && y <= bounds.y + bounds.height;
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
      default:
        return false;
    }
  }

  /**
   * 矩形命中检测
   * 支持圆角矩形：四个圆角区域用椭圆方程精确检测，中间区域用 AABB
   */
  private testRect(d: RectData, x: number, y: number): boolean {
    const w = Math.max(0, d.width);
    const h = Math.max(0, d.height);
    if (d.rx || d.ry) {
      const rx = Math.min(d.rx ?? 0, w / 2);
      const ry = Math.min(d.ry ?? 0, h / 2);
      if (rx > 0 && ry > 0) {
        if (x < d.x + rx || x > d.x + w - rx || y < d.y + ry || y > d.y + h - ry) {
          return x >= d.x && x <= d.x + w && y >= d.y && y <= d.y + h;
        }
        const corners = [
          [d.x + rx, d.y + ry],
          [d.x + w - rx, d.y + ry],
          [d.x + rx, d.y + h - ry],
          [d.x + w - rx, d.y + h - ry],
        ];
        for (const [cx, cy] of corners) {
          const nx = (x - cx) / rx;
          const ny = (y - cy) / ry;
          if (nx * nx + ny * ny <= 1) return true;
        }
        return false;
      }
    }
    return x >= d.x && x <= d.x + w && y >= d.y && y <= d.y + h;
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
