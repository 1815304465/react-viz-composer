import { createContext, useContext } from 'react';
import type { SceneTree } from './engine/graph/SceneTree';
import type {
  ElementData,
  VizEventType, VizEventHandler, VizDragEventHandler,
} from './engine/types';
import type { SceneNode } from './engine/graph/SceneTree';

/* ============================================================
 * 主上下文：声明式注册 / 更新 / 卸载到 SceneTree
 * ============================================================ */

/**
 * IVizContext —— shape 声明式数据投递接口
 *
 * - register：mount 时把节点挂到父节点下
 * - update：props 变化时增量更新数据
 * - unregister：unmount 时摘除节点
 */
interface IVizContext {
  /** 注册一个节点到 SceneTree（parentId=undefined 表示挂到根） */
  register: (parentId: string | undefined, node: SceneNode) => void;
  /** 更新一个节点的数据（只动自己，不冒泡到父级） */
  update: (
    id: string,
    partial: {
      data?: Partial<ElementData>;
      events?: Partial<Record<VizEventType, VizEventHandler>>;
    },
  ) => void;
  /** 卸载一个节点及其子树 */
  unregister: (id: string) => void;
}

const VizContext = createContext<IVizContext | null>(null);

/** 获取主上下文（必须位于 <ReactVizComposer> 内部） */
function useViz(): IVizContext {
  const ctx = useContext(VizContext);
  if (!ctx) {
    throw new Error('useViz must be used within a <ReactVizComposer>');
  }
  return ctx;
}

/* ============================================================
 * 帧循环 / 事件运行时 context
 * ============================================================ */

/** IVizFrameContext —— 帧循环 / 拖拽运行时接口 */
interface IVizFrameContext {
  /** 注册每帧回调（与 Graph 渲染循环共用 rAF） */
  requestFrame: (fn: () => void) => () => void;
  /** 将任务推入 Scheduler 队列（帧末按时间预算执行） */
  enqueueJob: (fn: () => void, priority?: number) => void;
  /** 注册拖拽处理器（由形状 onMouseDown 调用） */
  registerDrag: (
    id: string,
    onDrag: VizDragEventHandler,
    onDragEnd: VizDragEventHandler,
    evt: MouseEvent,
  ) => void;
}

const VizFrameContext = createContext<IVizFrameContext | null>(null);

/** 获取帧循环上下文（必须位于 <ReactVizComposer> 内部） */
function useVizFrame(): IVizFrameContext {
  const ctx = useContext(VizFrameContext);
  if (!ctx) {
    throw new Error('useVizFrame must be used within a <ReactVizComposer>');
  }
  return ctx;
}

/* ============================================================
 * 父子 id 透传：让子组件知道要注册到哪个父节点
 * ============================================================ */

const ParentIdContext = createContext<string | undefined>(undefined);

/** 获取当前父节点 id（由 Group 等容器通过 Provider 设置） */
function useParentId(): string | undefined {
  return useContext(ParentIdContext);
}

/* ============================================================
 * SceneTree 实例透传（给需要直接操作树的高级组件，比如 Animation）
 * ============================================================ */

const SceneTreeContext = createContext<SceneTree | null>(null);

/** 获取 SceneTree 实例（必须位于 <ReactVizComposer> 内部） */
function useSceneTree(): SceneTree {
  const tree = useContext(SceneTreeContext);
  if (!tree) throw new Error('useSceneTree must be used within a <ReactVizComposer>');
  return tree;
}

export {
  VizContext,
  useViz,
  type IVizContext,
  VizFrameContext,
  useVizFrame,
  type IVizFrameContext,
  ParentIdContext,
  useParentId,
  SceneTreeContext,
  useSceneTree,
};
