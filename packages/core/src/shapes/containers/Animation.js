import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useRef, useEffect, useCallback, useId, forwardRef, useImperativeHandle, } from 'react';
import { useViz, useVizFrame, useParentId, useSceneTree, AnimationContext, AnimAttrsContext, ParentIdContext, } from '../../context';
import { isTransformAnimAttr, lerpAnimValue } from '../../engine/utils/animations';
/* ---- 缓动 ---- */
const easingFns = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => t * (2 - t),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};
/* ---- 路径解析 ---- */
function normalizePath(path) {
    if (Array.isArray(path))
        return path.filter(Boolean);
    return path.split('/').filter(Boolean);
}
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
function normalizeSource(s) {
    if (typeof s === 'string')
        return { id: s };
    return s;
}
/* ---- 默认值 ---- */
const DEFAULT_TRANSFORM = {
    x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
};
/**
 * Animation —— 声明式动画容器（递归渲染版，纯代理）
 * 自身注册为 'animation' 节点挂在 SceneTree 中，提供 AnimationContext + AnimAttrsContext 给子节点合并。
 * 不渲染任何 DOM，只将动画状态通过 Context 和 SceneTree 传递到渲染层。
 *
 * 每个 tick 的更新流程：
 *   1. 计算本帧 transform/attrs 值
 *   2. 写入 Context → 触发子节点 useShapeElement 的 update effect
 *   3. （可选）直接调 viz.update(自身id / 外部id) 写入 SceneTree
 */
