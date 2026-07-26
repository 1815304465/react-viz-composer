import { isEqual } from 'lodash-es';
import type { ElementRecord, ElementType, ElementData, VizEventType, VizEventHandler } from './types';
import { IDENTITY_MAT3, type Mat3 } from './utils/constants/matrix';

/**
 * Model —— 渲染器使用的数据仓库（树形）
 *
 * 区别于 SceneTree：SceneTree 是 React 端的声明式 JSON，Model 是渲染器端的扁平索引。
 * - 通过 syncFromSceneTree 将 SceneTree 的增量变更同步进来
 * - 维护 parent/children 引用、worldMatrix 缓存、脏标记
 * - 提供 traverse 用于递归渲染遍历
 */
class Model {
  /** 元素映射：id → ElementRecord */
  private elements: Map<string, ElementRecord> = new Map();
  /** 顶层元素列表（无父节点的元素） */
  private topLevel: ElementRecord[] = [];
  /** 待移除 id 集合（标记后下一帧物理删除） */
  private removedIds: Set<string> = new Set();

  // ========== 内部：创建 ElementRecord ==========

  /**
   * 创建新的 ElementRecord 对象
   * @param id 元素 id
   * @param type 元素类型
   * @param data 元素数据
   * @param events 事件处理器
   * @param parent 父元素记录
   * @returns 新创建的 ElementRecord
   */
  private createRecord(
    id: string,
    type: ElementType,
    data: ElementData,
    events: Partial<Record<VizEventType, VizEventHandler>> | undefined,
    parent: ElementRecord | null,
  ): ElementRecord {
    return {
      id,
      type,
      data: { ...data } as ElementData,
      dirty: true,
      removed: false,
      events: events ? { ...events } : {},
      parentId: parent?.id,
      parent,
      children: [],
      subtreeDirty: true,
      worldMatrix: new Float32Array(IDENTITY_MAT3) as Mat3,
      worldMatrixDirty: true,
    };
  }

  // ========== 同步自 SceneTree ==========

  /**
   * 从 SceneTree 增量同步：处理新增、更新、删除
   * 此方法只动 Model 内部，不感知 SceneTree 的组织结构
   * @param sceneRoot SceneTree 根节点
   * @returns 变更摘要：新增 / 更新 / 删除的 id 列表
   */
  syncFromSceneTree(
    sceneRoot: import('./graph/SceneTree').SceneNode,
  ): { newIds: string[]; updatedIds: string[]; removedIds: string[] } {
    const newIds: string[] = [];
    const updatedIds: string[] = [];
    const removedIds: string[] = [];

    // 1. 递归将 SceneTree 的节点 upsert 到 Model
    const visit = (sceneNode: import('./graph/SceneTree').SceneNode, parent: ElementRecord | null) => {
      const existing = this.elements.get(sceneNode.id);
      if (existing) {
        // 更新现有元素
        const dataChanged = this.mergeData(existing.data, sceneNode.data);
        if (dataChanged) {
          existing.dirty = true;
          existing.worldMatrixDirty = true;
          updatedIds.push(sceneNode.id);
        }
        if (sceneNode.events) {
          existing.events = { ...sceneNode.events };
        }
        // 父子引用若变化，更新
        if (existing.parent !== parent) {
          existing.parent = parent;
          existing.parentId = parent?.id;
          existing.dirty = true;
          existing.worldMatrixDirty = true;
        }
        // 递归处理 children
        this.syncChildren(existing, sceneNode.children ?? [], visit, newIds, updatedIds);
      } else {
        // 新增元素
        const record = this.createRecord(
          sceneNode.id,
          sceneNode.type,
          sceneNode.data,
          sceneNode.events,
          parent,
        );
        this.elements.set(record.id, record);
        if (parent) {
          parent.children.push(record);
        } else {
          this.topLevel.push(record);
        }
        newIds.push(record.id);
        // 递归处理 children
        this.syncChildren(record, sceneNode.children ?? [], visit, newIds, updatedIds);
      }
    };

    // 2. 处理根的 children
    this.syncChildren(null, sceneRoot.children ?? [], visit, newIds, updatedIds);

    // 3. 检测 Model 中多余的（SceneTree 没有的）→ 标记移除
    const sceneIds = new Set<string>();
    const collectIds = (n: import('./graph/SceneTree').SceneNode) => {
      sceneIds.add(n.id);
      n.children?.forEach(collectIds);
    };
    sceneRoot.children?.forEach(collectIds);

    for (const id of this.elements.keys()) {
      if (!sceneIds.has(id)) {
        this.removedIds.add(id);
        removedIds.push(id);
      }
    }

    return { newIds, updatedIds, removedIds };
  }

