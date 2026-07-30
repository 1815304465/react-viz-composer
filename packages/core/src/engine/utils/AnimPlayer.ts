import type { SceneNode } from '../graph/SceneTree';
import type {
  AnimComputeContext,
  AnimEasing,
  AnimStep,
  ElementData,
} from '../types';
import {
  applyEasing,
  lerpAnimValue,
  normalizeLoopCount,
  readAnimAttr,
  resolveAnimTargets,
  writeAnimAttr,
} from './animations';

/** AnimPlayer 依赖的 SceneTree / 调度能力（由 React 层注入，引擎零 React） */
export interface AnimPlayerHost {
  /** 按 id 取节点 */
  getNode: (id: string) => SceneNode | undefined;
  /** 取直接子节点 id */
  getChildIds: (id: string) => string[];
  /** 写入 SceneTree（应走缓冲批量 flush） */
  update: (id: string, partial: { data?: Partial<ElementData> }) => void;
  /** 订阅引擎 rAF；返回取消函数 */
  requestFrame: (fn: () => void) => () => void;
  /** 帧末任务队列（onComplete 等） */
  enqueueJob?: (fn: () => void, priority?: number) => void;
}

/** 一次 play() 的配置 */
export interface AnimPlayConfig {
  containerId: string;
  playbook: AnimStep[];
  onComplete?: () => void;
  onCancel?: () => void;
}

/** 已解析的单轨动画（引擎内部） */
interface ResolvedTrack {
  targetId: string;
  index: number;
  attribute?: string;
  from: number | string;
  to: number | string;
  compute?: AnimStep['compute'];
  delay: number;
  duration: number;
  easing: AnimEasing;
  yoyo: boolean;
  sustain: boolean;
}

/** 播放期快照，用于 cancel 还原 */
interface AttrSnapshot {
  targetId: string;
  attribute: string;
  value: number | string;
}

/**
 * AnimPlayer —— 引擎侧动画执行器
 *
 * 职责：把声明式 playbook 解析为 track，在 Scheduler rAF 中插值，
 * 批量写入 SceneTree。不触及 React state。
 */
class AnimPlayer {
  private readonly host: AnimPlayerHost;
  private frameUnsub: (() => void) | null = null;
  private stopped = true;
  private paused = false;
  private pauseOffset = 0;
  private pauseStart = 0;
  private groupStart = 0;
  private groupIndex = 0;
  private cycle = 0;
  private groups: ResolvedTrack[][] = [];
  private sortedGroupKeys: number[] = [];
  private loopRemaining = 0;
  private snapshots: AttrSnapshot[] = [];
  private onComplete: (() => void) | null = null;
  private onCancel: (() => void) | null = null;
  private playing = false;

  constructor(host: AnimPlayerHost) {
    this.host = host;
  }

  /** 是否正在播放（含 pause） */
  get isPlaying(): boolean {
    return this.playing;
  }

  /**
   * 播放 playbook（会取消当前播放）
   * @param config 播放配置
   */
  play(config: AnimPlayConfig): void {
    this.cancel(false);
    const { containerId, playbook, onComplete, onCancel } = config;
    if (!playbook.length) return;

    this.onComplete = onComplete ?? null;
    this.onCancel = onCancel ?? null;
    this.stopped = false;
    this.paused = false;
    this.pauseOffset = 0;
    this.groupIndex = 0;
    this.cycle = 0;
    this.playing = true;
    this.snapshots = [];

    const byGroup = new Map<number, ResolvedTrack[]>();
    let maxLoop = 0;
    let anyInfinite = false;

    for (const step of playbook) {
      const loopCount = normalizeLoopCount(step.loop);
      if (loopCount === -1) anyInfinite = true;
      else if (loopCount > maxLoop) maxLoop = loopCount;

      const tracks = this.resolveStep(containerId, step);
      if (tracks.length === 0) continue;

      const g = step.group ?? 0;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(...tracks);

      // 属性轨：开播前写入 from，并快照原值供 cancel 还原
      for (const track of tracks) {
        if (track.sustain || track.compute) continue;
        if (track.attribute == null) continue;
        const node = this.host.getNode(track.targetId);
        if (!node) continue;
        this.snapshots.push({
          targetId: track.targetId,
          attribute: track.attribute,
          value: readAnimAttr(node.data, node.type, track.attribute),
        });
      }
    }

    this.loopRemaining = anyInfinite ? -1 : maxLoop;
    this.sortedGroupKeys = Array.from(byGroup.keys()).sort((a, b) => a - b);
    this.groups = this.sortedGroupKeys.map((k) => byGroup.get(k)!);

    // 立即把各轨 from 落到场景（入场首帧可见）
    this.applyTrackStarts();

    if (this.groups.length === 0) {
      this.finish(false);
      return;
    }

    this.groupStart = performance.now();
    this.ensureFrameLoop();
  }

