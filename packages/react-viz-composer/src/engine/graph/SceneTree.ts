import { isEqual } from 'lodash-es';
import type {
  ElementType,
  ElementData,
  VizEventType,
  VizEventHandler,
} from '../types';

/**
 * SceneNode —— 嵌套 JSON 场景树中的节点
 *
 * 一个节点就是一个"更新单元"：改一个节点只标自己脏，渲染器只重画它。
 * 容器类节点（group/animation）有 children 数组，渲染时递归合成。
 */
interface SceneNode {
  id: string;
  type: ElementType;
  data: ElementData;
  events?: Partial<Record<VizEventType, VizEventHandler>>;
  /** 子节点（group/animation 容器持有） */
  children?: SceneNode[];
  /** 该节点数据是否脏（影响自身渲染） */
  dirty: boolean;
  /** 子树结构是否脏（父级 group 子节点增删时） */
  subtreeDirty: boolean;
  /** 父节点 id */
  parentId?: string;
}

/** 场景变更监听器回调类型 */
type SceneListener = (reason: SceneChangeReason) => void;

/** 场景变更原因 */
type SceneChangeReason =
  | 'register'
  | 'unregister'
  | 'update';

/**
 * SceneTree —— 嵌套 JSON 场景树
 *
 * 替代扁平的 Model：父子关系明确，支持脏节点收集。
 * 所有 shape 组件通过 VizContext 的 register/unregister/update 操作此树。
 * 渲染器递归遍历此树，按需重画。
 *
 * 关键设计：
 * - registerNode：将节点挂到指定父节点下，自动处理子→父注册顺序（pending 排队）
 * - unregisterNode：卸载节点及其所有后代
 * - updateNode：增量更新节点数据，只标自身脏
 * - drainDirtyNodes：取出脏节点 id 集合，供渲染器按需重画
 */
class SceneTree {
  /** 根节点（虚拟），children 是顶层节点 */
  readonly root: SceneNode;
  /** 扁平索引：id → SceneNode */
  private index = new Map<string, SceneNode>();
  /** 父引用：id → parent SceneNode */
  private nodeParents = new Map<string, SceneNode>();
  /** 变更监听器集合 */
  private listeners = new Set<SceneListener>();
  /** 待通知的脏节点 id 集合（用于按需渲染） */
  private dirtyNodeIds = new Set<string>();
  /** 子树结构脏的节点 id 集合 */
  private subtreeDirtyIds = new Set<string>();
  /**
   * 父节点尚未注册的待处理注册队列。
   * 解决问题：React useEffect 是子→父顺序执行，子组件先尝试注册时父节点还没进树，
   * 这里排队等父节点就位后 flush。
   */
  private pendingRegistrations: Array<{ parentId: string; node: SceneNode }> = [];

  constructor() {
    this.root = {
      id: '__root__',
      type: 'group',
      data: {},
      children: [],
      dirty: false,
      subtreeDirty: false,
    };
  }

  // ========== 注册 / 卸载 / 更新 ==========

  /**
   * 注册一个节点到指定父节点下
   * 若父节点尚未注册（React useEffect 子→父顺序导致），则排队等待
   * @param parentId 父节点 id，undefined 表示挂到根
   * @param node 节点数据（会被内部克隆，避免外部引用问题）
   */
  registerNode(parentId: string | undefined, node: SceneNode): void {
    if (this.index.has(node.id)) return; // 已存在则忽略

    // 父节点尚未注册（React useEffect 子→父顺序导致）→ 排队等父节点就位
    if (parentId && !this.index.has(parentId)) {
      this.pendingRegistrations.push({ parentId, node });
      // 仍然通知一次，让订阅者知道"有节点在排队"
      this.notify('register');
      return;
    }

    const parent = parentId ? this.index.get(parentId) : this.root;
    if (!parent) return;
    if (!parent.children) parent.children = [];

    // 浅克隆：避免外部引用被改导致内部状态污染
    const owned: SceneNode = {
      id: node.id,
      type: node.type,
      data: { ...node.data } as ElementData,
      events: node.events ? { ...node.events } : undefined,
      children: node.children ? node.children.map((c) => this.cloneNode(c)) : undefined,
      dirty: true,
      subtreeDirty: true,
      parentId: parent.id === '__root__' ? undefined : parent.id,
    };

    parent.children.push(owned);
    this.index.set(owned.id, owned);
    this.nodeParents.set(owned.id, parent);
    this.dirtyNodeIds.add(owned.id);
    this.subtreeDirtyIds.add(parent.id);
    this.markSubtreeDirty(owned);

    this.notify('register');

    // 本节点就位后，把所有以本节点为父的待处理子节点 flush 进来
    this.flushPendingRegistrations(owned.id);
  }

  /**
   * 把所有以指定 id 为父的待处理注册真正接入到树中
   * @param parentId 已就位的父节点 id
   */
  private flushPendingRegistrations(parentId: string): void {
    if (this.pendingRegistrations.length === 0) return;
    const remaining: Array<{ parentId: string; node: SceneNode }> = [];
    for (const item of this.pendingRegistrations) {
      if (item.parentId === parentId) {
        // 父已就位，递归调用 registerNode（parentId 设为 undefined 跳过"父不存在"检查）
        this.registerNode(undefined, item.node);
      } else {
        remaining.push(item);
      }
    }
    this.pendingRegistrations = remaining;
  }

