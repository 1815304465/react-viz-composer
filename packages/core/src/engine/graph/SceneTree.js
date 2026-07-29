import { isEqual } from 'lodash-es';
class SceneTree {
    /** 根节点（虚拟），children 是顶层节点 */
    root;
    /** 扁平索引：id → SceneNode */
    index = new Map();
    /** 父引用：id → parent SceneNode */
    nodeParents = new Map();
    /** 变更监听器集合 */
    listeners = new Set();
    /** 待通知的脏节点 id 集合（用于按需渲染） */
    dirtyNodeIds = new Set();
    /** 子树结构脏的节点 id 集合 */
    subtreeDirtyIds = new Set();
    /**
     * 父节点尚未注册的待处理注册队列。
     * 解决问题：React useEffect 是子→父顺序执行，子组件先尝试注册时父节点还没进树，
     * 这里排队等父节点就位后 flush。
     */
    pendingRegistrations = [];
    /**
     * updateNode 缓冲：同帧多次 update 合并，flush 时一次性处理。
     * key 为节点 id，同 id 的后写入覆盖先写入。
     */
    updateBuffer = new Map();
    /** 是否已调度 flush（防止重复调度） */
    updateScheduled = false;
    /** 外部注入的 flush 调度器 */
    flushScheduler = null;
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
    registerNode(parentId, node) {
        if (this.index.has(node.id))
            return; // 已存在则忽略
        // 父节点尚未注册（React useEffect 子→父顺序导致）→ 排队等父节点就位
        if (parentId && !this.index.has(parentId)) {
            this.pendingRegistrations.push({ parentId, node });
            // 仍然通知一次，让订阅者知道"有节点在排队"
            this.notify('register');
            return;
        }
        const parent = parentId ? this.index.get(parentId) : this.root;
        if (!parent)
            return;
        if (!parent.children)
            parent.children = [];
        // 浅克隆：避免外部引用被改导致内部状态污染
        const owned = {
            id: node.id,
            type: node.type,
            data: { ...node.data },
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
    flushPendingRegistrations(parentId) {
        if (this.pendingRegistrations.length === 0)
            return;
        const remaining = [];
        for (const item of this.pendingRegistrations) {
            if (item.parentId === parentId) {
                // 父已就位，挂到正确的 parentId 下（不可传 undefined，否则会误挂到根节点）
                this.registerNode(parentId, item.node);
            }
            else {
                remaining.push(item);
            }
        }
        this.pendingRegistrations = remaining;
    }
    /**
     * 卸载一个节点及其所有后代
     * @param id 要卸载的节点 id
     */
    unregisterNode(id) {
        const node = this.index.get(id);
        if (!node)
            return;
        const parent = this.nodeParents.get(id);
        if (parent?.children) {
            parent.children = parent.children.filter((c) => c.id !== id);
            this.subtreeDirtyIds.add(parent.id);
        }
        // 递归清理索引
        const cleanup = (n) => {
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
    setFlushScheduler(fn) {
        this.flushScheduler = fn;
    }
    /**
     * 批量 flush 缓冲的 update：对每个节点做 isEqual 比较、merge、标脏，
     * 最后统一 notify 一次。
     * 由 flushScheduler 在帧末（渲染前）触发。
     */
    flushUpdates() {
        if (this.updateBuffer.size === 0) {
            this.updateScheduled = false;
            return;
        }
        let anyChanged = false;
        for (const [id, entry] of this.updateBuffer) {
            const node = this.index.get(id);
            if (!node)
                continue;
            let changed = false;
            if (entry.data) {
                for (const [k, v] of Object.entries(entry.data)) {
                    if (!isEqual(node.data[k], v)) {
                        node.data[k] = v;
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
    updateNode(id, partial) {
        const node = this.index.get(id);
        if (!node)
            return false;
        // 合并到 buffer：同 id 的后写入覆盖先写入
        const existing = this.updateBuffer.get(id);
        if (existing) {
            if (partial.data) {
                existing.data = { ...existing.data, ...partial.data };
            }
            if (partial.events) {
                existing.events = { ...existing.events, ...partial.events };
            }
        }
        else {
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
    getNode(id) {
        return this.index.get(id);
    }
    /** 检查节点是否存在 */
    hasNode(id) {
        return this.index.has(id);
    }
    /** 获取所有已注册节点 id 列表 */
    getAllNodeIds() {
        return Array.from(this.index.keys());
    }
    // ========== 脏节点收集（渲染前调用） ==========
    /**
     * 取出并清空当前所有脏节点 id
     * @returns 脏节点 id 数组
     */
    drainDirtyNodes() {
        const ids = Array.from(this.dirtyNodeIds);
        this.dirtyNodeIds.clear();
        return ids;
    }
    /**
     * 取出所有脏子树根节点（dirty=true 且父级不在 dirtyNodeIds 中）
     * 用于递归渲染时定位重画起点
     * @returns 脏子树根节点 id 数组
     */
    drainDirtySubtreeRoots() {
        const dirty = new Set(this.dirtyNodeIds);
        const roots = [];
        for (const id of dirty) {
            const node = this.index.get(id);
            if (!node)
                continue;
            const parent = this.nodeParents.get(id);
            // 如果父级也是脏的，跳过（子节点会被父级递归覆盖）
            if (parent && dirty.has(parent.id))
                continue;
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
    subscribe(fn) {
        this.listeners.add(fn);
        return () => { this.listeners.delete(fn); };
    }
    /** 通知所有监听器 */
    notify(reason) {
        for (const fn of this.listeners)
            fn(reason);
    }
    /** 清空所有状态（重置场景） */
    clear() {
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
    markSubtreeDirty(node) {
        node.subtreeDirty = true;
        this.subtreeDirtyIds.add(node.id);
        node.children?.forEach((c) => this.markSubtreeDirty(c));
    }
    /**
     * 浅克隆场景节点（递归克隆 children）
     * @param n 原始节点
     * @returns 克隆后的节点
     */
    cloneNode(n) {
        return {
            id: n.id,
            type: n.type,
            data: { ...n.data },
            events: n.events ? { ...n.events } : undefined,
            children: n.children ? n.children.map((c) => this.cloneNode(c)) : undefined,
            dirty: n.dirty,
            subtreeDirty: n.subtreeDirty,
            parentId: n.parentId,
        };
    }
}
// 已用 lodash-es isEqual 替代，提供深度相等比较（涵盖数组/对象）
export { SceneTree };
