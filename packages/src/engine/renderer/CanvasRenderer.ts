import type {
  ElementRecord, Transform,
  RectData, EllipseData, LineData, PathData, TextData, ImageData, PointsData,
  LinearGradientData, RadialGradientData, ClipPathData,
  FilterData, FilterEffect, MaskData,
  VizDragEventHandler,
} from '../types';
import { Renderer } from './Renderer';
import {
  pushCanvasOpacity, popCanvasOpacity,
  extractGradientId,
  getEffectiveOpacity, isElementVisible,
  parseDashArray, computeImageDrawRect,
  transformToMatrix, multiplyMat3,
  estimateLocalBounds, boundsIntersectViewport,
  IDENTITY_MAT3, sortByPaintOrder,
  pointAttr, getPointsCount,
} from '../index';
import type { Mat3 } from '../types';

/** 容器级效果帧：begin/end 成对传递，支持嵌套 */
type ContainerEffectFrame =
  | { kind: 'clip' }
  | { kind: 'filter'; prevFilter: string }
  | {
      kind: 'mask';
      maskCtx: CanvasRenderingContext2D;
      origCtx: CanvasRenderingContext2D;
      savedCtx: CanvasRenderingContext2D;
      offscreen: HTMLCanvasElement;
      maskData: MaskData;
    };

/**
 * CanvasRenderer —— 基于 Canvas 2D 的渲染器（递归版）
 *
 * 关键设计：
 * - 递归 renderNodeWithCollect：合成 worldMatrix 后 save/restore 应用变换
 * - 全画布重画策略：每次 render 先 clearRect 清空，再递归绘制所有 top-level 节点
 * - viewport 通过 setTransform 直接设置（DPR × scale + translate），作为根矩阵
 * - 支持 clip-path / filter / mask 效果（容器效果可嵌套）
 * - 支持拖拽交互
 */
class CanvasRenderer extends Renderer {
  /** 主画布 DOM 元素 */
  private canvas!: HTMLCanvasElement;
  /** Canvas 2D 绘图上下文（含 DPR 缩放） */
  private ctx!: CanvasRenderingContext2D;
  /** 图片缓存：src → HTMLImageElement，避免重复加载 */
  private imageCache: Map<string, HTMLImageElement> = new Map();
  /** 线性渐变定义缓存：id → LinearGradientData */
  private linearGradientDefs = new Map<string, LinearGradientData>();
  /** 径向渐变定义缓存：id → RadialGradientData */
  private radialGradientDefs = new Map<string, RadialGradientData>();
  /**
   * Mask 离屏画布池（按嵌套深度复用，避免单例互相清空）
   * 每次 beginMask acquire，endMask 后 release
   */
  private maskCanvasPool: HTMLCanvasElement[] = [];
  /** 当前画布逻辑宽度（CSS 像素） */
  protected viewWidth = 0;
  /** 当前画布逻辑高度（CSS 像素） */
  protected viewHeight = 0;

  // ---- 拖拽状态 ----
  /** 当前正在拖拽的元素 id */
  private dragElementId: string | null = null;
  /** 拖拽起始 clientX */
  private dragStartX = 0;
  /** 拖拽起始 clientY */
  private dragStartY = 0;
  /** 上一帧拖拽 clientX */
  private dragLastX = 0;
  /** 上一帧拖拽 clientY */
  private dragLastY = 0;
  /** 拖拽移动回调 */
  private dragOnDrag: VizDragEventHandler | null = null;
  /** 拖拽结束回调 */
  private dragOnEnd: VizDragEventHandler | null = null;
  /** 全局 pointermove 监听器引用（用于解绑） */
  private onGlobalPointerMove: ((e: PointerEvent) => void) | null = null;
  /** 全局 pointerup 监听器引用（用于解绑） */
  private onGlobalPointerUp: ((e: PointerEvent) => void) | null = null;

  /**
   * 挂载渲染器：创建 Canvas DOM 元素并挂到容器中
   * 按 DPR 设置物理像素，确保高清显示
   * @param container 容器 DOM 元素
   * @returns Canvas DOM 元素
   */
  mount(container: HTMLElement): HTMLCanvasElement {
    this.container = container;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.canvas = canvas;
    this.ctx = ctx;

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    return canvas;
  }

  /** 设置事件系统：将 Canvas DOM 绑定到 EventSystem 用于命中检测 */
  override setEventSystem(es: typeof this.eventSystem): void {
    if (es) {
      super.setEventSystem(es);
      es.attachCanvas(this.canvas);
    }
  }