  /**
   * 取消播放
   * @param notify 是否触发 onCancel
   * @param restore 是否还原开播前快照（默认 true）
   */
  cancel(notify = true, restore = true): void {
    if (!this.playing && this.stopped) return;

    this.stopped = true;
    this.playing = false;
    this.paused = false;
    this.pauseOffset = 0;
    this.stopFrameLoop();

    if (restore) this.restoreSnapshots();

    const cb = this.onCancel;
    this.onComplete = null;
    this.onCancel = null;
    if (notify && cb) {
      this.host.enqueueJob ? this.host.enqueueJob(cb) : cb();
    }
  }

  /** 暂停 */
  pause(): void {
    if (this.stopped || this.paused || !this.playing) return;
    this.paused = true;
    this.pauseStart = performance.now();
  }

  /** 继续 */
  resume(): void {
    if (this.stopped || !this.paused || !this.playing) return;
    this.pauseOffset += performance.now() - this.pauseStart;
    this.paused = false;
    this.ensureFrameLoop();
  }

  /** 释放资源 */
  dispose(): void {
    this.cancel(false, false);
  }

  /**
   * 将单个 AnimStep 展开为多目标 track
   * @param containerId 容器 id
   * @param step 声明步骤
   */
  private resolveStep(containerId: string, step: AnimStep): ResolvedTrack[] {
    const targetIds = resolveAnimTargets(
      step.targets,
      containerId,
      this.host.getChildIds,
      this.host.getNode,
      step.attribute,
    );
    if (targetIds.length === 0) return [];

    const stagger = step.stagger ?? 0;
    const baseDelay = step.delay ?? 0;
    const duration = step.sustain ? Number.POSITIVE_INFINITY : (step.duration ?? 0);
    const easing = step.easing ?? 'linear';
    const yoyo = step.yoyo === true;
    const sustain = step.sustain === true;

    return targetIds.map((targetId, index) => {
      const node = this.host.getNode(targetId);
      let from: number | string = step.from ?? 0;
      let to: number | string = step.to ?? 0;

      if (step.attribute && node) {
        const current = readAnimAttr(node.data, node.type, step.attribute);
        from = step.from !== undefined ? step.from : current;
        to = step.to !== undefined ? step.to : current;
      }

      return {
        targetId,
        index,
        attribute: step.attribute,
        from,
        to,
        compute: step.compute,
        delay: baseDelay + stagger * index,
        duration,
        easing,
        yoyo,
        sustain,
      };
    });
  }

  /** 开播时写入各轨初始值（属性轨 → from；compute 轨 → progress 0） */
  private applyTrackStarts(): void {
    const batch = new Map<string, Record<string, unknown>>();
    const now = performance.now();

    for (const tracks of this.groups) {
      for (const track of tracks) {
        if (track.sustain) continue;
        const node = this.host.getNode(track.targetId);
        if (!node) continue;

        if (track.compute) {
          const ctx: AnimComputeContext = {
            progress: 0,
            elapsed: 0,
            time: 0,
            index: track.index,
            targetId: track.targetId,
            now,
          };
          const partial = track.compute(ctx) as Record<string, unknown>;
          const existing = batch.get(track.targetId) ?? {};
          batch.set(track.targetId, { ...existing, ...partial });
          continue;
        }

        if (track.attribute == null) continue;
        const partial = batch.get(track.targetId) ?? {};
        writeAnimAttr(node.type, track.attribute, track.from, partial, node.data);
        batch.set(track.targetId, partial);
      }
    }

    this.flushBatch(batch);
  }

  /** 订阅 rAF（幂等） */
  private ensureFrameLoop(): void {
    if (this.frameUnsub) return;
    this.frameUnsub = this.host.requestFrame(() => this.tick());
  }

  /** 取消 rAF 订阅 */
  private stopFrameLoop(): void {
    this.frameUnsub?.();
    this.frameUnsub = null;
  }

  /** 单帧推进 */
  private tick(): void {
    if (this.stopped || this.paused) return;

    const now = performance.now();
    const elapsed = now - this.groupStart - this.pauseOffset;
    const tracks = this.groups[this.groupIndex];
    if (!tracks) {
      this.advanceGroup();
      return;
    }

    const isForward = this.cycle % 2 === 0;
    const batch = new Map<string, Record<string, unknown>>();
    let groupDone = true;
    let hasSustain = false;

    for (const track of tracks) {
      if (track.sustain) {
        hasSustain = true;
        groupDone = false;
        this.writeComputeOrAttr(track, elapsed, now, isForward, batch);
        continue;
      }

      const local = elapsed - track.delay;
      if (local < 0) {
        groupDone = false;
        continue;
      }

      const duration = track.duration > 0 ? track.duration : 0;
      const rawProgress = duration === 0 ? 1 : Math.min(local / duration, 1);
      if (rawProgress < 1) groupDone = false;

      this.writeComputeOrAttr(track, local, now, isForward, batch, rawProgress);
    }

    this.flushBatch(batch);

    if (groupDone && !hasSustain) {
      this.advanceGroup();
    }
  }

