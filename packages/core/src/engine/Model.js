import { isEqual } from 'lodash-es';
import { IDENTITY_MAT3 } from './utils/constants/matrix';
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
    elements = new Map();
    /** 顶层元素列表（无父节点的元素） */
    topLevel = [];
    /** 待移除 id 集合（标记后下一帧物理删除） */
    removedIds = new Set();
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
    createRecord(id, type, data, events, parent) {
        return {
            id,
            type,
            data: { ...data },
            dirty: true,
            removed: false,
            events: events ? { ...events } : {},
            parentId: parent?.id,
            parent,
            children: [],
            subtreeDirty: true,
            worldMatrix: new Float32Array(IDENTITY_MAT3),
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
    syncFromSceneTree(sceneRoot) {
        const delta = { newIds: [], updatedIds: [], removedIds: [] };
        const visit = this.createSceneVisitor(delta);
        this.syncChildren(null, sceneRoot.children ?? [], visit, delta.newIds, delta.updatedIds);
        const sceneIds = new Set();
        const collectIds = (n) => {
            sceneIds.add(n.id);
            n.children?.forEach(collectIds);
        };
        sceneRoot.children?.forEach(collectIds);
        for (const id of this.elements.keys()) {
            if (!sceneIds.has(id)) {
                this.removedIds.add(id);
                delta.removedIds.push(id);
            }
        }
        return delta;
    }
    /**
     * 增量同步脏子树根节点（跳过全树遍历与删除检测）
     * @param sceneTree SceneTree 实例
     * @param dirtyRootIds 脏子树根 id 列表
     */
    syncDirtyNodes(sceneTree, dirtyRootIds) {
        const delta = { newIds: [], updatedIds: [], removedIds: [] };
        const visit = this.createSceneVisitor(delta);
        for (const id of dirtyRootIds) {
            const sceneNode = sceneTree.getNode(id);
            if (!sceneNode)
                continue;
            const parent = sceneNode.parentId
                ? this.elements.get(sceneNode.parentId) ?? null
                : null;
            visit(sceneNode, parent);
        }
        return delta;
    }
    /**
     * 创建 SceneTree 节点访问器（upsert 到 Model）
     * @param delta 变更摘要累加器
     */
    createSceneVisitor(delta) {
        const visit = (sceneNode, parent) => {
            const existing = this.elements.get(sceneNode.id);
            if (existing) {
                const dataChanged = this.mergeData(existing.data, sceneNode.data);
                if (dataChanged) {
                    existing.dirty = true;
                    existing.worldMatrixDirty = true;
                    delta.updatedIds.push(sceneNode.id);
                }
                if (sceneNode.events) {
                    existing.events = { ...sceneNode.events };
                    existing.dirty = true;
                }
                if (existing.parent !== parent) {
                    existing.parent = parent;
                    existing.parentId = parent?.id;
                    existing.dirty = true;
                    existing.worldMatrixDirty = true;
                }
                if (sceneNode.subtreeDirty) {
                    this.syncChildren(existing, sceneNode.children ?? [], visit, delta.newIds, delta.updatedIds);
                }
            }
            else {
                const record = this.createRecord(sceneNode.id, sceneNode.type, sceneNode.data, sceneNode.events, parent);
                this.elements.set(record.id, record);
                if (parent) {
                    parent.children.push(record);
                }
                else {
                    this.topLevel.push(record);
                }
                delta.newIds.push(record.id);
                this.syncChildren(record, sceneNode.children ?? [], visit, delta.newIds, delta.updatedIds);
            }
        };
        return visit;
    }
    /**
     * 同步子节点列表：删除不在 SceneTree 中的子节点，递归处理每个子节点
     * @param parent 父元素记录（null 表示顶层）
     * @param children SceneTree 子节点列表
     * @param visit 递归访问回调
     * @param _newIds 新增 id 列表（累加用）
     * @param _updatedIds 更新 id 列表（累加用）
     */
    syncChildren(parent, children, visit, _newIds, _updatedIds) {
        // 1. 删除 parent 中已不存在的子节点（递归）
        if (parent) {
            const sceneChildIds = new Set(children.map((c) => c.id));
            const toRemove = parent.children.filter((c) => !sceneChildIds.has(c.id));
            for (const child of toRemove) {
                this.removeRecursive(child);
            }
        }
        else {
            // 顶层节点处理
            const sceneTopIds = new Set(children.map((c) => c.id));
            this.topLevel = this.topLevel.filter((c) => {
                if (sceneTopIds.has(c.id))
                    return true;
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
    removeRecursive(record) {
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
    mergeData(existing, incoming) {
        let changed = false;
        const e = existing;
        const i = incoming;
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
    hasRemoved() {
        return this.removedIds.size > 0;
    }
    /** 获取所有待移除元素 id */
    getRemovedIds() {
        return Array.from(this.removedIds);
    }
    /** 物理删除已标记 removed 的元素（从 elements/topLevel/parent.children 中清除） */
    flushRemoved() {
        for (const id of this.removedIds) {
            const record = this.elements.get(id);
            if (record) {
                // 从父 children 中移除
                const parent = record.parent;
                if (parent) {
                    parent.children = parent.children.filter((c) => c.id !== id);
                }
                else {
                    this.topLevel = this.topLevel.filter((c) => c.id !== id);
                }
                // 标记父级结构脏
                if (parent)
                    parent.subtreeDirty = true;
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
    collectDirtySubtreeRoots() {
        const dirtyIds = new Set();
        for (const [id, r] of this.elements) {
            if (r.dirty && !r.removed)
                dirtyIds.add(id);
        }
        const roots = [];
        for (const id of dirtyIds) {
            const record = this.elements.get(id);
            if (record.parent && dirtyIds.has(record.parent.id))
                continue;
            roots.push(record);
        }
        return roots;
    }
    // ========== 通用 CRUD ==========
    /** 按 id 获取元素 */
    getElement(id) {
        return this.elements.get(id);
    }
    /** 获取所有活跃元素（非 removed） */
    getActiveElements() {
        return Array.from(this.elements.values()).filter((e) => !e.removed);
    }
    /** 获取所有顶层活跃元素 */
    getTopLevelElements() {
        return this.topLevel.filter((e) => !e.removed);
    }
    /** 获取所有元素（含 removed） */
    getAllElements() {
        return Array.from(this.elements.values());
    }
    /** 是否有脏元素 */
    hasDirty() {
        for (const r of this.elements.values()) {
            if (r.dirty && !r.removed)
                return true;
        }
        return false;
    }
    /** 将所有元素的脏标记重置为 clean */
    markAllClean() {
        for (const r of this.elements.values()) {
            r.dirty = false;
            r.subtreeDirty = false;
            r.worldMatrixDirty = false;
        }
    }
    /** 清空所有元素 */
    clear() {
        this.elements.clear();
        this.topLevel = [];
        this.removedIds.clear();
    }
    /** 销毁 Model */
    dispose() {
        this.clear();
    }
    // ========== 遍历 ==========
    /**
     * 从所有顶层节点开始深度优先遍历
     * @param cb 遍历回调（接收元素记录和深度）
     */
    traverse(cb) {
        const visit = (r, depth) => {
            cb(r, depth);
            for (const c of r.children)
                visit(c, depth + 1);
        };
        for (const r of this.topLevel)
            visit(r, 0);
    }
}
export { Model };