  /**
   * 同步子节点列表：删除不在 SceneTree 中的子节点，递归处理每个子节点
   * @param parent 父元素记录（null 表示顶层）
   * @param children SceneTree 子节点列表
   * @param visit 递归访问回调
   * @param _newIds 新增 id 列表（累加用）
   * @param _updatedIds 更新 id 列表（累加用）
   */
  private syncChildren(
    parent: ElementRecord | null,
    children: import('./graph/SceneTree').SceneNode[],
    visit: (n: import('./graph/SceneTree').SceneNode, p: ElementRecord | null) => void,
    _newIds: string[],
    _updatedIds: string[],
  ): void {
    // 1. 删除 parent 中已不存在的子节点（递归）
    if (parent) {
      const sceneChildIds = new Set(children.map((c) => c.id));
      const toRemove = parent.children.filter((c) => !sceneChildIds.has(c.id));
      for (const child of toRemove) {
        this.removeRecursive(child);
      }
    } else {
      // 顶层节点处理
      const sceneTopIds = new Set(children.map((c) => c.id));
      this.topLevel = this.topLevel.filter((c) => {
        if (sceneTopIds.has(c.id)) return true;
        this.removeRecursive(c);
        return false;
      });
    }

    // 2. 递归 visit 每个子节点
    for (const child of children) {
      visit(child, parent);
    }
  }

  /**
   * 递归标记元素及其后代为 removed
   * @param record 元素记录
   */
  private removeRecursive(record: ElementRecord): void {
    record.removed = true;
    this.removedIds.add(record.id);
    // 递归标记后代
    for (const child of record.children) {
      this.removeRecursive(child);
    }
  }

  /**
   * 合并 data：将 incoming 中的字段浅比较后写入 existing
   * @param existing 现有 data
   * @param incoming 新 data
   * @returns 是否有变化
   */
  /**
   * 合并 data：用 lodash isEqual 深度比较，仅写入变化字段
   * 比浅比较更可靠——能正确判断嵌套对象/数组是否真的变了
   */
  private mergeData(existing: ElementData, incoming: ElementData): boolean {
    let changed = false;
    const e = existing as Record<string, unknown>;
    const i = incoming as Record<string, unknown>;
    for (const key of Object.keys(i)) {
      if (!isEqual(e[key], i[key])) {
        e[key] = i[key];
        changed = true;
      }
    }
    return changed;
  }

  // ========== 物理删除已标记移除的 ==========

  /** 是否有待移除元素 */
  hasRemoved(): boolean {
    return this.removedIds.size > 0;
  }

  /** 获取所有待移除元素 id */
  getRemovedIds(): string[] {
    return Array.from(this.removedIds);
  }

  /** 物理删除已标记 removed 的元素（从 elements/topLevel/parent.children 中清除） */
  flushRemoved(): void {
    for (const id of this.removedIds) {
      const record = this.elements.get(id);
      if (record) {
        // 从父 children 中移除
        const parent = record.parent;
        if (parent) {
          parent.children = parent.children.filter((c) => c.id !== id);
        } else {
          this.topLevel = this.topLevel.filter((c) => c.id !== id);
        }
        // 标记父级结构脏
        if (parent) parent.subtreeDirty = true;
      }
      this.elements.delete(id);
    }
    this.removedIds.clear();
  }

  // ========== 脏节点收集 ==========

  /**
   * 收集所有脏子树根（dirty=true 且父级不在 dirtyIds 中）
   * 返回的元素就是要递归重画的起点
   * @returns 脏子树根元素列表
   */
  collectDirtySubtreeRoots(): ElementRecord[] {
    const dirtyIds = new Set<string>();
    for (const [id, r] of this.elements) {
      if (r.dirty && !r.removed) dirtyIds.add(id);
    }
    const roots: ElementRecord[] = [];
    for (const id of dirtyIds) {
      const record = this.elements.get(id)!;
      if (record.parent && dirtyIds.has(record.parent.id)) continue;
      roots.push(record);
    }
    return roots;
  }

  // ========== 通用 CRUD ==========

  /** 按 id 获取元素 */
  getElement(id: string): ElementRecord | undefined {
    return this.elements.get(id);
  }

  /** 获取所有活跃元素（非 removed） */
  getActiveElements(): ElementRecord[] {
    return Array.from(this.elements.values()).filter((e) => !e.removed);
  }

  /** 获取所有顶层活跃元素 */
  getTopLevelElements(): ElementRecord[] {
    return this.topLevel.filter((e) => !e.removed);
  }

  /** 获取所有元素（含 removed） */
  getAllElements(): ElementRecord[] {
    return Array.from(this.elements.values());
  }

  /** 是否有脏元素 */
  hasDirty(): boolean {
    for (const r of this.elements.values()) {
      if (r.dirty && !r.removed) return true;
    }
    return false;
  }

  /** 将所有元素的脏标记重置为 clean */
  markAllClean(): void {
    for (const r of this.elements.values()) {
      r.dirty = false;
      r.subtreeDirty = false;
      r.worldMatrixDirty = false;
    }
  }

  /** 清空所有元素 */
  clear(): void {
    this.elements.clear();
    this.topLevel = [];
    this.removedIds.clear();
  }

  /** 销毁 Model */
  dispose(): void {
    this.clear();
  }

  // ========== 遍历 ==========

  /**
   * 从所有顶层节点开始深度优先遍历
   * @param cb 遍历回调（接收元素记录和深度）
   */
  traverse(cb: (record: ElementRecord, depth: number) => void): void {
    const visit = (r: ElementRecord, depth: number) => {
      cb(r, depth);
      for (const c of r.children) visit(c, depth + 1);
    };
    for (const r of this.topLevel) visit(r, 0);
  }
}

export { Model };
