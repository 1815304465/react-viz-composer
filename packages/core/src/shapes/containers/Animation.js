import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, } from 'react';
import { useViz, useVizFrame, useSceneTree, ParentIdContext, } from '../../context';
import { AnimPlayer } from '../../engine/utils/AnimPlayer';
import { DEFAULT_TRANSFORM } from '../../engine/utils/animations';
import { useShapeElement } from '../register';
/* ---- 路径解析 ---- */
/**
 * 规范化属性路径
 * @param path 路径字符串或数组
 */
function normalizePath(path) {
    if (Array.isArray(path))
        return path.filter(Boolean);
    return path.split('/').filter(Boolean);
}
/**
 * 按路径读取对象字段
 * @param obj 源对象
 * @param path 路径
 */
function resolvePath(obj, path) {
    const parts = normalizePath(path);
    let cur = obj;
    for (const part of parts) {
        if (cur == null || typeof cur !== 'object')
            return undefined;
        cur = cur[part];
    }
    return cur;
}
/**
 * 规范化 watch source
 * @param s 字符串 id 或配置对象
 */
function normalizeSource(s) {
    if (typeof s === 'string')
        return { id: s };
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
function Animation(props, ref) {
    const { id: propId, children, watch, playbook, onComplete, onCancel, autoPlay = true, } = props;
    const { update } = useViz();
    const { enqueueJob, requestFrame } = useVizFrame();
    const sceneTree = useSceneTree();
    const animData = { transform: { ...DEFAULT_TRANSFORM } };
    const myId = useShapeElement('animation', propId, animData, {});
    const playerRef = useRef(null);
    const hostRef = useRef({
        getNode: (id) => sceneTree.getNode(id),
        getChildIds: (id) => sceneTree.getChildIds(id),
        update,
        requestFrame,
        enqueueJob,
    });
    const prevSnapshotRef = useRef(null);
    const autoPlayedRef = useRef(false);
    const watchRunningRef = useRef(false);
    const onCompleteRef = useRef(onComplete);
    const onCancelRef = useRef(onCancel);
    const playbookRef = useRef(playbook);
    hostRef.current = {
        getNode: (id) => sceneTree.getNode(id),
        getChildIds: (id) => sceneTree.getChildIds(id),
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
    const snapshotWatched = useCallback(() => {
        const snap = {};
        if (!watch)
            return snap;
        for (const raw of watch.sources) {
            const s = normalizeSource(raw);
            const el = sceneTree.getNode(s.id);
            if (!el) {
                snap[s.id] = undefined;
                continue;
            }
            const data = { ...el.data };
            snap[s.id] = s.path ? resolvePath(data, s.path) : data;
        }
        return snap;
    }, [watch, sceneTree]);
    /**
     * 播放当前 playbook
     */
    const runPlaybook = useCallback(() => {
        const steps = playbookRef.current;
        if (!steps?.length || !playerRef.current)
            return;
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
        if (!hasWatch)
            return;
        prevSnapshotRef.current = snapshotWatched();
    }, [hasWatch, snapshotWatched]);
    useEffect(() => {
        if (!hasWatch || !watch)
            return;
        const unsub = sceneTree.subscribe(() => {
            if (watchRunningRef.current)
                return;
            const newSnap = snapshotWatched();
            const oldSnap = prevSnapshotRef.current ?? {};
            prevSnapshotRef.current = newSnap;
            if (watch.handler(newSnap, oldSnap)) {
                runPlaybook();
            }
        });
        return unsub;
    }, [hasWatch, sceneTree, snapshotWatched, watch, runPlaybook]);
    useEffect(() => {
        if (hasWatch || !autoPlay || !playbook || playbook.length === 0 || autoPlayedRef.current) {
            return;
        }
        autoPlayedRef.current = true;
        // 延迟一帧：确保子节点已从 pending 队列 flush 进 SceneTree
        const raf = requestAnimationFrame(() => {
            runPlaybook();
        });
        return () => cancelAnimationFrame(raf);
    }, [hasWatch, autoPlay, playbook, runPlaybook]);
    return (_jsx(ParentIdContext.Provider, { value: myId, children: children }));
}
const AnimationWithRef = forwardRef(Animation);
export { AnimationWithRef as Animation };
export default AnimationWithRef;