function Animation(props, ref) {
    const { id: propId, children, watch, playbook, onComplete, onCancel, autoPlay = true, } = props;
    const { update, register, unregister } = useViz();
    const { enqueueJob, requestFrame } = useVizFrame();
    const sceneTree = useSceneTree();
    const parentIdFromCtx = useParentId();
    const autoId = useId();
    const myId = propId ?? autoId;
    const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
    const [attrs, setAttrs] = useState({});
    const prevSnapshotRef = useRef(null);
    const frameUnsubRef = useRef(null);
    const stoppedRef = useRef(false);
    const pausedRef = useRef(false);
    const pauseOffsetRef = useRef(0);
    const pauseStartRef = useRef(0);
    const autoPlayedRef = useRef(false);
    const watchRunningRef = useRef(false);
    const onCompleteRef = useRef(onComplete);
    const onCancelRef = useRef(onCancel);
    const tickRef = useRef(null);
    // 上一次推送到 SceneTree 的 transform 引用，避免无意义 update
    const lastPushedTransformRef = useRef(null);
    onCompleteRef.current = onComplete;
    onCancelRef.current = onCancel;
    const hasWatch = watch && watch.sources.length > 0;
    /** 注册 Animation 节点自身 */
    useEffect(() => {
        register(parentIdFromCtx, {
            id: myId,
            type: 'animation',
            data: { transform: { ...DEFAULT_TRANSFORM } },
            dirty: true,
            subtreeDirty: true,
        });
        return () => unregister(myId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myId, parentIdFromCtx]);
    const snapshotWatched = useCallback(() => {
        const snap = {};
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
    const resetState = useCallback(() => {
        setTransform(DEFAULT_TRANSFORM);
        setAttrs({});
        // 同步把 transform 推回 SceneTree
        if (lastPushedTransformRef.current) {
            update(myId, { data: { transform: { ...DEFAULT_TRANSFORM } } });
            lastPushedTransformRef.current = null;
        }
    }, [update, myId]);
    const cancelPlayback = useCallback((notify = true) => {
        stoppedRef.current = true;
        pausedRef.current = false;
        pauseOffsetRef.current = 0;
        frameUnsubRef.current?.();
        frameUnsubRef.current = null;
        resetState();
        watchRunningRef.current = false;
        if (notify)
            onCancelRef.current?.();
    }, [resetState]);
    const ensureFrameLoop = useCallback(() => {
        if (frameUnsubRef.current)
            return;
        frameUnsubRef.current = requestFrame(() => {
            tickRef.current?.();
        });
    }, [requestFrame]);
    /**
     * 把当前 transform 推回 SceneTree（去重）
     * 这样 Animation 自身的 transform 也能被渲染器在递归时通过 worldMatrix 合成到子节点
     */
    const pushTransformToTree = useCallback((next) => {
        const prev = lastPushedTransformRef.current;
        if (prev
            && prev.x === next.x && prev.y === next.y
            && prev.rotation === next.rotation
            && prev.scaleX === next.scaleX && prev.scaleY === next.scaleY) {
            return;
        }
        lastPushedTransformRef.current = { ...next };
        update(myId, { data: { transform: { ...next } } });
    }, [update, myId]);
    const runPlaybook = useCallback(() => {
        if (!playbook || playbook.length === 0)
            return;
        cancelPlayback(false);
        stoppedRef.current = false;
        pausedRef.current = false;
        pauseOffsetRef.current = 0;
        const groups = new Map();
        for (const step of playbook) {
            const g = step.group ?? 0;
            if (!groups.has(g))
                groups.set(g, []);
            groups.get(g).push(step);
        }
        const sortedGroups = Array.from(groups.keys()).sort((a, b) => a - b);
        const loopCounts = new Map();
        for (const step of playbook) {
            if (step.loop === true)
                loopCounts.set(step, -1);
            else if (typeof step.loop === 'number' && step.loop > 0)
                loopCounts.set(step, step.loop);
        }
        const finalTransform = { ...DEFAULT_TRANSFORM };
        const finalAttrs = {};
        let groupIndex = 0;
        let cycle = 0;
        let groupStartTime = 0;
        const finish = () => {
            setTransform({ ...finalTransform });
            setAttrs({ ...finalAttrs });
            pushTransformToTree(finalTransform);
            watchRunningRef.current = false;
            frameUnsubRef.current?.();
            frameUnsubRef.current = null;
            if (onCompleteRef.current) {
                enqueueJob(() => onCompleteRef.current?.());
            }
        };
        const runNextGroup = () => {
            if (stoppedRef.current)
                return;
            if (groupIndex >= sortedGroups.length) {
                let needLoop = false;
                for (const step of playbook) {
                    const c = loopCounts.get(step);
                    if (c === undefined)
                        continue;
                    if (c === -1) {
                        needLoop = true;
                        continue;
                    }
                    if (c > 0) {
                        needLoop = true;
                        if (c === 1)
                            loopCounts.delete(step);
                        else
                            loopCounts.set(step, c - 1);
                    }
                }
                if (needLoop) {
                    groupIndex = 0;
                    cycle++;
                    runNextGroup();
                    return;
                }
                finish();
                return;
            }
            const groupKey = sortedGroups[groupIndex];
            const steps = groups.get(groupKey);
            const maxDuration = Math.max(...steps.map((s) => s.duration));
            const isForward = cycle % 2 === 0;
            groupStartTime = performance.now();
            const tick = () => {
                if (stoppedRef.current)
                    return;
                if (pausedRef.current)
                    return;
                const elapsed = performance.now() - groupStartTime - pauseOffsetRef.current;
                const nextTransform = { ...finalTransform };
                const nextAttrs = { ...finalAttrs };
                for (const step of steps) {
                    const progress = Math.min(elapsed / step.duration, 1);
                    const fn = easingFns[step.easing ?? 'linear'];
                    const isLooping = step.loop === true
                        || (typeof step.loop === 'number' && step.loop > 0);
                    if (!isLooping && !isForward)
                        continue;
                    const eased = fn(progress);
                    const val = !isForward
                        ? lerpAnimValue(step.to, step.from, eased)
                        : lerpAnimValue(step.from, step.to, eased);
                    if (isTransformAnimAttr(step.attribute)) {
                        nextTransform[step.attribute] = val;
                    }
                    else {
                        nextAttrs[step.attribute] = val;
                    }
                }
                Object.assign(finalTransform, nextTransform);
                Object.assign(finalAttrs, nextAttrs);
                setTransform({ ...nextTransform });
                setAttrs({ ...nextAttrs });
                // 同步推 transform 到 SceneTree（子节点合并后的渲染层会处理）
                pushTransformToTree(nextTransform);
                if (elapsed >= maxDuration) {
                    groupIndex++;
                    runNextGroup();
                    return;
                }
            };
            tickRef.current = tick;
            ensureFrameLoop();
        };
        runNextGroup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playbook, cancelPlayback, enqueueJob, ensureFrameLoop, pushTransformToTree]);
    useImperativeHandle(ref, () => ({
        play: () => {
            watchRunningRef.current = true;
            runPlaybook();
        },
        cancel: () => cancelPlayback(true),
        pause: () => {
            if (stoppedRef.current || pausedRef.current)
                return;
            pausedRef.current = true;
            pauseStartRef.current = performance.now();
        },
        resume: () => {
            if (stoppedRef.current || !pausedRef.current)
                return;
            pauseOffsetRef.current += performance.now() - pauseStartRef.current;
            pausedRef.current = false;
            ensureFrameLoop();
        },
    }), [runPlaybook, cancelPlayback, ensureFrameLoop]);
    useEffect(() => {
        if (!hasWatch)
            return;
        prevSnapshotRef.current = snapshotWatched();
    }, [hasWatch, snapshotWatched]);
    useEffect(() => {
        if (!hasWatch)
            return;
        const unsub = sceneTree.subscribe(() => {
            if (watchRunningRef.current)
                return;
            const newSnap = snapshotWatched();
            const oldSnap = prevSnapshotRef.current ?? {};
            prevSnapshotRef.current = newSnap;
            if (watch.handler(newSnap, oldSnap)) {
                watchRunningRef.current = true;
                runPlaybook();
            }
        });
        return unsub;
    }, [hasWatch, sceneTree, snapshotWatched, watch, runPlaybook]);
    useEffect(() => {
        if (hasWatch || !autoPlay || !playbook || playbook.length === 0 || autoPlayedRef.current)
            return;
        autoPlayedRef.current = true;
        watchRunningRef.current = true;
        runPlaybook();
    }, [hasWatch, autoPlay, playbook, runPlaybook]);
    useEffect(() => () => {
        stoppedRef.current = true;
        frameUnsubRef.current?.();
        frameUnsubRef.current = null;
        autoPlayedRef.current = false;
    }, []);
    return (_jsx(ParentIdContext.Provider, { value: myId, children: _jsx(AnimationContext.Provider, { value: transform, children: _jsx(AnimAttrsContext.Provider, { value: attrs, children: children }) }) }));
}
const AnimationWithRef = forwardRef(Animation);
export { AnimationWithRef as Animation };
export default AnimationWithRef;