  /**
   * 开始拖拽：注册全局 pointermove/pointerup 监听器
   * 屏幕位移 → 元素局部坐标（扣除 viewport.scale 与祖先 worldMatrix）
   * @param id 拖拽元素 id
   * @param onDrag 拖拽移动回调
   * @param onEnd 拖拽结束回调
   * @param evt 触发拖拽的鼠标事件
   */
  protected startDrag(id: string, onDrag: VizDragEventHandler, onEnd: VizDragEventHandler, evt: MouseEvent): void {
    this.dragElementId = id;
    this.dragStartX = evt.clientX;
    this.dragStartY = evt.clientY;
    this.dragLastX = evt.clientX;
    this.dragLastY = evt.clientY;
    this.dragOnDrag = onDrag;
    this.dragOnEnd = onEnd;

    this.dispatchDragVizEvent('dragstart', id, evt);

    const globalMove = (e: PointerEvent) => {
      if (this.dragElementId !== id) return;
      const total = this.screenDeltaToLocalDragDelta(id, e.clientX - this.dragStartX, e.clientY - this.dragStartY);
      const step = this.screenDeltaToLocalDragDelta(id, e.clientX - this.dragLastX, e.clientY - this.dragLastY);
      this.dragLastX = e.clientX;
      this.dragLastY = e.clientY;
      this.dragOnDrag?.({
        dx: total.x, dy: total.y, stepX: step.x, stepY: step.y, originalEvent: e, elementId: id,
      });
    };

    const globalUp = (e: PointerEvent) => {
      if (this.dragElementId !== id) return;
      const total = this.screenDeltaToLocalDragDelta(id, e.clientX - this.dragStartX, e.clientY - this.dragStartY);
      this.dragOnEnd?.({
        dx: total.x, dy: total.y, stepX: 0, stepY: 0, originalEvent: e, elementId: id,
      });
      this.dispatchDragVizEvent('dragend', id, e);
      this.stopDrag();
    };

    this.onGlobalPointerMove = globalMove;
    this.onGlobalPointerUp = globalUp;

    document.addEventListener('pointermove', globalMove);
    document.addEventListener('pointerup', globalUp);
  }

  /** 派发拖拽事件到 EventSystem：将 clientX/Y 转换为画布内坐标 */
  private dispatchDragVizEvent(type: 'dragstart' | 'dragend', id: string, evt: MouseEvent | PointerEvent): void {
    const rect = this.container?.getBoundingClientRect();
    if (!rect || !this.eventSystem) return;
    this.eventSystem.dispatchSynthetic(type, evt, id, evt.clientX - rect.left, evt.clientY - rect.top);
  }

  /** 停止拖拽：清除状态并解绑全局事件监听器 */
  protected stopDrag(): void {
    this.dragElementId = null;
    this.dragOnDrag = null;
    this.dragOnEnd = null;
    if (this.onGlobalPointerMove) {
      document.removeEventListener('pointermove', this.onGlobalPointerMove);
      this.onGlobalPointerMove = null;
    }
    if (this.onGlobalPointerUp) {
      document.removeEventListener('pointerup', this.onGlobalPointerUp);
      this.onGlobalPointerUp = null;
    }
  }

  // ============ 渲染入口 ============

  /**
   * 全画布重画 + 视口裁剪
   *
   * Canvas 没有"局部 dirty rect"概念，每次 render 都必须全画布重画：
   * 1. clearRect 擦除所有像素
   * 2. 设置视口变换（DPR × scale + translate）
   * 3. 递归绘制所有 top-level 节点
   * 4. 收集活跃节点同步给 EventSystem
   *
   * node.dirty 由 Graph/Model 用于决定数据是否需要重新同步，不影响绘制。
   * @param roots 顶层元素列表
   */
  render(roots: ElementRecord[]): void {
    const { width, height } = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const { x, y, scale } = this.viewport;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * scale * x, dpr * scale * y);

    // 获取视口可视区域（带裁剪边距）
    const visible = this.getVisibleBounds();

    // 收集所有活跃 drawable 节点供事件系统命中检测
    const active: ElementRecord[] = [];

    for (const root of roots) {
      this.renderNodeWithCollect(root, IDENTITY_MAT3 as Mat3, active, visible);
    }

