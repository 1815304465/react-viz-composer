import type { ElementRecord, Viewport, VizDragEventHandler, Transform } from '../types';
import type { EventSystem } from '../graph/EventSystem';
import type { Model } from '../Model';
import { IDENTITY_MAT3, type Mat3 } from '../utils/constants/matrix';
import {
  transformToMatrix, multiplyMat3,
  estimateLocalBounds, boundsIntersectViewport,
} from '../utils';

/** 默认视口：不缩放、不平移 */
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

/**
 * 视口各方向扩展边距（用于可视区域裁剪）
 * 正值向外扩展（提前渲染视口外的内容，减少 pop-in），
 * 负值向内收缩（更激进裁剪）。
 * 默认值为画布尺寸的 20%，即四边各扩展 20% 的宽高。
 */
interface ViewportCullMargin {
  /** 上边距（CSS 像素） */
  top?: number;
  /** 右边距（CSS 像素） */
  right?: number;
  /** 下边距（CSS 像素） */
  bottom?: number;
  /** 左边距（CSS 像素） */
  left?: number;
}

/**
 * Renderer —— 抽象渲染器基类（递归版）
 *
 * 提供渲染器共用的能力：
 * - viewport 视口管理
 * - 可视区域裁剪（cullMargin + AABB 检查）
 * - worldMatrix 合成（renderNode 递归模板方法）
 * - 局部包围盒估算（estimateLocalBounds，已提取到 utils/bounds.ts）
 *
 * 子类需实现：
 * - mount / resize / render / renderElement / remove / clear / dispose
 * - drawSelf（具体形状绘制）
 * - startDrag / stopDrag
 */
abstract class Renderer {
  protected container: HTMLElement | null = null;
  protected eventSystem: EventSystem | null = null;
  protected model: Model | null = null;

  /** 视口（相机）状态 */
  protected viewport: Viewport = { ...DEFAULT_VIEWPORT };

  /** 画布尺寸（mount/resize 时更新） */
  protected viewWidth = 0;
  protected viewHeight = 0;

  /** 可视区域裁剪边距 */
  protected cullMargin: Required<ViewportCullMargin> = { top: 0, right: 0, bottom: 0, left: 0 };

  /** 注入 Model */
  setModel(model: Model): void {
    this.model = model;
  }

  /**
   * 设置裁剪边距（传入画布尺寸的百分比；边距不能小于 0 即不允许向内收缩）
   * @param margin 裁剪边距
   * @param canvasWidth 画布宽度
   * @param canvasHeight 画布高度
   */
  setCullMargin(margin: ViewportCullMargin, canvasWidth: number, canvasHeight: number): void {
    this.cullMargin = {
      top: Math.max(0, margin.top ?? canvasHeight * 0.2),
      right: Math.max(0, margin.right ?? canvasWidth * 0.2),
      bottom: Math.max(0, margin.bottom ?? canvasHeight * 0.2),
      left: Math.max(0, margin.left ?? canvasWidth * 0.2),
    };
    // 如果宽高还没设置，在 resize 时再次补调
    if (canvasWidth > 0) this.viewWidth = canvasWidth;
    if (canvasHeight > 0) this.viewHeight = canvasHeight;
  }

  /** 将渲染目标挂载到容器（子类实现） */
  abstract mount(container: HTMLElement): HTMLElement | SVGElement;

  /** 设置事件系统 */
  setEventSystem(es: EventSystem): void {
    this.eventSystem = es;
  }

  /**
   * 设置视口（相机）变换
   * @param v 新视口
   * @returns true 表示 viewport 确实发生了变化
   */
  setViewport(v: Viewport): boolean {
    if (
      this.viewport.x === v.x &&
      this.viewport.y === v.y &&
      this.viewport.scale === v.scale
    ) {
      return false;
    }
    this.viewport = { ...v };
    this.eventSystem?.setViewport(v);
    if (this.model) {
      for (const r of this.model.getAllElements()) r.worldMatrixDirty = true;
    }
    return true;
  }

