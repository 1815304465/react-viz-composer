/**
 * Scheduler —— requestAnimationFrame 调度循环 + 时间预算 Job 队列 + 脏节点分批
 *
 * 关键能力：
 * - requestAnimationFrame 主循环（与 Graph 共用）
 * - frameCallbacks：每帧回调（Animation tick 等）
 * - job 队列：按时间预算分帧处理（onComplete 等帧末回调）
 * - dirtyNodeHandlers：脏节点分批处理（按时间预算分帧推送）
 * - dispose 取消循环并清空所有队列
 */
/** 默认每帧留给 job 队列的执行时间上限（ms），保证 60fps 余量 */
const DEFAULT_FRAME_BUDGET = 8;
class Scheduler {
    rafId = 0;
    onFrame = null;
    queue = [];
    frameBudget;
    frameCallbacks = new Set();
    dirtyNodeHandlers = [];
    constructor(options = {}) {
        this.frameBudget = options.frameBudget ?? DEFAULT_FRAME_BUDGET;
        void options.dirtyBatch; // 保留参数，备用
    }
    /** 传入每帧主回调并立即启动 requestAnimationFrame 循环 */
    run(onFrame) {
        this.onFrame = onFrame;
        this.loop();
    }
    /**
     * 将任务推入队列，按时间预算分帧执行
     * @param fn 任务函数
     * @param priority 优先级（越小越优先）
     */
    enqueueJob(fn, priority = 0) {
        this.queue.push({ fn, priority });
    }
    /**
     * 注册每帧回调（与渲染循环共用同一 rAF）
     * @param fn 每帧回调函数
     * @returns 取消注册的函数
     */
    requestFrame(fn) {
        this.frameCallbacks.add(fn);
        return () => {
            this.frameCallbacks.delete(fn);
        };
    }
    /**
     * 注册脏节点批处理回调：每帧从队列取一批节点交给回调
     * 回调负责实际 push 到 Model/SceneTree
     * @param handler 批处理回调
     * @returns 取消注册的函数
     */
    registerDirtyNodeHandler(handler) {
        this.dirtyNodeHandlers.push(handler);
        return () => {
            this.dirtyNodeHandlers = this.dirtyNodeHandlers.filter((h) => h !== handler);
        };
    }
    /** 取消调度，停止 rAF 循环并清空所有队列 */
    dispose() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
        }
        this.onFrame = null;
        this.queue.length = 0;
        this.frameCallbacks.clear();
        this.dirtyNodeHandlers = [];
    }
    /** 队列是否还有未处理的任务 */
    get hasPendingJobs() {
        return this.queue.length > 0;
    }
    // ========== 内部 ==========
    /**
     * rAF 主循环
     * 1. 执行帧回调（animation tick 等）
     * 2. 执行主帧渲染
     * 3. 在剩余时间预算内处理 job 队列
     */
    loop = () => {
        if (!this.onFrame)
            return;
        this.rafId = requestAnimationFrame(this.loop);
        // 1. 帧回调（animation tick 等）
        for (const fn of this.frameCallbacks) {
            fn();
        }
        // 2. 主帧渲染
        this.onFrame();
        // 3. 在剩余时间预算内处理 job 队列
        if (this.queue.length > 0) {
            this.processJobs();
        }
    };
    /**
     * 按优先级和时间预算处理 job 队列
     * 在帧剩余时间内尽可能多地执行任务，超时则留到下一帧
     */
    processJobs() {
        const deadline = performance.now() + this.frameBudget;
        this.queue.sort((a, b) => a.priority - b.priority);
        while (this.queue.length > 0 && performance.now() < deadline) {
            const job = this.queue.shift();
            job.fn();
        }
    }
}
export { Scheduler };