    this.eventSystem?.syncCanvasElements(active, visible);
  }

  /**
   * 递归渲染节点 + 收集活动节点给事件系统
   *
   * 流程：
   * 1. 合成 worldMatrix（parent × local）
   * 2. 视口裁剪检查（叶子 drawable 节点，检查局部包围盒是否与可见区域相交）
   * 3. ctx.save → applyMat3 应用变换 → drawSelfInner 绘制 → ctx.restore
   * 4. 收集叶子节点到 active 数组
   * 5. 递归子节点
   * 6. 清除 dirty 标记
   *
   * Canvas 必须重画每个访问到的节点（clearRect 已擦除），
   * 所以本方法不再根据 node.dirty 决定是否画自己 —— 只要节点没被移除、可见，就画。
   * @param node 当前节点
   * @param parentMatrix 父节点世界矩阵
   * @param active 活动节点收集数组
   * @param visible 可见区域（用于裁剪判断）
   */
  private renderNodeWithCollect(
    node: ElementRecord,
    parentMatrix: Mat3,
    active: ElementRecord[],
    visible: { x: number; y: number; w: number; h: number } | null,
  ): void {
    if (node.removed) return;
    if (this.model && !isElementVisible(this.model, node)) return;

    // 合成 worldMatrix
    const dataAny = node.data as { transform?: Transform };
    const localMatrix = transformToMatrix(dataAny.transform);
    multiplyMat3(node.worldMatrix, parentMatrix, localMatrix);
    node.worldMatrixDirty = false;

    const isEffectContainer =
      node.type === 'clipPath' || node.type === 'filter' || node.type === 'mask';
    const isStructureContainer =
      node.type === 'group' || node.type === 'animation' || isEffectContainer;
    const isLeaf = !isStructureContainer
      && node.type !== 'linearGradient' && node.type !== 'radialGradient';

    // 效果容器：在子树绘制期间保持 clip / filter / mask（帧对象可重入嵌套）
    if (isEffectContainer) {
      this.ctx.save();
      // 先记下视口/DPR 变换；clip 需在 worldMatrix 下建立，之后必须恢复此变换，
      // 不能 setTransform(identity)，否则子节点会丢掉 DPR 缩放，裁剪错位。
      const baseTransform = this.ctx.getTransform();
      this.applyMat3(this.ctx, node.worldMatrix);
      const effectFrame = this.beginContainerEffect(node);
      this.ctx.setTransform(baseTransform);

      const sortedChildren = sortByPaintOrder(node.children.filter((c) => !c.removed));
      for (const child of sortedChildren) {
        this.renderNodeWithCollect(child, node.worldMatrix, active, visible);
      }

      this.endContainerEffect(effectFrame);
      this.ctx.restore();

      if (node.dirty) {
        node.dirty = false;
        node.subtreeDirty = false;
      }
      return;
    }

    let culled = false;
    if (visible && isLeaf) {
      const lbs = estimateLocalBounds(node);
      if (lbs && !boundsIntersectViewport(lbs, node.worldMatrix, visible)) {
        culled = true;
      }
    }

    if (!culled) {
      // save + 应用 matrix
      this.ctx.save();
      this.applyMat3(this.ctx, node.worldMatrix);

      // Canvas 总是全画布重画，访问到就画（不再因 node.dirty=false 跳过）
      this.drawSelfInner(node);

      this.ctx.restore();

      // 收集 drawable 给事件系统（视口外节点不参与命中）
      if (isLeaf) {
        active.push(node);
      }
    }

    // 递归 children（按 zIndex 排序）
    const sortedChildren = sortByPaintOrder(node.children.filter((c) => !c.removed));
    for (const child of sortedChildren) {
      this.renderNodeWithCollect(child, node.worldMatrix, active, visible);
    }

    // 清脏（递归后）：Model 端不再需要"我脏了"
    if (node.dirty) {
      node.dirty = false;
      node.subtreeDirty = false;
    }
  }

  /**
   * 开始容器级 clip / filter / mask（在当前矩阵坐标系下）
   * 返回帧对象供 end 成对恢复，支持任意嵌套深度
   * @param node 容器节点
   */
  private beginContainerEffect(node: ElementRecord): ContainerEffectFrame | null {
    if (node.type === 'clipPath') {
      this.applyClipShape(node.data as ClipPathData);
      return { kind: 'clip' };
    }
    if (node.type === 'filter') {
      const prevFilter = this.ctx.filter;
      this.ctx.filter = this.buildCssFilter((node.data as FilterData).effects);
      return { kind: 'filter', prevFilter };
    }
    if (node.type === 'mask') {
      const maskData = node.data as MaskData;
      const result = this.beginMask();
      if (!result) return null;
      const savedCtx = this.ctx;
      this.ctx = result.maskCtx;
      return {
        kind: 'mask',
        maskCtx: result.maskCtx,
        origCtx: result.origCtx,
        savedCtx,
        offscreen: result.offscreen,
        maskData,
      };
    }
    return null;
  }

  /**
   * 结束容器级效果（与 beginContainerEffect 成对）
   * @param frame begin 返回的帧
   */
  private endContainerEffect(frame: ContainerEffectFrame | null): void {
    if (!frame) return;
    if (frame.kind === 'filter') {
      this.ctx.filter = frame.prevFilter;
      return;
    }
    if (frame.kind === 'mask') {
      this.ctx = frame.savedCtx;
      this.endMask(frame.origCtx, frame.maskData, frame.offscreen);
    }
  }

  /** 基类要求的 drawSelf：直接委托给内部实现 */
  protected drawSelf(node: ElementRecord): void {
    this.drawSelfInner(node);
  }

  /**
   * 统一绘制入口：opacity → 形状绘制
   * clip / filter / mask 由外层效果容器负责，叶子节点不再解析 url(#id)
   * @param record 元素记录
   */
  private drawSelfInner(record: ElementRecord): void {
    const opacity = this.model ? getEffectiveOpacity(this.model, record) : 1;
    const opacitySaved = pushCanvasOpacity(this.ctx, opacity);

    switch (record.type) {
      case 'rect':
        this.drawRect(this.ctx, record.data as RectData);
        break;
      case 'ellipse':
        this.drawEllipse(this.ctx, record.data as EllipseData);
        break;
      case 'line':
        this.drawLine(this.ctx, record.data as LineData);
        break;
      case 'path':
        this.drawPath(this.ctx, record.data as PathData);
        break;
      case 'text':
        this.drawText(this.ctx, record.data as TextData);
        break;
      case 'image':
        this.drawImage(this.ctx, record.data as ImageData);
        break;
      case 'points':
        this.drawPoints(this.ctx, record.data as PointsData);
        break;
      case 'linearGradient':
        this.cacheLinearGradient(record.data as LinearGradientData);
        break;
      case 'radialGradient':
        this.cacheRadialGradient(record.data as RadialGradientData);
        break;
      case 'clipPath':
      case 'filter':
      case 'mask':
      case 'group':
      case 'animation':
        break;
    }

    popCanvasOpacity(this.ctx, opacitySaved);
  }

  /**
   * 把 Mat3（列主序）应用到 ctx 的当前变换
   * 等价于 ctx.transform(a, b, c, d, e, f)
   * @param ctx 2D 上下文
   * @param m 3×3 列主序矩阵
   */
  private applyMat3(ctx: CanvasRenderingContext2D, m: Mat3): void {
    // 列主序 [m0,m1,m2 / m3,m4,m5 / m6,m7,m8]
    // = 行: [m0,m3,m6 / m1,m4,m7 / m2,m5,m8]
    // Canvas setTransform(a,b,c,d,e,f) = [[a,c,e],[b,d,f],[0,0,1]]
    // 即 a=m0, b=m1, c=m3, d=m4, e=m6, f=m7
    ctx.transform(m[0], m[1], m[3], m[4], m[6], m[7]);
  }

  /** 单节点渲染（基类要求）：以单位矩阵为父矩阵递归绘制 */
  renderElement(record: ElementRecord): boolean {
    if (record.removed) return false;
    this.renderNodeWithCollect(record, IDENTITY_MAT3 as Mat3, [], null);
    return true;
  }

  /** 移除节点：Canvas 无 DOM 概念，移除在下一帧 render 中自动反映 */
  remove(_ids: string[]): void {
    // Canvas 无 DOM 概念；移除在下一帧 render 中自动反映（已 removed 的节点不会被画）
  }

  /** 清空画布及所有缓存 */
  clear(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.linearGradientDefs.clear();
    this.radialGradientDefs.clear();
    this.maskCanvasPool.length = 0;
  }

  /** 销毁渲染器：停止拖拽、移除 Canvas、清空所有缓存 */
  dispose(): void {
    this.stopDrag();
    this.canvas.remove();
    this.imageCache.clear();
    this.linearGradientDefs.clear();
    this.radialGradientDefs.clear();
    this.maskCanvasPool.length = 0;
  }

  /** 调整画布尺寸：按 DPR 设置物理像素，重置变换矩阵 */
  resize(width: number, height: number): void {
    if (this.viewWidth === width && this.viewHeight === height) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewWidth = width;
    this.viewHeight = height;
  }

  // ============ 形状绘制 ============

  /**
   * 绘制矩形
   * 有圆角时使用 roundRect + fill/stroke，无圆角时使用 fillRect/strokeRect
   * @param ctx 2D 上下文
   * @param data 矩形数据
   */
  private drawRect(ctx: CanvasRenderingContext2D, data: RectData): void {
    const bounds = { x: data.x, y: data.y, width: data.width, height: data.height };
    this.applyStyle(ctx, data, bounds);
    const rx = Math.min(data.rx ?? 0, data.width / 2);
    const ry = Math.min(data.ry ?? 0, data.height / 2);
    if (rx > 0 || ry > 0) {
      ctx.beginPath();
      ctx.roundRect(data.x, data.y, data.width, data.height, rx || ry);
      if (data.fill && data.fill !== 'none' && data.fill !== 'transparent') ctx.fill();
      if (data.stroke && data.stroke !== 'none') ctx.stroke();
    } else {
      if (data.fill && data.fill !== 'none' && data.fill !== 'transparent') {
        ctx.fillRect(data.x, data.y, data.width, data.height);
      }
      if (data.stroke && data.stroke !== 'none') {
        ctx.strokeRect(data.x, data.y, data.width, data.height);
      }
    }
    this.resetStrokeExtras(ctx);
  }

  /**
   * 绘制椭圆
   * 使用 ctx.ellipse + fill/stroke
   * @param ctx 2D 上下文
   * @param data 椭圆数据
   */
  private drawEllipse(ctx: CanvasRenderingContext2D, data: EllipseData): void {
    const bounds = { x: data.cx - data.rx, y: data.cy - data.ry, width: data.rx * 2, height: data.ry * 2 };
    ctx.beginPath();
    ctx.ellipse(data.cx, data.cy, data.rx, data.ry, 0, 0, Math.PI * 2);
    this.applyStyle(ctx, data, bounds);
    if (data.fill && data.fill !== 'none' && data.fill !== 'transparent') ctx.fill();
    if (data.stroke && data.stroke !== 'none') ctx.stroke();
    this.resetStrokeExtras(ctx);
  }

  /**
   * 绘制批量圆点
   * @param ctx 2D 上下文
   * @param data 批量圆点数据
   */
  private drawPoints(ctx: CanvasRenderingContext2D, data: PointsData): void {
    const n = getPointsCount(data);
    if (n === 0) return;

    const defaultRx = pointAttr(data.rx, 0, 4);
    const defaultRy = pointAttr(data.ry, 0, defaultRx);
    const defaultFill = pointAttr(data.fill, 0, '#000');
    const defaultStroke = pointAttr(data.stroke, 0, 'none');
    const defaultStrokeWidth = pointAttr(data.strokeWidth, 0, 1);

    for (let i = 0; i < n; i++) {
      const cx = data.cx[i];
      const cy = data.cy[i];
      const rx = pointAttr(data.rx, i, defaultRx);
      const ry = pointAttr(data.ry, i, defaultRy);
      const fill = pointAttr(data.fill, i, defaultFill);
      const stroke = pointAttr(data.stroke, i, defaultStroke);
      const strokeWidth = pointAttr(data.strokeWidth, i, defaultStrokeWidth);
      const bounds = { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 };

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.resolveColor(fill, bounds);
      if (fill && fill !== 'none' && fill !== 'transparent') ctx.fill();
      if (stroke && stroke !== 'none') {
        ctx.strokeStyle = this.resolveColor(stroke, bounds);
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }
    }
  }

  /**
   * 绘制折线/多边形
   * closed 为 true 时填充路径（fill），否则仅描边
   * @param ctx 2D 上下文
   * @param data 折线数据
   */
  private drawLine(ctx: CanvasRenderingContext2D, data: LineData): void {
    if (data.points.length < 2) return;
    let minX = data.points[0].x, minY = data.points[0].y, maxX = minX, maxY = minY;
    for (const p of data.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    ctx.beginPath();
    ctx.moveTo(data.points[0].x, data.points[0].y);
    for (let i = 1; i < data.points.length; i++) {
      ctx.lineTo(data.points[i].x, data.points[i].y);
    }
    if (data.closed) ctx.closePath();
    this.applyStyle(ctx, data, bounds);
    if (data.closed && data.fill && data.fill !== 'none' && data.fill !== 'transparent') {
      ctx.fillStyle = this.resolveColor(data.fill, bounds);
      ctx.fill();
    }
    if (data.stroke && data.stroke !== 'none') {
      ctx.strokeStyle = this.resolveColor(data.stroke ?? '#000', bounds);
      ctx.stroke();
    }
    this.resetStrokeExtras(ctx);
  }

  /**
   * 绘制路径
   * 将 SVG path d 字符串解析为 Path2D 后 fill/stroke
   * @param ctx 2D 上下文
   * @param data 路径数据
   */
  private drawPath(ctx: CanvasRenderingContext2D, data: PathData): void {
    const path = new Path2D(data.d);
    this.applyStyle(ctx, data, null);
    if (data.fill && data.fill !== 'none' && data.fill !== 'transparent') ctx.fill(path);
    if (data.stroke && data.stroke !== 'none') ctx.stroke(path);
    this.resetStrokeExtras(ctx);
  }

  /**
   * 绘制文本
   * 支持多行文本（\n 换行）、textAlign/textBaseline、fillText/strokeText
   * 通过 measureText 估算文字 bounds 用于渐变解析
   * @param ctx 2D 上下文
   * @param data 文本数据
   */
  private drawText(ctx: CanvasRenderingContext2D, data: TextData): void {
    const fontParts: string[] = [];
    if (data.fontWeight) fontParts.push(String(data.fontWeight));
    const fs = data.fontSize ?? 16;
    fontParts.push(`${fs}px`);
    if (data.fontFamily) fontParts.push(data.fontFamily);
    ctx.font = fontParts.join(' ');

    if (data.textAlign) ctx.textAlign = data.textAlign === 'middle' ? 'center' : data.textAlign;
    if (data.textBaseline) ctx.textBaseline = data.textBaseline as CanvasTextBaseline;

    const lineHeight = data.lineHeight ?? fs * 1.2;
    const lines = data.text.split('\n');

    // 估算文字 bounds（用于渐变解析）
    let maxW = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > maxW) maxW = w;
    }
    const totalH = lines.length * lineHeight;
    const alignOffset = data.textAlign === 'middle'
      ? -maxW / 2
      : data.textAlign === 'end'
        ? -maxW
        : 0;
    const textBounds = {
      x: data.x + alignOffset,
      y: data.y - fs,
      width: maxW,
      height: totalH,
    };
    this.applyStyle(ctx, data, textBounds);

    lines.forEach((line, index) => {
      const y = data.y + index * lineHeight;
      if (data.fill && data.fill !== 'none') {
        ctx.fillStyle = this.resolveColor(data.fill, textBounds);
        ctx.fillText(line, data.x, y);
      }
      if (data.stroke && data.stroke !== 'none') {
        ctx.strokeStyle = this.resolveColor(data.stroke, textBounds);
        ctx.lineWidth = data.strokeWidth ?? 1;
        ctx.strokeText(line, data.x, y);
      }
    });
  }

  /**
   * 绘制图片
   * 图片未加载时触发异步加载并跳过本次绘制，加载完成后下一帧自动绘制
   * @param ctx 2D 上下文
   * @param data 图片数据
   * @returns 是否成功绘制
   */
  private drawImage(ctx: CanvasRenderingContext2D, data: ImageData): boolean {
    const cached = this.imageCache.get(data.src);
    if (!cached) {
      this.loadImage(data.src);
      return false;
    }
    if (cached.complete && cached.naturalWidth > 0) {
      const rect = computeImageDrawRect(data, cached.naturalWidth, cached.naturalHeight);
      ctx.drawImage(cached, rect.dx, rect.dy, rect.dw, rect.dh);
      return true;
    }
    return false;
  }

  /** 异步加载图片：创建 Image 对象并缓存 */
  private loadImage(src: string): void {
    if (this.imageCache.has(src)) return;
    const img = new Image();
    img.src = src;
    this.imageCache.set(src, img);
  }

  /**
   * 设置 fill/stroke/strokeWidth/dash/shadow 等绘制样式
   * fill 和 stroke 会通过 resolveColor 解析渐变引用
   * @param ctx 2D 上下文
   * @param data 画笔数据
   * @param _bounds 元素包围盒（用于渐变坐标计算）
   */
  private applyStyle(
    ctx: CanvasRenderingContext2D,
    data: { fill?: string; stroke?: string; strokeWidth?: number; strokeDasharray?: string; shadowBlur?: number; shadowColor?: string; shadowOffsetX?: number; shadowOffsetY?: number },
    _bounds: { x: number; y: number; width: number; height: number } | null,
  ): void {
    if (data.fill && data.fill !== 'none' && data.fill !== 'transparent') {
      ctx.fillStyle = this.resolveColor(data.fill, _bounds);
    }
    if (data.stroke && data.stroke !== 'none') {
      ctx.strokeStyle = this.resolveColor(data.stroke, _bounds);
    }
    if (data.strokeWidth !== undefined) ctx.lineWidth = data.strokeWidth;
    const dash = parseDashArray(data.strokeDasharray);
    ctx.setLineDash(dash ?? []);
    if (data.shadowBlur) {
      ctx.shadowBlur = data.shadowBlur;
      ctx.shadowColor = data.shadowColor ?? 'rgba(0,0,0,0.3)';
      ctx.shadowOffsetX = data.shadowOffsetX ?? 0;
      ctx.shadowOffsetY = data.shadowOffsetY ?? 0;
    }
  }

  /** 重置描边附加效果：清除虚线数组和阴影模糊 */
  private resetStrokeExtras(ctx: CanvasRenderingContext2D): void {
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }

  /**
   * 解析颜色：如果值是 url(#id) 格式则查找渐变定义并创建 CanvasGradient
   * 否则直接返回原始颜色字符串
   * @param value 颜色值或渐变引用
   * @param _bounds 元素包围盒（用于渐变坐标计算）
   * @returns 颜色字符串或 CanvasGradient
   */
  private resolveColor(value: string, _bounds?: { x: number; y: number; width: number; height: number } | null): string | CanvasGradient {
    const gradId = extractGradientId(value);
    if (gradId && _bounds) {
      const linear = this.linearGradientDefs.get(gradId);
      if (linear) {
        return this.createLinearGrad(linear, _bounds);
      }
      const radial = this.radialGradientDefs.get(gradId);
      if (radial) {
        return this.createRadialGrad(radial, _bounds);
      }
    }
    return value;
  }

  /**
   * 创建线性渐变 CanvasGradient
   * 支持 objectBoundingBox 和 userSpaceOnUse 两种坐标单位
   * @param d 渐变定义
   * @param bounds 元素包围盒
   * @returns CanvasGradient 对象
   */
  private createLinearGrad(d: LinearGradientData, bounds: { x: number; y: number; width: number; height: number }): CanvasGradient {
    let { x1, y1, x2, y2 } = d;
    if (d.gradientUnits === 'objectBoundingBox') {
      x1 = bounds.x + x1 * bounds.width;
      y1 = bounds.y + y1 * bounds.height;
      x2 = bounds.x + x2 * bounds.width;
      y2 = bounds.y + y2 * bounds.height;
    }
    const grad = this.ctx.createLinearGradient(x1, y1, x2, y2);
    for (const s of d.stops) grad.addColorStop(s.offset, s.color);
    return grad;
  }

  /**
   * 创建径向渐变 CanvasGradient
   * 支持 objectBoundingBox 和 userSpaceOnUse 两种坐标单位
   * @param d 渐变定义
   * @param bounds 元素包围盒
   * @returns CanvasGradient 对象
   */
  private createRadialGrad(d: RadialGradientData, bounds: { x: number; y: number; width: number; height: number }): CanvasGradient {
    let { cx, cy, r } = d;
    const fx = d.fx ?? cx;
    const fy = d.fy ?? cy;
    if (d.gradientUnits === 'objectBoundingBox') {
      cx = bounds.x + cx * bounds.width;
      cy = bounds.y + cy * bounds.height;
      r = r * Math.max(bounds.width, bounds.height) / 2;
    }
    return this.ctx.createRadialGradient(fx, fy, 0, cx, cy, r);
  }

  /** 缓存线性渐变定义 */
  private cacheLinearGradient(data: LinearGradientData): void {
    this.linearGradientDefs.set(data.id, data);
  }

  /** 缓存径向渐变定义 */
  private cacheRadialGradient(data: RadialGradientData): void {
    this.radialGradientDefs.set(data.id, data);
  }


  /**
   * 根据 ClipPathData 创建 clipping path 并应用到当前上下文
   * 支持 rect（ctx.rect）、ellipse（ctx.ellipse）、path（Path2D）三种形状
   * @param data 裁剪路径定义
   */
  private applyClipShape(data: ClipPathData): void {
    const ctx = this.ctx;
    ctx.beginPath();
    switch (data.shapeType) {
      case 'rect': {
        const d = data.shapeData as RectData;
        ctx.rect(d.x, d.y, d.width, d.height);
        break;
      }
      case 'ellipse': {
        const d = data.shapeData as EllipseData;
        ctx.ellipse(d.cx, d.cy, d.rx, d.ry, 0, 0, Math.PI * 2);
        break;
      }
      case 'path': {
        const d = data.shapeData as PathData;
        ctx.clip(new Path2D(d.d));
        return;
      }
    }
    ctx.clip();
  }

  // ---- Filter ----

  /**
   * 将 FilterEffect[] 拼接为 CSS filter 字符串供 ctx.filter 使用
   * 支持 blur/brightness/contrast/dropShadow/grayscale/opacity/saturate/sepia/hueRotate
   * @param effects 滤镜效果数组
   * @returns CSS filter 字符串
   */
  private buildCssFilter(effects: FilterEffect[]): string {
    return effects.map((e) => {
      switch (e.type) {
        case 'blur':
          return `blur(${e.value}px)`;
        case 'brightness':
          return `brightness(${e.value})`;
        case 'contrast':
          return `contrast(${e.value}%)`;
        case 'dropShadow':
          return `drop-shadow(${e.offsetX ?? 0}px ${e.offsetY ?? 0}px ${e.value}px ${e.color ?? 'rgba(0,0,0,0.5)'})`;
        case 'grayscale':
          return `grayscale(${e.value}%)`;
        case 'opacity':
          return `opacity(${e.value}%)`;
        case 'saturate':
          return `saturate(${e.value}%)`;
        case 'sepia':
          return `sepia(${e.value}%)`;
        case 'hueRotate':
          return `hue-rotate(${e.value}deg)`;
        default:
          return '';
      }
    }).filter(Boolean).join(' ');
  }

  // ---- Mask ----


  /**
   * 从池中取一块与主画布同尺寸的离屏 Canvas
   * @param width 物理像素宽
   * @param height 物理像素高
   */
  private acquireMaskCanvas(width: number, height: number): HTMLCanvasElement {
    const cached = this.maskCanvasPool.pop();
    if (cached && cached.width === width && cached.height === height) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * 归还离屏 Canvas 到池
   * @param canvas 离屏画布
   */
  private releaseMaskCanvas(canvas: HTMLCanvasElement): void {
    this.maskCanvasPool.push(canvas);
  }

  /**
   * 开始遮罩：分配独立离屏 Canvas（可嵌套，互不共用）
   * @returns 离屏上下文与画布，或 null
   */
  private beginMask(): {
    maskCtx: CanvasRenderingContext2D;
    origCtx: CanvasRenderingContext2D;
    offscreen: HTMLCanvasElement;
  } | null {
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    if (canvasW <= 0 || canvasH <= 0) return null;

    const offscreen = this.acquireMaskCanvas(canvasW, canvasH);
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) {
      this.releaseMaskCanvas(offscreen);
      return null;
    }

    offCtx.setTransform(1, 0, 0, 1, 0, 0);
    offCtx.clearRect(0, 0, canvasW, canvasH);
    offCtx.setTransform(this.ctx.getTransform());

    return { maskCtx: offCtx, origCtx: this.ctx, offscreen };
  }

  /**
   * 结束遮罩：将本层离屏内容按 mask 形状合成回 origCtx，并归还画布
   * @param origCtx 合成目标上下文（可能是主画布或外层 mask 离屏）
   * @param maskData 遮罩定义
   * @param offscreen 本层离屏画布
   */
  private endMask(
    origCtx: CanvasRenderingContext2D,
    maskData: MaskData,
    offscreen: HTMLCanvasElement,
  ): void {
    const canvasW = offscreen.width;
    const canvasH = offscreen.height;

    const maskShapeCanvas = document.createElement('canvas');
    maskShapeCanvas.width = canvasW;
    maskShapeCanvas.height = canvasH;
    const maskShapeCtx = maskShapeCanvas.getContext('2d');
    if (!maskShapeCtx) {
      this.releaseMaskCanvas(offscreen);
      return;
    }

    maskShapeCtx.setTransform(origCtx.getTransform());
    this.drawMaskShape(maskShapeCtx, maskData);

    maskShapeCtx.setTransform(1, 0, 0, 1, 0, 0);
    maskShapeCtx.globalCompositeOperation = 'source-in';
    maskShapeCtx.drawImage(offscreen, 0, 0);

    origCtx.save();
    origCtx.setTransform(1, 0, 0, 1, 0, 0);
    origCtx.drawImage(maskShapeCanvas, 0, 0);
    origCtx.restore();

    this.releaseMaskCanvas(offscreen);
  }

  /**
   * 在指定 ctx 上绘制 mask 形状（白色填充，alpha 模式用作透明度遮罩）
   * @param ctx 2D 上下文
   * @param data 遮罩定义
   */
  private drawMaskShape(ctx: CanvasRenderingContext2D, data: MaskData): void {
    ctx.beginPath();
    switch (data.shapeType) {
      case 'rect': {
        const d = data.shapeData as RectData;
        ctx.rect(d.x, d.y, d.width, d.height);
        break;
      }
      case 'ellipse': {
        const d = data.shapeData as EllipseData;
        ctx.ellipse(d.cx, d.cy, d.rx, d.ry, 0, 0, Math.PI * 2);
        break;
      }
      case 'path': {
        const d = data.shapeData as PathData;
        // path 直接 clip 后 fill
        const p = new Path2D(d.d);
        ctx.fillStyle = '#fff';
        ctx.fill(p);
        return;
      }
    }
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}

export { CanvasRenderer };