  /** 获取当前视口状态（返回拷贝） */
  getViewport(): Viewport {
    return { ...this.viewport };
  }

  /** 启动拖拽监听（子类实现具体逻辑） */
  registerDrag(id: string, onDrag: VizDragEventHandler, onDragEnd: VizDragEventHandler, evt: MouseEvent): void {
    this.startDrag(id, onDrag, onDragEnd, evt);
  }

  protected abstract startDrag(id: string, onDrag: VizDragEventHandler, onDragEnd: VizDragEventHandler, evt: MouseEvent): void;
  protected abstract stopDrag(): void;

  /** 渲染入口：接收所有 top-level 元素 */
  abstract render(roots: ElementRecord[]): void;
  /** 渲染单个元素 */
  abstract renderElement(record: ElementRecord): boolean;
  /** 移除指定 id 的元素 */
  abstract remove(ids: string[]): void;
  /** 清空渲染内容 */
  abstract clear(): void;
  /** 销毁渲染器 */
  abstract dispose(): void;
  /** 响应画布尺寸变化 */
  abstract resize(width: number, height: number): void;

  // ========== 可视区域裁剪 ==========

  /**
   * 获取当前可视区域的世界坐标范围（考虑 viewport 变换 + 边距）
   * @returns 可视区域的世界坐标，边距全为 0 时返回 null 表示不做裁剪
   */
  protected getVisibleBounds(): { x: number; y: number; w: number; h: number } | null {
    const { top, right, bottom, left } = this.cullMargin;
    if (top === 0 && right === 0 && bottom === 0 && left === 0) return null;

    const { x: vx, y: vy, scale } = this.viewport;
    const invScale = 1 / scale;

    // 视口在画布坐标系中的可见范围
    const visX = -vx - left;
    const visY = -vy - top;
    const visW = this.viewWidth + left + right;
    const visH = this.viewHeight + top + bottom;

    // 转换到世界坐标
    return {
      x: visX * invScale,
      y: visY * invScale,
      w: visW * invScale,
      h: visH * invScale,
    };
  }

  /**
   * 判断一个节点是否在可视区域内（粗略 AABB 检查）
   * 子类在递归渲染前调用此方法决定是否跳过
   * @param _node 元素记录
   */
  protected isInViewport(_node: ElementRecord): boolean {
    // 基类默认不过滤；子类（Canvas/SVG）覆盖后加入 bounds 检查
    return true;
  }

  // ========== 递归渲染工具（供子类使用） ==========

  /**
   * 递归渲染节点：合成 worldMatrix → 画自身 → 递归 children
   * @param node 当前节点
   * @param parentMatrix 父节点的世界矩阵
   */
  protected renderNode(node: ElementRecord, parentMatrix: Mat3, _visible?: { x: number; y: number; w: number; h: number } | null): void {
    if (node.removed) return;

    // 1. 合成当前节点的 worldMatrix
    const dataAny = node.data as { transform?: Transform };
    const localMatrix = transformToMatrix(dataAny.transform);
    multiplyMat3(node.worldMatrix, parentMatrix, localMatrix);
    node.worldMatrixDirty = false;

    // 2. 画自己（仅当 dirty 且非 group/animation 容器）
    if (node.dirty && node.type !== 'group' && node.type !== 'animation') {
      this.drawSelf(node);
    }

    // 3. 递归 children
    for (const child of node.children) {
      this.renderNode(child, node.worldMatrix);
    }

    // 4. 清理脏标记
    if (node.dirty) {
      node.dirty = false;
      node.subtreeDirty = false;
    }
  }

  /** 画一个节点（具体绘制逻辑，由子类实现） */
  protected abstract drawSelf(node: ElementRecord): void;
}

export { Renderer, IDENTITY_MAT3, type ViewportCullMargin };
