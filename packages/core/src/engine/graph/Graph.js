import { Model } from '../Model';
import { SVGRenderer } from '../renderer/SVGRenderer';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { Scheduler } from '../utils/Scheduler';
import { EventSystem } from './EventSystem';
/**
 * Graph —— 总控大脑（SceneTree 驱动版）
 *
 * 数据流：
 *   React shape 组件 → VizContext.register → SceneTree
 *   SceneTree 变更 → 下一帧 syncFromSceneTree → Model
 *   Model 脏子树根 → Renderer.render(roots) → 递归画
 *
 * 职责：
 * - 持有 Model / Renderer / Scheduler / EventSystem 四大核心实例
 * - 协调挂载、渲染循环、视口设置、拖拽注册、事件分发
 * - 提供 applyScene() 将 SceneTree 变更同步到渲染管线
 */
class Graph {
    model;
    renderer;
    scheduler;
    eventSystem;
    disposed = false;
    mounted = false;
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
        // 初始裁剪边距（挂载后容器尺寸确定时再次调用）
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
        this.scheduler.run(this.onFrame);
        this.mounted = true;
    }
    // ========== 对外 API（供根组件 ReactVizComposer 调用） ==========
    /**
     * 应用 SceneTree 变更：每帧 SceneTree 修改后调用
     * 内部做增量同步，Model 自动维护父子关系和脏标记
     * @param sceneRoot SceneTree 根节点
     */
    applyScene(sceneRoot) {
        this.model.syncFromSceneTree(sceneRoot);
    }
    /** 立即触发一帧渲染（用于 resize 后等场景） */
    renderFrame() {
        this.doRender();
    }
    /** 注册拖拽处理器 */
    registerDrag(id, onDrag, onDragEnd, evt) {
        this.renderer.registerDrag(id, onDrag, onDragEnd, evt);
    }
    /** 将任务推入 Scheduler 队列（按时间预算分帧执行） */
    enqueueJob(fn, priority = 0) {
        this.scheduler.enqueueJob(fn, priority);
    }
    /** 注册每帧回调（与渲染循环共用 rAF） */
    requestFrame(fn) {
        return this.scheduler.requestFrame(fn);
    }
    /** 获取当前视口状态 */
    getViewport() {
        return this.renderer.getViewport();
    }
    /**
     * 设置视口（相机）变换
     * 视口变化会导致所有元素 worldMatrix 标记为脏
     */
    setViewport(viewport) {
        if (!this.renderer.setViewport(viewport))
            return;
        // 视口变化 → 全量重画
        for (const r of this.model.getAllElements()) {
            r.dirty = true;
            r.worldMatrixDirty = true;
        }
    }
    /** 设置视口裁剪边距 */
    setCullMargin(margin, containerWidth, containerHeight) {
        this.renderer.setCullMargin(margin, containerWidth, containerHeight);
    }
    /** 订阅场景变更（SceneTree 通知时调用） */
    subscribe(fn) {
        this.notifyHandlers.push(fn);
        return () => {
            this.notifyHandlers = this.notifyHandlers.filter((f) => f !== fn);
        };
    }
    /** 主动通知所有订阅者 */
    notifySubscribers() {
        for (const fn of this.notifyHandlers)
            fn();
    }
    /** 查询 Model 中元素 */
    getElement(id) {
        return this.model.getElement(id);
    }
    // ========== 生命周期 ==========
    /** 销毁 Graph：停止渲染循环，释放所有资源 */
    dispose() {
        this.scheduler.dispose();
        this.renderer.dispose();
        this.eventSystem.dispose();
        this.model.clear();
        this.notifyHandlers = [];
        this.disposed = true;
        this.mounted = false;
    }
    /**
     * 响应容器尺寸变化
     * resize 后所有元素标记为脏 → 触发全量重画
     */
    resize(width, height) {
        if (this.disposed)
            return;
        this.renderer.resize(width, height);
        for (const r of this.model.getAllElements()) {
            r.dirty = true;
            r.worldMatrixDirty = true;
        }
        this.doRender();
    }
    get isDisposed() {
        return this.disposed;
    }
    // ========== 渲染循环 ==========
    /** 每帧回调：由 Scheduler rAF 驱动 */
    onFrame = () => {
        this.doRender();
    };
    /**
     * 执行一帧渲染
     * 1. 物理删除已标记 removed 的元素
     * 2. 把所有 top-level 元素交给 renderer
     *    - Canvas 必须全画布重画（buffer 总是被清空）
     *    - SVG 在 renderNode 内部用 node.dirty 决定是否更新 DOM
     *    - "脏标记"只决定 Model 层数据是否需要同步，不决定是否重画
     */
    doRender() {
        if (this.disposed)
            return;
        // 1. 物理删除 removed
        if (this.model.hasRemoved()) {
            this.renderer.remove(this.model.getRemovedIds());
            this.model.flushRemoved();
        }
        // 2. 收集所有 top-level 元素交给 renderer
        const roots = this.model.getTopLevelElements();
        if (roots.length > 0) {
            this.renderer.render(roots);
        }
    }
}
export { Graph };
