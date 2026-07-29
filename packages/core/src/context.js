import { createContext, useContext } from 'react';
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
export { VizContext, useViz, VizFrameContext, useVizFrame, ParentIdContext, useParentId, SceneTreeContext, useSceneTree, };