  /**
   * 卸载一个节点及其所有后代
   * @param id 要卸载的节点 id
   */
  unregisterNode(id: string): void {
    const node = this.index.get(id);
    if (!node) return;

    const parent = this.nodeParents.get(id);
    if (parent?.children) {
      parent.children = parent.children.filter((c) => c.id !== id);
      this.subtreeDirtyIds.add(parent.id);
    }

    // 递归清理索引
    const cleanup = (n: SceneNode) => {
      this.index.delete(n.id);
      this.nodeParents.delete(n.id);
      this.dirtyNodeIds.delete(n.id);
      this.subtreeDirtyIds.delete(n.id);
      n.children?.forEach(cleanup);
    };
    cleanup(node);
    this.notify('unregister');
  }

  /**
   * 更新一个节点的数据（只动自己，不冒泡到父级）
   * @param id 节点 id
   * @param partial 部分更新的 data / events
   * @returns 是否真的有变化
   */
  updateNode(id: string, partial: { data?: Partial<ElementData>; events?: Partial<Record<VizEventType, VizEventHandler>> }): boolean {
    const node = this.index.get(id);
    if (!node) return false;

    let changed = false;
    if (partial.data) {
      // 浅比较：任一字段不同即认为变化
      for (const [k, v] of Object.entries(partial.data)) {
        if (!isEqual((node.data as Record<string, unknown>)[k], v)) {
          (node.data as Record<string, unknown>)[k] = v;
          changed = true;
        }
      }
    }
    if (partial.events) {
      node.events = { ...node.events, ...partial.events };
      changed = true;
    }
    if (changed) {
      node.dirty = true;
      this.dirtyNodeIds.add(id);
      this.notify('update');
    }
    return changed;
  }

  // ========== 查询 ==========

  /** 按 id 获取节点 */
  getNode(id: string): SceneNode | undefined {
    return this.index.get(id);
  }

  /** 检查节点是否存在 */
  hasNode(id: string): boolean {
    return this.index.has(id);
  }

  /** 获取所有已注册节点 id 列表 */
  getAllNodeIds(): string[] {
    return Array.from(this.index.keys());
  }

  // ========== 脏节点收集（渲染前调用） ==========

  /**
   * 取出并清空当前所有脏节点 id
   * @returns 脏节点 id 数组
   */
  drainDirtyNodes(): string[] {
    const ids = Array.from(this.dirtyNodeIds);
    this.dirtyNodeIds.clear();
    return ids;
  }

  /**
   * 取出所有脏子树根节点（dirty=true 且父级不在 dirtyNodeIds 中）
   * 用于递归渲染时定位重画起点
   * @returns 脏子树根节点 id 数组
   */
  drainDirtySubtreeRoots(): string[] {
    const dirty = new Set(this.dirtyNodeIds);
    const roots: string[] = [];
    for (const id of dirty) {
      const node = this.index.get(id);
      if (!node) continue;
      const parent = this.nodeParents.get(id);
      // 如果父级也是脏的，跳过（子节点会被父级递归覆盖）
      if (parent && dirty.has(parent.id)) continue;
      roots.push(id);
    }
    return roots;
  }

  // ========== 订阅 ==========

  /**
   * 订阅场景变更通知
   * @param fn 变更回调（传入变更原因）
   * @returns 取消订阅的函数
   */
  subscribe(fn: SceneListener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  /** 通知所有监听器 */
  private notify(reason: SceneChangeReason): void {
    for (const fn of this.listeners) fn(reason);
  }

  /** 清空所有状态（重置场景） */
  clear(): void {
    this.root.children = [];
    this.index.clear();
    this.nodeParents.clear();
    this.dirtyNodeIds.clear();
    this.subtreeDirtyIds.clear();
    this.pendingRegistrations = [];
  }

  // ========== 内部工具 ==========

  /**
   * 递归标记节点及其子树为脏
   * @param node 节点
   */
  private markSubtreeDirty(node: SceneNode): void {
    node.subtreeDirty = true;
    this.subtreeDirtyIds.add(node.id);
    node.children?.forEach((c) => this.markSubtreeDirty(c));
  }

  /**
   * 浅克隆场景节点（递归克隆 children）
   * @param n 原始节点
   * @returns 克隆后的节点
   */
  private cloneNode(n: SceneNode): SceneNode {
    return {
      id: n.id,
      type: n.type,
      data: { ...n.data } as ElementData,
      events: n.events ? { ...n.events } : undefined,
      children: n.children ? n.children.map((c) => this.cloneNode(c)) : undefined,
      dirty: n.dirty,
      subtreeDirty: n.subtreeDirty,
      parentId: n.parentId,
    };
  }
}

// 已用 lodash-es isEqual 替代，提供深度相等比较（涵盖数组/对象）

export { SceneTree, type SceneNode, type SceneListener, type SceneChangeReason };
