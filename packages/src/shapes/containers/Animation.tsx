import {
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from 'react';
import {
  useViz,
  useVizFrame,
  useSceneTree,
  ParentIdContext,
} from '../../context';
import { AnimPlayer } from '../../engine/utils/AnimPlayer';
import { DEFAULT_TRANSFORM } from '../../engine/utils/animations';
import { useShapeElement } from '../register';
import type { AnimStep, AnimationData, AnimationHandle } from '../../engine/types';

/* ---- 类型 ---- */

interface WatchSourceConfig {
  id: string;
  /** 嵌套属性路径，如 'transform/x' 或 ['transform', 'x'] */
  path?: string | string[];
}

interface WatchConfig {
  sources: (string | WatchSourceConfig)[];
  /**
   * 当被监听的元素数据变更时调用。
   * 返回 true 表示触发动画 playbook。
   */
  handler: (newValues: Record<string, unknown>, oldValues: Record<string, unknown>) => boolean;
}

interface Props {
  id?: string;
  children?: ReactNode;
  /** 监听配置：数据变更时按需重播 playbook */
  watch?: WatchConfig;
  /**
   * 动画剧本（声明意图）
   *
   * `targets: 'children'` 会穿透 ClipPath / Filter / Mask，作用到真实子形状。
   * 也可以用命名 id（推荐与效果容器混用时）：`targets: 'wave'`。
   *
   * @example 子节点入场（to 取自子节点当前 props）
   * playbook={[
   *   { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
   *   { attribute: 'y', from: 320, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
   * ]}
   *
   * @example Animation 内包 ClipPath（children 仍命中 Path）
   * <Animation playbook={[{ attribute: 'opacity', from: 0, targets: 'children' }]}>
   *   <ClipPath clip={<Ellipse ... />}>
   *     <Path d="..." />
   *   </ClipPath>
   * </Animation>
   *
   * @example 持续自定义（水波等）
   * playbook={[{ sustain: true, targets: 'wave', compute: ({ time }) => ({ d: wavePath(time) }) }]}
   */
  playbook?: AnimStep[];
  /** playbook 全部结束后回调（经 Scheduler 帧末队列触发） */
  onComplete?: () => void;
  /** cancel() 或新 playbook 打断时回调 */
  onCancel?: () => void;
  /** 无 watch 时 mount 是否自动播放，默认 true */
  autoPlay?: boolean;
}

/* ---- 路径解析 ---- */

/**
 * 规范化属性路径
 * @param path 路径字符串或数组
 */
function normalizePath(path: string | string[]): string[] {
  if (Array.isArray(path)) return path.filter(Boolean);
  return path.split('/').filter(Boolean);
}

/**
 * 按路径读取对象字段
 * @param obj 源对象
 * @param path 路径
 */
function resolvePath(obj: Record<string, unknown>, path: string | string[]): unknown {
  const parts = normalizePath(path);
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/**
 * 规范化 watch source
 * @param s 字符串 id 或配置对象
 */
function normalizeSource(s: string | WatchSourceConfig): WatchSourceConfig {
  if (typeof s === 'string') return { id: s };
  return s;
}

/**
 * Animation —— 声明式动画容器（纯代理）
 *
 * React 层只声明 playbook / watch / 生命周期；每帧插值由引擎 AnimPlayer
 * 经 requestFrame → SceneTree.update 完成，不触发 React 重渲染。
 *
 * 自身经 useShapeElement 注册为 `animation` 节点，通过 ParentIdContext 挂载子形状。
 */
function Animation(props: Props, ref: React.Ref<AnimationHandle>) {
  const {
    id: propId,
    children,
    watch,
    playbook,
    onComplete,
    onCancel,
    autoPlay = true,
  } = props;

  const { update } = useViz();
  const { enqueueJob, requestFrame } = useVizFrame();
  const sceneTree = useSceneTree();

  const animData: AnimationData = { transform: { ...DEFAULT_TRANSFORM } };
  const myId = useShapeElement('animation', propId, animData, {});

  const playerRef = useRef<AnimPlayer | null>(null);
  const hostRef = useRef({
    getNode: (id: string) => sceneTree.getNode(id),
    getChildIds: (id: string) => sceneTree.getChildIds(id),
    update,
    requestFrame,
    enqueueJob,
  });
  const prevSnapshotRef = useRef<Record<string, unknown> | null>(null);
  const watchRunningRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  const playbookRef = useRef(playbook);

  hostRef.current = {
    getNode: (id: string) => sceneTree.getNode(id),
    getChildIds: (id: string) => sceneTree.getChildIds(id),
    update,
    requestFrame,
    enqueueJob,
  };
  onCompleteRef.current = onComplete;
  onCancelRef.current = onCancel;
  playbookRef.current = playbook;

  const hasWatch = Boolean(watch && watch.sources.length > 0);

  if (!playerRef.current) {
    playerRef.current = new AnimPlayer({
      getNode: (id) => hostRef.current.getNode(id),
      getChildIds: (id) => hostRef.current.getChildIds(id),
      update: (id, partial) => hostRef.current.update(id, partial),
      requestFrame: (fn) => hostRef.current.requestFrame(fn),
      enqueueJob: (fn, priority) => hostRef.current.enqueueJob(fn, priority),
    });
  }

  useEffect(() => () => {
    playerRef.current?.dispose();
    playerRef.current = null;
  }, [myId]);

  /**
   * 读取 watch 源快照
   * @returns id → 值映射
   */
  const snapshotWatched = useCallback((): Record<string, unknown> => {
    const snap: Record<string, unknown> = {};
    if (!watch) return snap;
    for (const raw of watch.sources) {
      const s = normalizeSource(raw);
      const el = sceneTree.getNode(s.id);
      if (!el) {
        snap[s.id] = undefined;
        continue;
      }
      const data = { ...(el.data as Record<string, unknown>) };
      snap[s.id] = s.path ? resolvePath(data, s.path) : data;
    }
    return snap;
  }, [watch, sceneTree]);

  /**
   * 播放当前 playbook
   */
  const runPlaybook = useCallback(() => {
    const steps = playbookRef.current;
    if (!steps?.length) return;

    // Strict Mode remount 时 dispose 会清空 player，按需重建
    if (!playerRef.current) {
      playerRef.current = new AnimPlayer({
        getNode: (id) => hostRef.current.getNode(id),
        getChildIds: (id) => hostRef.current.getChildIds(id),
        update: (id, partial) => hostRef.current.update(id, partial),
        requestFrame: (fn) => hostRef.current.requestFrame(fn),
        enqueueJob: (fn, priority) => hostRef.current.enqueueJob(fn, priority),
      });
    }

    watchRunningRef.current = true;
    playerRef.current.play({
      containerId: myId,
      playbook: steps,
      onComplete: () => {
        watchRunningRef.current = false;
        onCompleteRef.current?.();
      },
      onCancel: () => {
        watchRunningRef.current = false;
        onCancelRef.current?.();
      },
    });
  }, [myId]);

  useImperativeHandle(ref, () => ({
    play: () => runPlaybook(),
    cancel: () => {
      playerRef.current?.cancel(true, true);
      watchRunningRef.current = false;
    },
    pause: () => playerRef.current?.pause(),
    resume: () => playerRef.current?.resume(),
  }), [runPlaybook]);

  useEffect(() => {
    if (!hasWatch) return;
    prevSnapshotRef.current = snapshotWatched();
  }, [hasWatch, snapshotWatched]);

  useEffect(() => {
    if (!hasWatch || !watch) return;

    const unsub = sceneTree.subscribe(() => {
      if (watchRunningRef.current) return;

      const newSnap = snapshotWatched();
      const oldSnap = prevSnapshotRef.current ?? {};
      prevSnapshotRef.current = newSnap;

      if (watch.handler(newSnap, oldSnap)) {
        runPlaybook();
      }
    });

    return unsub;
  }, [hasWatch, sceneTree, snapshotWatched, watch, runPlaybook]);

  /**
   * mount 自动播放入场 / 持续 playbook。
   * useLayoutEffect + 同步 play：子节点已在 layout 阶段注册，
   * applyTrackStarts 在首帧 paint 前写入 from / progress=0，避免「先闪最终态再动画」。
   */
  useLayoutEffect(() => {
    if (hasWatch || !autoPlay) return;
    if (!playbookRef.current?.length) return;

    runPlaybook();

    return () => {
      // Strict Mode 首次 cleanup：停掉播放，二次 mount 会重播入场
      playerRef.current?.cancel(false, false);
    };
  }, [hasWatch, autoPlay, myId, runPlaybook]);

  return (
    <ParentIdContext.Provider value={myId}>
      {children}
    </ParentIdContext.Provider>
  );
}

const AnimationWithRef = forwardRef(Animation);

export { AnimationWithRef as Animation };
export type {
  AnimStep,
  AnimationHandle,
  AnimEasing,
  AnimAttribute,
  AnimTarget,
  AnimComputeContext,
} from '../../engine/types';
export default AnimationWithRef;
