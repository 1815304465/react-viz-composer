import { Model, type SyncDelta } from '../Model';
import { SVGRenderer } from '../renderer/SVGRenderer';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { Scheduler } from '../utils/Scheduler';
import { EventSystem } from './EventSystem';
import type { SceneNode, SceneTree, SceneChangeReason } from './SceneTree';
import type { GraphOptions, Viewport, VizDragEventHandler } from '../types';
import type { ViewportCullMargin } from '../renderer/Renderer';

/**
 * Graph —— 总控大脑（SceneTree 驱动版）
 *
 * 渲染策略：
 * - 静态场景：Model 无脏节点时跳过 render，Scheduler 自动暂停 rAF
 * - Canvas：有脏节点时全画布重画
 * - SVG：有脏节点时遍历树，仅更新 dirty DOM
 */
class Graph {
  readonly model: Model;
  readonly renderer: CanvasRenderer | SVGRenderer;
  readonly scheduler: Scheduler;
  readonly eventSystem: EventSystem;

  private disposed = false;
  private mounted = false;
  private forceRender = false;
  private lastSyncDelta: SyncDelta | null = null;
  private notifyHandlers: Array<() => void> = [];
  /** 裁剪边距配置；空对象表示四边走默认 20% */
  private cullMarginOpt: ViewportCullMargin = {};

  constructor(options: GraphOptions = {}) {
    const { engine = 'svg', cullMargin } = options;

    this.model = new Model();

    this.renderer =
      engine === 'canvas'
        ? new CanvasRenderer()
        : new SVGRenderer();

    this.scheduler = new Scheduler();
    this.eventSystem = new EventSystem(this.model);

    this.scheduler.setContinueCheck(() => this.needsRender());

    this.cullMarginOpt = cullMargin ?? {};
  }

  /** 将渲染目标挂载到 DOM 容器，启动渲染循环 */
  mount(container: HTMLElement): void {
    if (this.mounted) return;
    this.disposed = false;

    this.renderer.mount(container);
    this.renderer.setEventSystem(this.eventSystem);
    this.renderer.setModel(this.model);

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.renderer.resize(rect.width, rect.height);
      // 未显式传边时默认四边各 20% 画布尺寸
      this.renderer.setCullMargin(this.cullMarginOpt, rect.width, rect.height);
    }

    this.forceRender = true;
    this.scheduler.run(this.onFrame);
    this.mounted = true;
  }

  /**
   * 应用 SceneTree 变更（结构变更全量同步，数据更新增量同步）
   * @param sceneTree SceneTree 实例
   * @param reason 变更原因
   */
  applySceneChange(sceneTree: SceneTree, reason: SceneChangeReason): void {
    if (reason === 'register' || reason === 'unregister') {
      this.lastSyncDelta = this.model.syncFromSceneTree(sceneTree.root);
      sceneTree.clearDirtyAfterSync();
    } else {
      const dirtyRoots = sceneTree.drainDirtySubtreeRoots();
      if (dirtyRoots.length === 0) return;
      this.lastSyncDelta = this.model.syncDirtyNodes(sceneTree, dirtyRoots);
    }
    this.scheduler.wake();
  }

  /**
   * @deprecated 使用 applySceneChange
   */
  applyScene(sceneRoot: SceneNode): void {
    this.lastSyncDelta = this.model.syncFromSceneTree(sceneRoot);
    this.scheduler.wake();
  }

  /** 立即触发一帧渲染 */
  renderFrame(): void {
    this.forceRender = true;
    this.scheduler.wake();
    this.doRender();
  }

  registerDrag(id: string, onDrag: VizDragEventHandler, onDragEnd: VizDragEventHandler, evt: MouseEvent): void {
    this.renderer.registerDrag(id, onDrag, onDragEnd, evt);
  }

  enqueueJob(fn: () => void, priority = 0): void {
    this.scheduler.enqueueJob(fn, priority);
  }

  requestFrame(fn: () => void): () => void {
    return this.scheduler.requestFrame(fn);
  }

  getViewport(): Viewport {
    return this.renderer.getViewport();
  }

  setViewport(viewport: Viewport): void {
    if (!this.renderer.setViewport(viewport)) return;
    this.forceRender = true;
    for (const r of this.model.getAllElements()) {
      r.dirty = true;
      r.worldMatrixDirty = true;
    }
    this.scheduler.wake();
  }

  setCullMargin(margin: ViewportCullMargin, containerWidth: number, containerHeight: number): void {
    this.cullMarginOpt = margin;
    this.renderer.setCullMargin(margin, containerWidth, containerHeight);
    this.forceRender = true;
    this.scheduler.wake();
  }

  subscribe(fn: () => void): () => void {
    this.notifyHandlers.push(fn);
    return () => {
      this.notifyHandlers = this.notifyHandlers.filter((f) => f !== fn);
    };
  }

  notifySubscribers(): void {
    for (const fn of this.notifyHandlers) fn();
  }

  getElement(id: string) {
    return this.model.getElement(id);
  }

  dispose(): void {
    this.scheduler.dispose();
    this.renderer.dispose();
    this.eventSystem.dispose();
    this.model.clear();
    this.notifyHandlers = [];
    this.disposed = true;
    this.mounted = false;
  }

  resize(width: number, height: number): void {
    if (this.disposed) return;
    this.renderer.resize(width, height);
    this.forceRender = true;
    for (const r of this.model.getAllElements()) {
      r.dirty = true;
      r.worldMatrixDirty = true;
    }
    this.doRender();
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  /** 是否需要继续渲染（供 Scheduler 空闲检测） */
  private needsRender(): boolean {
    return this.forceRender || this.model.hasDirty() || this.model.hasRemoved();
  }

  private onFrame = (): void => {
    this.doRender();
  };

  private doRender(): void {
    if (this.disposed) return;

    const mustRender = this.forceRender || this.model.hasDirty() || this.model.hasRemoved();
    if (!mustRender) return;

    const isCanvas = this.renderer instanceof CanvasRenderer;
    const structural = this.forceRender
      || (this.lastSyncDelta?.newIds.length ?? 0) > 0
      || (this.lastSyncDelta?.removedIds.length ?? 0) > 0;

    if (this.model.hasRemoved()) {
      this.renderer.remove(this.model.getRemovedIds());
      this.model.flushRemoved();
    }

    let roots = isCanvas || structural
      ? this.model.getTopLevelElements()
      : this.model.collectDirtySubtreeRoots();

    if (roots.length > 0) {
      this.renderer.render(roots);
    }

    this.lastSyncDelta = null;
    this.forceRender = false;
  }
}

export { Graph };
