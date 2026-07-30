import { isEqual } from '../../utils/object';
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
/** updateNode 的缓冲条目 */
interface UpdateBufferEntry {
  data?: Partial<ElementData>;
  events?: Partial<Record<VizEventType, VizEventHandler>>;
}

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
  /**
   * updateNode 缓冲：同帧多次 update 合并，flush 时一次性处理。
   * key 为节点 id，同 id 的后写入覆盖先写入。
   */
  private updateBuffer = new Map<string, UpdateBufferEntry>();
  /** 是否已调度 flush（防止重复调度） */
  private updateScheduled = false;
  /** 外部注入的 flush 调度器 */
  private flushScheduler: (() => void) | null = null;

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
        // 父已就位，挂到正确的 parentId 下（不可传 undefined，否则会误挂到根节点）
        this.registerNode(parentId, item.node);
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
   * 设置 flush 调度器。外部（ReactVizComposer）注入，
   * 通常在 mount 后用 graph.enqueueJob 包裹 flushUpdates()。
   * @param fn 调度函数，调用即触发 flushUpdates
   */
  setFlushScheduler(fn: () => void): void {
    this.flushScheduler = fn;
  }

  /**
   * 批量 flush 缓冲的 update：对每个节点做 isEqual 比较、merge、标脏，
   * 最后统一 notify 一次。
   * 由 flushScheduler 在帧末（渲染前）触发。
   */
  flushUpdates(): void {
    if (this.updateBuffer.size === 0) {
      this.updateScheduled = false;
      return;
    }

    let anyChanged = false;

    for (const [id, entry] of this.updateBuffer) {
      const node = this.index.get(id);
      if (!node) continue;

      let changed = false;
      if (entry.data) {
        for (const [k, v] of Object.entries(entry.data)) {
          if (!isEqual((node.data as Record<string, unknown>)[k], v)) {
            (node.data as Record<string, unknown>)[k] = v;
            changed = true;
          }
        }
      }
      if (entry.events) {
        node.events = { ...node.events, ...entry.events };
        changed = true;
      }
      if (changed) {
        node.dirty = true;
        this.dirtyNodeIds.add(id);
        anyChanged = true;
      }
    }

    this.updateBuffer.clear();
    this.updateScheduled = false;

    if (anyChanged) {
      this.notify('update');
    }
  }

  /**
   * 更新一个节点的数据（只动自己，不冒泡到父级）
   *
   * 同帧多次 update 合并：partial 写入 updateBuffer，由 flushScheduler
   * 在帧末统一 merge + notify。register / unregister 仍立即生效。
   *
   * @param id 节点 id
   * @param partial 部分更新的 data / events
   * @returns 是否真的有变化（buffer 模式下始终返回 true 表示已入队）
   */
  updateNode(id: string, partial: { data?: Partial<ElementData>; events?: Partial<Record<VizEventType, VizEventHandler>> }): boolean {
    const node = this.index.get(id);
    if (!node) return false;

    // 合并到 buffer：同 id 的后写入覆盖先写入
    const existing = this.updateBuffer.get(id);
    if (existing) {
      if (partial.data) {
        existing.data = { ...existing.data, ...partial.data };
      }
      if (partial.events) {
        existing.events = { ...existing.events, ...partial.events };
      }
    } else {
      this.updateBuffer.set(id, {
        data: partial.data ? { ...partial.data } : undefined,
        events: partial.events ? { ...partial.events } : undefined,
      });
    }

    // 调度 flush（只调度一次）
    if (!this.updateScheduled && this.flushScheduler) {
      this.updateScheduled = true;
      this.flushScheduler();
    }

    return true;
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

  /**
   * 获取节点的直接子节点 id 列表（不含更深后代）
   * @param parentId 父节点 id；不存在时返回空数组
   */
  getChildIds(parentId: string): string[] {
    const node = this.index.get(parentId);
    if (!node?.children?.length) return [];
    return node.children.map((child) => child.id);
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
      if (parent && dirty.has(parent.id)) continue;
      roots.push(id);
    }
    for (const id of dirty) {
      const node = this.index.get(id);
      if (node) {
        node.dirty = false;
        node.subtreeDirty = false;
      }
    }
    this.dirtyNodeIds.clear();
    return roots;
  }

  /** 全量同步后清空脏标记（register / unregister 场景） */
  clearDirtyAfterSync(): void {
    for (const id of this.dirtyNodeIds) {
      const node = this.index.get(id);
      if (node) {
        node.dirty = false;
        node.subtreeDirty = false;
      }
    }
    this.dirtyNodeIds.clear();
    this.subtreeDirtyIds.clear();
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
    this.updateBuffer.clear();
    this.updateScheduled = false;
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

// 深度相等比较见 utils/object isEqual（涵盖数组/对象）

export { SceneTree, type SceneNode, type SceneListener, type SceneChangeReason };