  /**
   * 写入单轨当前帧值
   * @param track 轨道
   * @param localElapsed 相对 delay 后的时间
   * @param now 全局 now
   * @param isForward 是否正向
   * @param batch 批量缓冲
   * @param rawProgress 未缓动进度（属性轨）；sustain 可省略
   */
  private writeComputeOrAttr(
    track: ResolvedTrack,
    localElapsed: number,
    now: number,
    isForward: boolean,
    batch: Map<string, Record<string, unknown>>,
    rawProgress = 0,
  ): void {
    const node = this.host.getNode(track.targetId);
    if (!node) return;

    if (track.compute) {
      const progress = track.sustain
        ? 0
        : applyEasing(track.easing, this.directedProgress(rawProgress, track.yoyo, isForward));
      const ctx: AnimComputeContext = {
        progress,
        elapsed: Math.max(0, localElapsed),
        time: Math.max(0, localElapsed) / 1000,
        index: track.index,
        targetId: track.targetId,
        now,
      };
      const partial = track.compute(ctx) as Record<string, unknown>;
      const existing = batch.get(track.targetId) ?? {};
      batch.set(track.targetId, { ...existing, ...partial });
      return;
    }

    if (track.attribute == null) return;

    const progress = applyEasing(
      track.easing,
      this.directedProgress(rawProgress, track.yoyo, isForward),
    );
    const useReverse = track.yoyo && !isForward;
    const value = useReverse
      ? lerpAnimValue(track.to, track.from, progress)
      : lerpAnimValue(track.from, track.to, progress);

    const existing = batch.get(track.targetId) ?? {};
    writeAnimAttr(node.type, track.attribute, value, existing, node.data);
    batch.set(track.targetId, existing);
  }

  /**
   * yoyo / 整剧往返时的进度方向
   * @param raw 原始 0→1
   * @param yoyo 步骤是否 yoyo
   * @param isForward 当前 cycle 是否正向
   */
  private directedProgress(raw: number, yoyo: boolean, isForward: boolean): number {
    if (!yoyo || isForward) return raw;
    return raw;
  }

  /** 进入下一 group 或处理循环 / 结束 */
  private advanceGroup(): void {
    this.groupIndex += 1;
    this.pauseOffset = 0;

    if (this.groupIndex < this.groups.length) {
      this.groupStart = performance.now();
      return;
    }

    // 全部 group 结束 → 循环或完成
    if (this.loopRemaining === -1 || this.loopRemaining > 0) {
      if (this.loopRemaining > 0) this.loopRemaining -= 1;
      this.cycle += 1;
      this.groupIndex = 0;
      this.groupStart = performance.now();
      // 非 yoyo 正向轮：回到 from，避免循环首帧仍停在 to
      if (this.cycle % 2 === 0 || !this.groups.some((g) => g.some((t) => t.yoyo))) {
        this.applyTrackStarts();
      }
      return;
    }

    this.finish(true);
  }

  /**
   * 正常结束
   * @param completed 是否算完成（触发 onComplete）
   */
  private finish(completed: boolean): void {
    this.stopped = true;
    this.playing = false;
    this.stopFrameLoop();

    const cb = this.onComplete;
    this.onComplete = null;
    this.onCancel = null;
    this.snapshots = [];

    if (completed && cb) {
      this.host.enqueueJob ? this.host.enqueueJob(cb) : cb();
    }
  }

  /** 还原开播前属性快照 */
  private restoreSnapshots(): void {
    const batch = new Map<string, Record<string, unknown>>();
    for (const snap of this.snapshots) {
      const node = this.host.getNode(snap.targetId);
      if (!node) continue;
      const partial = batch.get(snap.targetId) ?? {};
      writeAnimAttr(node.type, snap.attribute, snap.value, partial, node.data);
      batch.set(snap.targetId, partial);
    }
    this.flushBatch(batch);
    this.snapshots = [];
  }

  /**
   * 批量 update 到 SceneTree
   * @param batch id → partial data
   */
  private flushBatch(batch: Map<string, Record<string, unknown>>): void {
    for (const [id, data] of batch) {
      this.host.update(id, { data: data as Partial<ElementData> });
    }
  }
}

export { AnimPlayer };
