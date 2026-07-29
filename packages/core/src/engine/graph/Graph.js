import { Model } from '../Model';
import { SVGRenderer } from '../renderer/SVGRenderer';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { Scheduler } from '../utils/Scheduler';
import { EventSystem } from './EventSystem';
/**
 * Graph —— 总控大脑（SceneTree 驱动版）
 *
 * 渲染策略：
 * - 静态场景：Model 无脏节点时跳过 render，Scheduler 自动暂停 rAF
 * - Canvas：有脏节点时全画布重画
 * - SVG：有脏节点时遍历树，仅更新 dirty DOM
 */
class Graph {
    model;
    renderer;
    scheduler;
    eventSystem;
    disposed = false;
    mounted = false;
    forceRender = false;
    lastSyncDelta = null;
    notifyHandlers = [];
    constructor(options = {}) {
        const { engine = 'svg', cullMargin } = options;
        this.model = new Model();
        this.renderer =
            engine === 'canvas'
                ? new CanvasRenderer()
                : new SVGRenderer();
        this.scheduler = new Scheduler();
        this.eventSystem = new EventSystem(this.model);
        this.scheduler.setContinueCheck(() => this.needsRender());
        if (cullMargin) {
            this.renderer.setCullMargin(cullMargin, 0, 0);
        }
    }
    /** 将渲染目标挂载到 DOM 容器，启动渲染循环 */
    mount(container) {
        if (this.mounted)
            return;
        this.disposed = false;
        this.renderer.mount(container);
        this.renderer.setEventSystem(this.eventSystem);
        this.renderer.setModel(this.model);
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            this.renderer.resize(rect.width, rect.height);
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
    applySceneChange(sceneTree, reason) {
        if (reason === 'register' || reason === 'unregister') {
            this.lastSyncDelta = this.model.syncFromSceneTree(sceneTree.root);
            sceneTree.clearDirtyAfterSync();
        }
        else {
            const dirtyRoots = sceneTree.drainDirtySubtreeRoots();
            if (dirtyRoots.length === 0)
                return;
            this.lastSyncDelta = this.model.syncDirtyNodes(sceneTree, dirtyRoots);
        }
        this.scheduler.wake();
    }
    /**
     * @deprecated 使用 applySceneChange
     */
    applyScene(sceneRoot) {
        this.lastSyncDelta = this.model.syncFromSceneTree(sceneRoot);
        this.scheduler.wake();
    }
    /** 立即触发一帧渲染 */
    renderFrame() {
        this.forceRender = true;
        this.scheduler.wake();
        this.doRender();
    }
    registerDrag(id, onDrag, onDragEnd, evt) {
        this.renderer.registerDrag(id, onDrag, onDragEnd, evt);
    }
    enqueueJob(fn, priority = 0) {
        this.scheduler.enqueueJob(fn, priority);
    }
    requestFrame(fn) {
        return this.scheduler.requestFrame(fn);
    }
    getViewport() {
        return this.renderer.getViewport();
    }
    setViewport(viewport) {
        if (!this.renderer.setViewport(viewport))
            return;
        this.forceRender = true;
        for (const r of this.model.getAllElements()) {
            r.dirty = true;
            r.worldMatrixDirty = true;
        }
        this.scheduler.wake();
    }
    setCullMargin(margin, containerWidth, containerHeight) {
        this.renderer.setCullMargin(margin, containerWidth, containerHeight);
        this.forceRender = true;
        this.scheduler.wake();
    }
    subscribe(fn) {
        this.notifyHandlers.push(fn);
        return () => {
            this.notifyHandlers = this.notifyHandlers.filter((f) => f !== fn);
        };
    }
    notifySubscribers() {
        for (const fn of this.notifyHandlers)
            fn();
    }
    getElement(id) {
        return this.model.getElement(id);
    }
    dispose() {
        this.scheduler.dispose();
        this.renderer.dispose();
        this.eventSystem.dispose();
        this.model.clear();
        this.notifyHandlers = [];
        this.disposed = true;
        this.mounted = false;
    }
    resize(width, height) {
        if (this.disposed)
            return;
        this.renderer.resize(width, height);
        this.forceRender = true;
        for (const r of this.model.getAllElements()) {
            r.dirty = true;
            r.worldMatrixDirty = true;
        }
        this.doRender();
    }
    get isDisposed() {
        return this.disposed;
    }
    /** 是否需要继续渲染（供 Scheduler 空闲检测） */
    needsRender() {
        return this.forceRender || this.model.hasDirty() || this.model.hasRemoved();
    }
    onFrame = () => {
        this.doRender();
    };
    doRender() {
        if (this.disposed)
            return;
        const mustRender = this.forceRender || this.model.hasDirty() || this.model.hasRemoved();
        if (!mustRender)
            return;
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
