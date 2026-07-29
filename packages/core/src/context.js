import { isEqual } from 'lodash-es';
import { createContext, useContext, useEffect, } from 'react';
const VizContext = createContext(null);
/** 获取主上下文（必须位于 <ReactVizComposer> 内部） */
function useViz() {
    const ctx = useContext(VizContext);
    if (!ctx) {
        throw new Error('useViz must be used within a <ReactVizComposer>');
    }
    return ctx;
}
const VizFrameContext = createContext(null);
/** 获取帧循环上下文（必须位于 <ReactVizComposer> 内部） */
function useVizFrame() {
    const ctx = useContext(VizFrameContext);
    if (!ctx) {
        throw new Error('useVizFrame must be used within a <ReactVizComposer>');
    }
    return ctx;
}
/* ============================================================
 * 父子 id 透传：让子组件知道要注册到哪个父节点
 * ============================================================ */
const ParentIdContext = createContext(undefined);
/** 获取当前父节点 id（由 Group 等容器通过 Provider 设置） */
function useParentId() {
    return useContext(ParentIdContext);
}
/* ============================================================
 * SceneTree 实例透传（给需要直接操作树的高级组件，比如 Animation）
 * ============================================================ */
const SceneTreeContext = createContext(null);
/** 获取 SceneTree 实例（必须位于 <ReactVizComposer> 内部） */
function useSceneTree() {
    const tree = useContext(SceneTreeContext);
    if (!tree)
        throw new Error('useSceneTree must be used within a <ReactVizComposer>');
    return tree;
}
const AnimationContext = createContext(null);
/** Animation 推进的形状属性值（width/opacity 等非 transform 属性） */
const AnimAttrsContext = createContext(null);
/** 读取父级 Animation 的形状属性值（width/opacity 等） */
function useAnimAttrs() {
    return useContext(AnimAttrsContext);
}
/**
 * 把动画属性值浅合并到 data 上
 * @param data 形状数据
 * @param attrs 动画属性（仅当值非 undefined 时合并）
 * @returns 合并后的 data
 */
function applyAnimAttrs(data, attrs) {
    if (!attrs)
        return data;
    const merged = { ...data };
    let changed = false;
    for (const [k, v] of Object.entries(attrs)) {
        if (v !== undefined && merged[k] !== v) {
            merged[k] = v;
            changed = true;
        }
    }
    return changed ? merged : data;
}
/* ============================================================
 * 声明式注册 hook
 * ============================================================ */
/**
 * useRegisterNode —— 子组件声明式注册 hook
 *
 * 工作流：
 *  1. mount 时 buildNode() 一次 → register() 注册到 SceneTree
 *  2. deps 变化时再 buildNode() → update() 更新自己的 data
 *  3. unmount 时 unregister()
 *
 * 这样：
 *  - 注册/卸载只发生在生命周期事件
 *  - 数据更新走 update，不重新 mount/unmount
 *  - 每个节点是一个更新单元，SceneTree 标脏单点
 */
function useRegisterNode(myId, buildNode, deps, options = {}) {
    const { register, unregister, update } = useViz();
    const ctxParentId = useParentId();
    const parentId = options.parentId ?? ctxParentId;
    // 注册 + 卸载
    useEffect(() => {
        const node = buildNode();
        register(parentId, node);
        return () => unregister(myId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myId, parentId]);
    // props 变化时增量更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const newNode = buildNode();
        update(myId, { data: newNode.data, events: newNode.events });
    }, deps);
}
/* ============================================================
 * 工具：浅比较 data 字段是否变化
 * ============================================================ */
/**
 * 比较两个 ElementData 是否不同（用 lodash isEqual 深度比较）
 * 比原浅比较更可靠——能正确检测嵌套对象/数组的变化
 */
function dataChanged(a, b) {
    return !isEqual(a, b);
}
export { VizContext, useViz, VizFrameContext, useVizFrame, ParentIdContext, useParentId, SceneTreeContext, useSceneTree, AnimationContext, AnimAttrsContext, useAnimAttrs, applyAnimAttrs, useRegisterNode, dataChanged, };
