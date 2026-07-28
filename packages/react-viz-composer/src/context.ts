import { isEqual } from 'lodash-es';
import {
  createContext, useContext, useEffect,
  type DependencyList,
} from 'react';
import type { SceneNode, SceneTree } from './engine/graph/SceneTree';
import type {
  ElementType, ElementData,
  VizEventType, VizEventHandler, VizDragEventHandler,
} from './engine/types';

/* ============================================================
 * 主上下文：声明式注册 / 更新 / 卸载到 SceneTree
 *
 * 只负责"shape 把自己声明的 JSON 投递到 SceneTree"这一件事。
 * 视口/帧循环/拖拽/查询等其他能力由下方独立 context 提供，
 * 这样可以让"声明 JSON"的心智模型保持极简。
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
 *
 * 面向 Animation / EntryProgress / 可拖拽形状等需要跟渲染层帧循环
 * 或事件系统打交道的"高级消费者"。普通 shape 不需要关心这些。
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

/* ============================================================
 * Animation 上下文：playbook 推进的 transform / 形状属性值
 * ============================================================ */

/** Animation 推进的 transform 值 */
type AnimValues = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};

const AnimationContext = createContext<AnimValues | null>(null);
/** Animation 推进的形状属性值（width/opacity 等非 transform 属性） */
const AnimAttrsContext = createContext<Record<string, number | string> | null>(null);



/** 读取父级 Animation 的形状属性值（width/opacity 等） */
function useAnimAttrs(): Record<string, number | string> | null {
  return useContext(AnimAttrsContext);
}

/**
 * 把动画属性值浅合并到 data 上
 * @param data 形状数据
 * @param attrs 动画属性（仅当值非 undefined 时合并）
 * @returns 合并后的 data
 */
function applyAnimAttrs(
  data: ElementData,
  attrs: Record<string, number | string> | null,
): ElementData {
  if (!attrs) return data;
  const merged: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  let changed = false;
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && merged[k] !== v) {
      merged[k] = v;
      changed = true;
    }
  }
  return changed ? (merged as ElementData) : data;
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
function useRegisterNode(
  myId: string,
  buildNode: () => SceneNode,
  deps: DependencyList,
  options: { parentId?: string; type?: ElementType } = {},
): void {
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
    update(myId, { data: newNode.data as Partial<ElementData>, events: newNode.events });
  }, deps);
}

/* ============================================================
 * 工具：浅比较 data 字段是否变化
 * ============================================================ */

/**
 * 比较两个 ElementData 是否不同（用 lodash isEqual 深度比较）
 * 比原浅比较更可靠——能正确检测嵌套对象/数组的变化
 */
function dataChanged(a: ElementData, b: ElementData): boolean {
  return !isEqual(a, b);
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
  AnimationContext,
  AnimAttrsContext,
  useAnimAttrs,
  type AnimValues,
  applyAnimAttrs,
  useRegisterNode,
  dataChanged,
};
