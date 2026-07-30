/**
 * Scheduler —— requestAnimationFrame 调度循环 + 时间预算 Job 队列
 *
 * 关键能力：
 * - requestAnimationFrame 主循环（与 Graph 共用）
 * - 空闲时自动暂停 rAF，scene 变更时 wake 唤醒
 * - frameCallbacks：每帧回调（Animation tick 等）
 * - job 队列：按时间预算分帧处理（onComplete 等帧末回调）
 */

interface Job {
  fn: () => void;
  priority: number;
}

/** 默认每帧留给 job 队列的执行时间上限（ms） */
const DEFAULT_FRAME_BUDGET = 8;

interface SchedulerOptions {
  frameBudget?: number;
}

class Scheduler {
  private rafId = 0;
  private running = false;
  private onFrame: (() => void) | null = null;
  private queue: Job[] = [];
  private frameBudget: number;
  private frameCallbacks = new Set<() => void>();
  private continueCheck: (() => boolean) | null = null;

  constructor(options: SchedulerOptions = {}) {
    this.frameBudget = options.frameBudget ?? DEFAULT_FRAME_BUDGET;
  }

  /** 设置「是否需要继续 rAF」的外部检查（由 Graph 注入） */
  setContinueCheck(fn: (() => boolean) | null): void {
    this.continueCheck = fn;
  }

  /** 唤醒 rAF 循环（scene 脏 / 强制渲染时调用） */
  wake(): void {
    if (this.running || !this.onFrame) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this.loop);
  }

  run(onFrame: () => void): void {
    this.onFrame = onFrame;
    this.wake();
  }

  enqueueJob(fn: () => void, priority = 0): void {
    this.queue.push({ fn, priority });
    this.wake();
  }

  requestFrame(fn: () => void): () => void {
    this.frameCallbacks.add(fn);
    this.wake();
    return () => {
      this.frameCallbacks.delete(fn);
    };
  }

  dispose(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.running = false;
    this.onFrame = null;
    this.queue.length = 0;
    this.frameCallbacks.clear();
    this.continueCheck = null;
  }

  get hasPendingJobs(): boolean {
    return this.queue.length > 0;
  }

  get hasFrameCallbacks(): boolean {
    return this.frameCallbacks.size > 0;
  }

  private shouldContinueLoop(): boolean {
    return (
      this.frameCallbacks.size > 0 ||
      this.queue.length > 0 ||
      (this.continueCheck?.() ?? false)
    );
  }

  private loop = (): void => {
    if (!this.onFrame) return;

    // 1. 动画 tick 等帧回调（可能触发同步 flush + applyScene）
    for (const fn of this.frameCallbacks) {
      fn();
    }

    // 2. 主帧渲染（读取已 flush 的最新 SceneTree 数据）
    this.onFrame();

    // 3. 帧末 job 队列
    if (this.queue.length > 0) {
      this.processJobs();
    }

    if (this.shouldContinueLoop()) {
      this.rafId = requestAnimationFrame(this.loop);
    } else {
      this.rafId = 0;
      this.running = false;
    }
  };

  private processJobs(): void {
    const deadline = performance.now() + this.frameBudget;
    this.queue.sort((a, b) => a.priority - b.priority);
    while (this.queue.length > 0 && performance.now() < deadline) {
      const job = this.queue.shift()!;
      job.fn();
    }
  }
}

export { Scheduler, type SchedulerOptions };
