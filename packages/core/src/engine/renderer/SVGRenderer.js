import { Renderer } from './Renderer';
import { getEffectiveOpacity, isElementVisible, transformToMatrix, multiplyMat3, estimateLocalBounds, boundsIntersectViewport, IDENTITY_MAT3, } from '../index';
/** SVG 命名空间 URI */
const NS = 'http://www.w3.org/2000/svg';
/**
 * SVGRenderer —— 基于 DOM 的 SVG 渲染器（递归版）
 *
 * 关键设计：
 * - 节点直接挂到对应 group 节点的 `<g>` 下，DOM 顺序天然决定 paint order
 * - group 的 transform 写在 `<g>` 元素的 transform 属性上
 * - 不再依赖排序（DOM 树即 z 顺序）
 * - 脏节点只更新自己的 DOM 属性，不销毁重建
 * - 视口外的节点设置 visibility="hidden" 实现裁剪
 */
class SVGRenderer extends Renderer {
    /** SVG 根元素 */
    svg;
    /** <defs> 容器：存放渐变、clipPath、filter、mask 等定义 */
    defs;
    /** 视口变换组 <g>：应用 translate + scale 变换 */
    viewportGroup;
    /** 节点 id → SVG DOM 元素的映射 */
    elementMap = new Map();
    /** group/animation 节点 id → 对应 <g> 元素的映射（用于挂载子节点） */
    groupContainerMap = new Map();
    /** 当前画布宽度 */
    viewWidth = 0;
    /** 当前画布高度 */
    viewHeight = 0;
    // ---- 拖拽状态 ----
    /** 当前正在拖拽的元素 id */
    dragElementId = null;
    /** 拖拽起始 clientX */
    dragStartX = 0;
    /** 拖拽起始 clientY */
    dragStartY = 0;
    /** 上一帧拖拽 clientX */
    dragLastX = 0;
    /** 上一帧拖拽 clientY */
    dragLastY = 0;
    /** 拖拽移动回调 */
    dragOnDrag = null;
    /** 拖拽结束回调 */
    dragOnEnd = null;
    /** 全局 mousemove 监听器引用（用于解绑） */
    onGlobalMouseMove = null;
    /** 全局 mouseup 监听器引用（用于解绑） */
    onGlobalMouseUp = null;
    /**
     * 挂载渲染器：创建 SVG DOM 树结构
     * <svg> → <defs> + <g viewportGroup>
     * @param container 容器 DOM 元素
     * @returns SVG 根元素
     */
    mount(container) {
        this.container = container;
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('xmlns', NS);
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';
        const defs = document.createElementNS(NS, 'defs');
        svg.appendChild(defs);
        const viewportGroup = document.createElementNS(NS, 'g');
        this.updateViewportGroup();
        svg.appendChild(viewportGroup);
        container.appendChild(svg);
        this.svg = svg;
        this.defs = defs;
        this.viewportGroup = viewportGroup;
        return svg;
    }
    /** 更新 viewportGroup 的 transform 属性（translate + scale） */
    updateViewportGroup() {
        if (!this.viewportGroup)
            return;
        const { x, y, scale } = this.viewport;
        this.viewportGroup.setAttribute('transform', `translate(${x}, ${y}) scale(${scale})`);
    }
    /** 设置视口：更新 viewport 值并同步到 DOM */
    setViewport(v) {
        if (!super.setViewport(v))
            return false;
        this.updateViewportGroup();
        return true;
    }
    /** 设置事件系统：将 SVG DOM 绑定到 EventSystem 用于命中检测 */
    setEventSystem(es) {
        if (es) {
            super.setEventSystem(es);
            es.attachSVG(this.svg);
        }
    }
    // ---------- 全局拖拽事件 ----------
    /**
     * 开始拖拽：注册全局 pointermove/pointerup 监听器
     * 将屏幕像素位移转换为视口坐标系位移（除以 scale）
     * @param id 拖拽元素 id
     * @param onDrag 拖拽移动回调
     * @param onEnd 拖拽结束回调
     * @param evt 触发拖拽的鼠标事件
     */
    startDrag(id, onDrag, onEnd, evt) {
        this.dragElementId = id;
        this.dragStartX = evt.clientX;
        this.dragStartY = evt.clientY;
        this.dragLastX = evt.clientX;
        this.dragLastY = evt.clientY;
        this.dragOnDrag = onDrag;
        this.dragOnEnd = onEnd;
        this.dispatchDragVizEvent('dragstart', id, evt);
        const globalMove = (e) => {
            if (this.dragElementId !== id)
                return;
            const invScale = 1 / this.viewport.scale;
            const dx = (e.clientX - this.dragStartX) * invScale;
            const dy = (e.clientY - this.dragStartY) * invScale;
            const stepX = (e.clientX - this.dragLastX) * invScale;
            const stepY = (e.clientY - this.dragLastY) * invScale;
            this.dragLastX = e.clientX;
            this.dragLastY = e.clientY;
            this.dragOnDrag?.({ dx, dy, stepX, stepY, originalEvent: e, elementId: id });
        };
        const globalUp = (e) => {
            if (this.dragElementId !== id)
                return;
            const invScale = 1 / this.viewport.scale;
            const dx = (e.clientX - this.dragStartX) * invScale;
            const dy = (e.clientY - this.dragStartY) * invScale;
            this.dragOnEnd?.({ dx, dy, stepX: 0, stepY: 0, originalEvent: e, elementId: id });
            this.dispatchDragVizEvent('dragend', id, e);
            this.stopDrag();
        };
        this.onGlobalMouseMove = globalMove;
        this.onGlobalMouseUp = globalUp;
        document.addEventListener('pointermove', globalMove);
        document.addEventListener('pointerup', globalUp);
    }
    /** 派发拖拽事件到 EventSystem：将 clientX/Y 转换为画布内坐标 */
    dispatchDragVizEvent(type, id, evt) {
        const rect = this.container?.getBoundingClientRect();
        if (!rect || !this.eventSystem)
            return;
        this.eventSystem.dispatchSynthetic(type, evt, id, evt.clientX - rect.left, evt.clientY - rect.top);
    }
    /** 停止拖拽：清除状态并解绑全局事件监听器 */
    stopDrag() {
        this.dragElementId = null;
        this.dragOnDrag = null;
        this.dragOnEnd = null;
        if (this.onGlobalMouseMove) {
            document.removeEventListener('pointermove', this.onGlobalMouseMove);
            this.onGlobalMouseMove = null;
        }
        if (this.onGlobalMouseUp) {
            document.removeEventListener('pointerup', this.onGlobalMouseUp);
            this.onGlobalMouseUp = null;
        }
    }
    // ---------- Renderer 抽象方法实现 ----------
    /**
     * 增量 DOM 更新 + 视口裁剪
     *
     * 递归每个 top-level 根节点：
     * - 已存在的 DOM 元素仅 dirty 时更新属性（不销毁重建）
     * - 不存在的 DOM 元素创建并插入
     * - 视口外的节点设置 visibility="hidden"
     * @param roots 顶层元素列表
     */
    render(roots) {
        const visible = this.getVisibleBounds();
        for (const root of roots) {
            this.renderNode(root, IDENTITY_MAT3, visible);
        }
    }
    /**
     * 递归渲染一个节点（覆盖基类）
     *
     * 流程：
     * 1. 合成 worldMatrix
     * 2. 可见性检查（不可见 → 隐藏 DOM）
     * 3. 视口裁剪检查（视口外 → 隐藏 DOM）
     * 4. 可见时：已存在 → 增量更新属性；不存在 → 创建 DOM
     * 5. 递归子节点
     * 6. 清除 dirty 标记
     * @param node 当前节点
     * @param parentMatrix 父节点世界矩阵
     * @param visible 可见区域（用于裁剪判断）
     */
    renderNode(node, parentMatrix, visible) {
        if (node.removed)
            return;
        // 1. 合成 worldMatrix
        const dataAny = node.data;
        const localMatrix = transformToMatrix(dataAny.transform);
        multiplyMat3(node.worldMatrix, parentMatrix, localMatrix);
        node.worldMatrixDirty = false;
        // 2. 可见性检查
        if (!this.model || !isElementVisible(this.model, node)) {
            // 不可见：把已有 DOM 隐藏
            if (node.dirty) {
                const el = this.elementMap.get(node.id);
                if (el)
                    el.setAttribute('visibility', 'hidden');
            }
        }
        else {
            // 视口裁剪：对叶子 drawable 节点检查
            const isLeaf = node.type !== 'group' && node.type !== 'animation' &&
                node.type !== 'linearGradient' && node.type !== 'radialGradient' && node.type !== 'clipPath' &&
                node.type !== 'filter' && node.type !== 'mask';
            let culled = false;
            if (visible && isLeaf) {
                const lbs = estimateLocalBounds(node);
                if (lbs && !boundsIntersectViewport(lbs, node.worldMatrix, visible)) {
                    culled = true;
                }
            }
            if (culled) {
                // 节点在视口外 → 隐藏 DOM
                const el = this.elementMap.get(node.id);
                if (el)
                    el.setAttribute('visibility', 'hidden');
            }
            else {
                // 可见：确保 DOM 存在并更新
                if (this.elementMap.has(node.id)) {
                    if (node.dirty)
                        this.updateNodeDom(node);
                }
                else {
                    this.createNodeDom(node);
                }
            }
        }
        // 3. 递归 children
        for (const child of node.children) {
            this.renderNode(child, node.worldMatrix, visible);
        }
        // 4. 清脏
        if (node.dirty) {
            node.dirty = false;
            node.subtreeDirty = false;
        }
    }
    /**
     * 根据节点类型创建对应的 SVG DOM 元素
     *
     * 支持的节点类型：
     * - rect/ellipse/line/path/text/image → 对应 SVG 元素
     * - group/animation → <g> 容器
     * - linearGradient/radialGradient/clipPath/filter/mask → 挂在 <defs> 内
     * @param record 元素记录
     */
    createNodeDom(record) {
        let el = null;
        switch (record.type) {
            case 'rect':
                el = document.createElementNS(NS, 'rect');
                this.applyRectAttrs(el, record.data, record);
                break;
            case 'ellipse':
                el = document.createElementNS(NS, 'ellipse');
                this.applyEllipseAttrs(el, record.data, record);
                break;
            case 'line':
                el = document.createElementNS(NS, record.data.closed ? 'polygon' : 'polyline');
                this.applyLineAttrs(el, record.data, record);
                break;
            case 'path':
                el = document.createElementNS(NS, 'path');
                this.applyPathAttrs(el, record.data, record);
                break;
            case 'text':
                el = document.createElementNS(NS, 'text');
                this.applyTextAttrs(el, record.data, record);
                break;
            case 'image':
                el = document.createElementNS(NS, 'image');
                this.applyImageAttrs(el, record.data, record);
                break;
            case 'group':
                el = this.createGroupEl(record);
                break;
            case 'linearGradient':
                el = this.createLinearGradient(record);
                break;
            case 'radialGradient':
                el = this.createRadialGradient(record);
                break;
            case 'clipPath':
                el = this.createClipPathEl(record);
                break;
            case 'filter':
                el = this.createFilterEl(record);
                break;
            case 'mask':
                el = this.createMaskEl(record);
                break;
            case 'animation':
                // animation 容器：当作 group 处理（绘制子节点，不绘制自身）
                el = this.createGroupEl(record);
                break;
        }
        if (!el)
            return;
        // 决定挂到哪个容器
        const parentContainer = this.resolveParentContainer(record);
        if (parentContainer) {
            parentContainer.appendChild(el);
        }
        this.elementMap.set(record.id, el);
        if (record.type === 'group' || record.type === 'animation') {
            this.groupContainerMap.set(record.id, el);
        }
        // 注册到事件系统（用于命中检测）
        if (record.type !== 'linearGradient' && record.type !== 'radialGradient' && record.type !== 'clipPath' &&
            record.type !== 'filter' && record.type !== 'mask') {
            this.eventSystem?.registerSVGElement(record.id, el);
        }
    }
    /**
     * 增量更新已有 DOM（不销毁重建）
     * 仅更新属性值并恢复 visibility（移除 hidden）
     * 如果 DOM 不存在则回退到 createNodeDom
     * @param record 元素记录
     */
    updateNodeDom(record) {
        const el = this.elementMap.get(record.id);
        if (!el) {
            this.createNodeDom(record);
            return;
        }
        const data = record.data;
        el.removeAttribute('visibility');
        switch (record.type) {
            case 'rect':
                this.applyRectAttrs(el, data, record);
                break;
            case 'ellipse':
                this.applyEllipseAttrs(el, data, record);
                break;
            case 'line':
                this.applyLineAttrs(el, data, record);
                break;
            case 'path':
                this.applyPathAttrs(el, data, record);
                break;
            case 'text':
                this.applyTextAttrs(el, data, record);
                break;
            case 'image':
                this.applyImageAttrs(el, data, record);
                break;
            case 'group':
            case 'animation':
                this.applyGroupTransform(el, data);
                this.applyCommonAttrs(el, record);
                break;
            case 'linearGradient':
                this.updateLinearGradient(el, data);
                break;
            case 'radialGradient':
                this.updateRadialGradient(el, data);
                break;
            case 'clipPath':
                this.updateClipPathEl(el, data);
                break;
            case 'filter':
                this.updateFilterEl(el, data);
                break;
            case 'mask':
                this.updateMaskEl(el, data);
                break;
        }
    }
    /**
     * 决定节点挂到哪个父容器
     * - 渐变/clipPath/filter/mask → defs
     * - group/animation 内部节点 → 对应 groupContainerMap 中的 <g>
     * - 顶层 drawable → viewportGroup
     * @param record 元素记录
     * @returns 父容器 SVG 元素
     */
    resolveParentContainer(record) {
        if (record.type === 'linearGradient' || record.type === 'radialGradient' || record.type === 'clipPath' ||
            record.type === 'filter' || record.type === 'mask') {
            return this.defs;
        }
        const parent = record.parent;
        if (!parent)
            return this.viewportGroup;
        if (parent.type === 'group' || parent.type === 'animation') {
            return this.groupContainerMap.get(parent.id) ?? this.viewportGroup;
        }
        return this.viewportGroup;
    }
    /** 创建 group 容器 <g> 元素并设置 filter/mask/transform/通用属性 */
    createGroupEl(record) {
        const g = document.createElementNS(NS, 'g');
        const data = record.data;
        this.applyGroupTransform(g, data);
        this.setFilterAttr(g, data.filter);
        this.setMaskAttr(g, data.mask);
        this.applyCommonAttrs(g, record);
        return g;
    }
    /** 设置 <g> 元素的 transform 属性 */
    applyGroupTransform(g, data) {
        this.setTransform(g, data.transform);
    }
    /**
     * 画一个节点（基类要求的方法）
     * 实际绘制逻辑在 renderNode 中（递归创建/更新 DOM），此处为空
     */
    drawSelf(_node) {
        // 实际绘制逻辑在 renderNode 中（递归创建/更新 DOM）
    }
    /** 基类要求：单节点渲染（内部委托给 renderNode） */
    renderElement(record) {
        if (record.removed)
            return false;
        this.renderNode(record, IDENTITY_MAT3, null);
        return true;
    }
    /** 移除节点：删除 DOM 元素、清理映射、注销事件 */
    remove(ids) {
        for (const id of ids) {
            const el = this.elementMap.get(id);
            if (el) {
                el.remove();
                this.elementMap.delete(id);
                this.groupContainerMap.delete(id);
            }
            this.eventSystem?.unregisterSVGElement(id);
        }
    }
    /** 清空 SVG：移除所有子节点，重建 defs 和 viewportGroup */
    clear() {
        while (this.svg.firstChild)
            this.svg.removeChild(this.svg.firstChild);
        this.defs = document.createElementNS(NS, 'defs');
        this.svg.appendChild(this.defs);
        this.viewportGroup = document.createElementNS(NS, 'g');
        this.updateViewportGroup();
        this.svg.appendChild(this.viewportGroup);
        this.elementMap.clear();
        this.groupContainerMap.clear();
    }
    /** 销毁渲染器：停止拖拽、清空 DOM、移除 SVG 元素 */
    dispose() {
        this.stopDrag();
        this.clear();
        this.svg.remove();
    }
    /** 调整 SVG 尺寸：设置 width/height/viewBox 属性 */
    resize(width, height) {
        if (this.viewWidth === width && this.viewHeight === height)
            return;
        this.viewWidth = width;
        this.viewHeight = height;
        this.svg.setAttribute('width', String(width));
        this.svg.setAttribute('height', String(height));
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
    // ---- Rect ----
    /**
     * 设置 <rect> 元素的 x/y/width/height/rx/ry/clipPath/filter/mask 等属性
     * @param el SVGRectElement
     * @param data 矩形数据
     * @param record 元素记录
     */
    applyRectAttrs(el, data, record) {
        el.setAttribute('x', String(data.x));
        el.setAttribute('y', String(data.y));
        el.setAttribute('width', String(data.width));
        el.setAttribute('height', String(data.height));
        if (data.rx !== undefined)
            el.setAttribute('rx', String(data.rx));
        else
            el.removeAttribute('rx');
        if (data.ry !== undefined)
            el.setAttribute('ry', String(data.ry));
        else
            el.removeAttribute('ry');
        this.setClipPathAttr(el, data.clipPath);
        this.setFilterAttr(el, data.filter);
        this.setMaskAttr(el, data.mask);
        this.setPaintAttrs(el, data);
        this.setTransform(el, data.transform);
        this.applyCommonAttrs(el, record);
    }
    // ---- Ellipse ----
    /**
     * 设置 <ellipse> 元素的 cx/cy/rx/ry 等属性
     * @param el SVGEllipseElement
     * @param data 椭圆数据
     * @param record 元素记录
     */
    applyEllipseAttrs(el, data, record) {
        el.setAttribute('cx', String(data.cx));
        el.setAttribute('cy', String(data.cy));
        el.setAttribute('rx', String(data.rx));
        el.setAttribute('ry', String(data.ry));
        this.setClipPathAttr(el, data.clipPath);
        this.setFilterAttr(el, data.filter);
        this.setMaskAttr(el, data.mask);
        this.setPaintAttrs(el, data);
        this.setTransform(el, data.transform);
        this.applyCommonAttrs(el, record);
    }
    // ---- Line ----
    /**
     * 设置 <polyline>/<polygon> 元素的 points/stroke/fill 等属性
     * @param el SVGPolylineElement
     * @param data 折线数据
     * @param record 元素记录
     */
    applyLineAttrs(el, data, record) {
        el.setAttribute('points', data.points.map((p) => `${p.x},${p.y}`).join(' '));
        el.setAttribute('fill', data.closed && data.fill ? data.fill : 'none');
        if (data.stroke)
            el.setAttribute('stroke', data.stroke);
        if (data.strokeWidth !== undefined)
            el.setAttribute('stroke-width', String(data.strokeWidth));
        this.setClipPathAttr(el, data.clipPath);
        this.setFilterAttr(el, data.filter);
        this.setMaskAttr(el, data.mask);
        this.setPaintAttrs(el, data);
        this.setTransform(el, data.transform);
        this.applyCommonAttrs(el, record);
    }
    // ---- Path ----
    /**
     * 设置 <path> 元素的 d 属性及画笔样式
     * @param el SVGPathElement
     * @param data 路径数据
     * @param record 元素记录
     */
    applyPathAttrs(el, data, record) {
        el.setAttribute('d', data.d);
        this.setPaintAttrs(el, data);
        this.setClipPathAttr(el, data.clipPath);
        this.setFilterAttr(el, data.filter);
        this.setMaskAttr(el, data.mask);
        this.setTransform(el, data.transform);
        this.applyCommonAttrs(el, record);
    }
    // ---- Text ----
    /**
     * 设置 <text> 元素的 x/y/font-size/font-family/text-anchor 等属性
     * @param el SVGTextElement
     * @param data 文本数据
     * @param record 元素记录
     */
    applyTextAttrs(el, data, record) {
        el.setAttribute('x', String(data.x));
        el.setAttribute('y', String(data.y));
        if (data.fontSize)
            el.setAttribute('font-size', String(data.fontSize));
        if (data.fontFamily)
            el.setAttribute('font-family', data.fontFamily);
        if (data.fontWeight !== undefined)
            el.setAttribute('font-weight', String(data.fontWeight));
        if (data.textAlign)
            el.setAttribute('text-anchor', data.textAlign);
        if (data.textBaseline)
            el.setAttribute('dominant-baseline', data.textBaseline);
        if (data.fill)
            el.setAttribute('fill', data.fill);
        if (data.stroke)
            el.setAttribute('stroke', data.stroke);
        if (data.strokeWidth !== undefined)
            el.setAttribute('stroke-width', String(data.strokeWidth));
        el.textContent = data.text;
        this.setClipPathAttr(el, data.clipPath);
        this.setFilterAttr(el, data.filter);
        this.setMaskAttr(el, data.mask);
        this.setTransform(el, data.transform);
        this.applyCommonAttrs(el, record);
    }
    // ---- Image ----
    /**
     * 设置 <image> 元素的 x/y/width/height/href/preserveAspectRatio 等属性
     * @param el SVGImageElement
     * @param data 图片数据
     * @param record 元素记录
     */
    applyImageAttrs(el, data, record) {
        el.setAttribute('x', String(data.x));
        el.setAttribute('y', String(data.y));
        el.setAttribute('width', String(data.width));
        el.setAttribute('height', String(data.height));
        el.setAttribute('href', data.src);
        if (data.preserveAspectRatio)
            el.setAttribute('preserveAspectRatio', data.preserveAspectRatio);
        this.setClipPathAttr(el, data.clipPath);
        this.setFilterAttr(el, data.filter);
        this.setMaskAttr(el, data.mask);
        this.setTransform(el, data.transform);
        this.applyCommonAttrs(el, record);
    }
    // ---- LinearGradient ----
    /** 创建 <linearGradient> 元素（挂在 defs 中，供 fill/stroke 引用） */
    createLinearGradient(record) {
        const data = record.data;
        const el = document.createElementNS(NS, 'linearGradient');
        this.applyLinearGradientAttrs(el, data);
        return el;
    }
    /** 更新 <linearGradient> 元素属性 */
    updateLinearGradient(el, data) {
        this.applyLinearGradientAttrs(el, data);
    }
    /**
     * 设置线性渐变属性：id/x1/y1/x2/y2/gradientUnits + <stop> 子元素
     * @param el SVGLinearGradientElement
     * @param data 线性渐变数据
     */
    applyLinearGradientAttrs(el, data) {
        el.setAttribute('id', data.id);
        el.setAttribute('x1', String(data.x1));
        el.setAttribute('y1', String(data.y1));
        el.setAttribute('x2', String(data.x2));
        el.setAttribute('y2', String(data.y2));
        if (data.gradientUnits)
            el.setAttribute('gradientUnits', data.gradientUnits);
        while (el.firstChild)
            el.removeChild(el.firstChild);
        for (const stop of data.stops) {
            const s = document.createElementNS(NS, 'stop');
            s.setAttribute('offset', String(stop.offset));
            s.setAttribute('stop-color', stop.color);
            if (stop.opacity !== undefined)
                s.setAttribute('stop-opacity', String(stop.opacity));
            el.appendChild(s);
        }
    }
    // ---- RadialGradient ----
    /** 创建 <radialGradient> 元素（挂在 defs 中，供 fill/stroke 引用） */
    createRadialGradient(record) {
        const data = record.data;
        const el = document.createElementNS(NS, 'radialGradient');
        this.applyRadialGradientAttrs(el, data);
        return el;
    }
    /** 更新 <radialGradient> 元素属性 */
    updateRadialGradient(el, data) {
        this.applyRadialGradientAttrs(el, data);
    }
    /**
     * 设置径向渐变属性：id/cx/cy/r/fx/fy/gradientUnits + <stop> 子元素
     * @param el SVGRadialGradientElement
     * @param data 径向渐变数据
     */
    applyRadialGradientAttrs(el, data) {
        el.setAttribute('id', data.id);
        el.setAttribute('cx', String(data.cx));
        el.setAttribute('cy', String(data.cy));
        el.setAttribute('r', String(data.r));
        if (data.fx !== undefined)
            el.setAttribute('fx', String(data.fx));
        if (data.fy !== undefined)
            el.setAttribute('fy', String(data.fy));
        if (data.gradientUnits)
            el.setAttribute('gradientUnits', data.gradientUnits);
        while (el.firstChild)
            el.removeChild(el.firstChild);
        for (const stop of data.stops) {
            const s = document.createElementNS(NS, 'stop');
            s.setAttribute('offset', String(stop.offset));
            s.setAttribute('stop-color', stop.color);
            if (stop.opacity !== undefined)
                s.setAttribute('stop-opacity', String(stop.opacity));
            el.appendChild(s);
        }
    }
    // ---- ClipPath ----
    /** 创建 <clipPath> 元素（挂在 defs 中），内部填充对应的形状子元素 */
    createClipPathEl(record) {
        const data = record.data;
        const el = document.createElementNS(NS, 'clipPath');
        el.setAttribute('id', data.id);
        this.fillClipPathChildren(el, data);
        return el;
    }
    /** 更新 <clipPath>：重新生成子元素 */
    updateClipPathEl(el, data) {
        el.setAttribute('id', data.id);
        while (el.firstChild)
            el.removeChild(el.firstChild);
        this.fillClipPathChildren(el, data);
    }
    /**
     * 填充 <clipPath> 内部的形状子元素
     * 根据 shapeType 创建 <rect>/<ellipse>/<path>
     * @param el SVGClipPathElement
     * @param data 裁剪路径数据
     */
    fillClipPathChildren(el, data) {
        let childEl = null;
        switch (data.shapeType) {
            case 'rect': {
                childEl = document.createElementNS(NS, 'rect');
                const d = data.shapeData;
                childEl.setAttribute('x', String(d.x));
                childEl.setAttribute('y', String(d.y));
                childEl.setAttribute('width', String(d.width));
                childEl.setAttribute('height', String(d.height));
                break;
            }
            case 'ellipse': {
                childEl = document.createElementNS(NS, 'ellipse');
                const d = data.shapeData;
                childEl.setAttribute('cx', String(d.cx));
                childEl.setAttribute('cy', String(d.cy));
                childEl.setAttribute('rx', String(d.rx));
                childEl.setAttribute('ry', String(d.ry));
                break;
            }
            case 'path': {
                childEl = document.createElementNS(NS, 'path');
                const d = data.shapeData;
                childEl.setAttribute('d', d.d);
                break;
            }
        }
        if (childEl)
            el.appendChild(childEl);
    }
    // ---- 通用 ----
    /**
     * 设置画笔属性：fill/stroke/strokeWidth/strokeDasharray
     * 对 fill 做特殊处理：undefined → 'none'
     * @param el SVG 元素
     * @param data 画笔数据
     */
    setPaintAttrs(el, data) {
        if (data.fill !== undefined) {
            el.setAttribute('fill', typeof data.fill === 'string' ? data.fill : 'none');
        }
        if (data.stroke !== undefined)
            el.setAttribute('stroke', data.stroke);
        if (data.strokeWidth !== undefined)
            el.setAttribute('stroke-width', String(data.strokeWidth));
        if (data.strokeDasharray)
            el.setAttribute('stroke-dasharray', data.strokeDasharray);
        else
            el.removeAttribute('stroke-dasharray');
    }
    /**
     * 应用通用 DOM 属性：opacity/visibility/pointer-events
     * opacity 通过 model 计算有效值（考虑继承）
     * @param el SVG 元素
     * @param record 元素记录
     */
    applyCommonAttrs(el, record) {
        const data = record.data;
        if (this.model) {
            el.setAttribute('opacity', String(getEffectiveOpacity(this.model, record)));
        }
        else if (data.opacity !== undefined) {
            el.setAttribute('opacity', String(data.opacity));
        }
        else {
            el.removeAttribute('opacity');
        }
        if (data.visible === false)
            el.setAttribute('visibility', 'hidden');
        else
            el.removeAttribute('visibility');
        if (data.pointerEvents === 'none')
            el.setAttribute('pointer-events', 'none');
        else
            el.removeAttribute('pointer-events');
    }
    /** 设置 clip-path 属性（url(#id) 引用或移除） */
    setClipPathAttr(el, clipPath) {
        if (clipPath)
            el.setAttribute('clip-path', clipPath);
        else
            el.removeAttribute('clip-path');
    }
    /** 设置 filter 属性（url(#id) 引用或移除） */
    setFilterAttr(el, filterRef) {
        if (filterRef)
            el.setAttribute('filter', filterRef);
        else
            el.removeAttribute('filter');
    }
    /** 设置 mask 属性（url(#id) 引用或移除） */
    setMaskAttr(el, maskRef) {
        if (maskRef)
            el.setAttribute('mask', maskRef);
        else
            el.removeAttribute('mask');
    }
    // ---- Filter ----
    /** 创建 <filter> 元素（挂在 defs 中），内部构建 feXxx 滤镜链 */
    createFilterEl(record) {
        const data = record.data;
        const el = document.createElementNS(NS, 'filter');
        this.applyFilterAttrs(el, data);
        return el;
    }
    /** 更新 <filter>：重新构建滤镜链 */
    updateFilterEl(el, data) {
        this.applyFilterAttrs(el, data);
    }
    /**
     * 构建 feXxx 滤镜链
     *
     * 支持的滤镜效果：
     * - blur → feGaussianBlur
     * - brightness/contrast/opacity → feComponentTransfer（feFuncR/G/B）
     * - dropShadow → feDropShadow
     * - grayscale/saturate → feColorMatrix type="saturate"
     * - sepia → feColorMatrix type="matrix"（4×5 矩阵）
     * - hueRotate → feColorMatrix type="hueRotate"
     *
     * 多个效果通过 result 属性串联（SourceGraphic → result_0 → result_1 → ...）
     * @param el SVGFilterElement
     * @param data 滤镜数据
     */
    applyFilterAttrs(el, data) {
        el.setAttribute('id', data.id);
        // 默认 filterUnits 为 userSpaceOnUse（和 Canvas 行为一致）
        el.setAttribute('filterUnits', 'userSpaceOnUse');
        el.setAttribute('x', '-50%');
        el.setAttribute('y', '-50%');
        el.setAttribute('width', '200%');
        el.setAttribute('height', '200%');
        // 清空旧子节点
        while (el.firstChild)
            el.removeChild(el.firstChild);
        for (let i = 0; i < data.effects.length; i++) {
            const effect = data.effects[i];
            let feEl = null;
            switch (effect.type) {
                case 'blur': {
                    feEl = document.createElementNS(NS, 'feGaussianBlur');
                    feEl.setAttribute('stdDeviation', String(effect.value));
                    break;
                }
                case 'brightness':
                case 'contrast':
                case 'opacity': {
                    feEl = document.createElementNS(NS, 'feComponentTransfer');
                    const func = document.createElementNS(NS, 'feFuncR');
                    func.setAttribute('type', 'linear');
                    if (effect.type === 'brightness') {
                        func.setAttribute('slope', String(effect.value));
                    }
                    else if (effect.type === 'contrast') {
                        const c = effect.value / 100;
                        const intercept = (1 - c) / 2;
                        func.setAttribute('slope', String(c));
                        func.setAttribute('intercept', String(intercept));
                    }
                    else {
                        func.setAttribute('slope', String(effect.value / 100));
                    }
                    feEl.appendChild(func);
                    const funcG = func.cloneNode();
                    feEl.appendChild(funcG);
                    const funcB = func.cloneNode();
                    feEl.appendChild(funcB);
                    break;
                }
                case 'dropShadow': {
                    feEl = document.createElementNS(NS, 'feDropShadow');
                    feEl.setAttribute('dx', String(effect.offsetX ?? 0));
                    feEl.setAttribute('dy', String(effect.offsetY ?? 0));
                    feEl.setAttribute('stdDeviation', String(effect.value));
                    if (effect.color)
                        feEl.setAttribute('flood-color', effect.color);
                    break;
                }
                case 'grayscale': {
                    feEl = document.createElementNS(NS, 'feColorMatrix');
                    feEl.setAttribute('type', 'saturate');
                    feEl.setAttribute('values', String(1 - effect.value / 100));
                    break;
                }
                case 'saturate': {
                    feEl = document.createElementNS(NS, 'feColorMatrix');
                    feEl.setAttribute('type', 'saturate');
                    feEl.setAttribute('values', String(effect.value / 100));
                    break;
                }
                case 'sepia': {
                    feEl = document.createElementNS(NS, 'feColorMatrix');
                    feEl.setAttribute('type', 'matrix');
                    const s = effect.value / 100;
                    // sepia 矩阵
                    feEl.setAttribute('values', [
                        0.393 + 0.607 * (1 - s), 0.769 - 0.769 * (1 - s), 0.189 - 0.189 * (1 - s), 0, 0,
                        0.349 - 0.349 * (1 - s), 0.686 + 0.314 * (1 - s), 0.168 - 0.168 * (1 - s), 0, 0,
                        0.272 - 0.272 * (1 - s), 0.534 - 0.534 * (1 - s), 0.131 + 0.869 * (1 - s), 0, 0,
                        0, 0, 0, 1, 0,
                    ].join(' '));
                    break;
                }
                case 'hueRotate': {
                    feEl = document.createElementNS(NS, 'feColorMatrix');
                    feEl.setAttribute('type', 'hueRotate');
                    feEl.setAttribute('values', String(effect.value));
                    break;
                }
            }
            if (feEl) {
                // 串联滤镜效果（result 链式传递）
                if (i > 0) {
                    feEl.setAttribute('in', `result_${i - 1}`);
                }
                else {
                    feEl.setAttribute('in', 'SourceGraphic');
                }
                if (i < data.effects.length - 1) {
                    feEl.setAttribute('result', `result_${i}`);
                }
                el.appendChild(feEl);
            }
        }
    }
    // ---- Mask ----
    /** 创建 <mask> 元素（挂在 defs 中） */
    createMaskEl(record) {
        const data = record.data;
        const el = document.createElementNS(NS, 'mask');
        this.applyMaskAttrs(el, data);
        return el;
    }
    /** 更新 <mask>：重新设置属性和子元素 */
    updateMaskEl(el, data) {
        this.applyMaskAttrs(el, data);
    }
    /**
     * 构建 mask 元素
     *
     * 结构：
     * 1. 白色背景 <rect>（确保未覆盖区域可见）
     * 2. 遮罩形状子元素（白色填充，用作 alpha mask）
     *
     * 支持 alpha 和 luminance 两种 maskMode
     * @param el SVGMaskElement
     * @param data 遮罩数据
     */
    applyMaskAttrs(el, data) {
        el.setAttribute('id', data.id);
        // maskUnits 默认 userSpaceOnUse（和 Canvas 行为一致）
        el.setAttribute('maskUnits', 'userSpaceOnUse');
        if (data.maskMode === 'luminance') {
            el.setAttribute('mask-type', 'luminance');
        }
        else {
            el.setAttribute('mask-type', 'alpha');
        }
        // 清空旧子节点
        while (el.firstChild)
            el.removeChild(el.firstChild);
        // 填充白色背景（确保 mask 未覆盖区域可见）
        const bg = document.createElementNS(NS, 'rect');
        bg.setAttribute('x', '-100%');
        bg.setAttribute('y', '-100%');
        bg.setAttribute('width', '300%');
        bg.setAttribute('height', '300%');
        bg.setAttribute('fill', '#fff');
        el.appendChild(bg);
        // 填充遮罩形状
        let childEl = null;
        switch (data.shapeType) {
            case 'rect': {
                childEl = document.createElementNS(NS, 'rect');
                const d = data.shapeData;
                childEl.setAttribute('x', String(d.x));
                childEl.setAttribute('y', String(d.y));
                childEl.setAttribute('width', String(d.width));
                childEl.setAttribute('height', String(d.height));
                childEl.setAttribute('fill', '#fff');
                break;
            }
            case 'ellipse': {
                childEl = document.createElementNS(NS, 'ellipse');
                const d = data.shapeData;
                childEl.setAttribute('cx', String(d.cx));
                childEl.setAttribute('cy', String(d.cy));
                childEl.setAttribute('rx', String(d.rx));
                childEl.setAttribute('ry', String(d.ry));
                childEl.setAttribute('fill', '#fff');
                break;
            }
            case 'path': {
                childEl = document.createElementNS(NS, 'path');
                const d = data.shapeData;
                childEl.setAttribute('d', d.d);
                childEl.setAttribute('fill', '#fff');
                break;
            }
        }
        if (childEl)
            el.appendChild(childEl);
    }
    /**
     * 设置 SVG 元素的 transform 属性
     * 将 Transform 对象拼接为 translate(x,y) rotate(deg) scale(sx,sy) 字符串
     * @param el SVG 元素
     * @param t Transform 对象
     */
    setTransform(el, t) {
        if (!t) {
            el.removeAttribute('transform');
            return;
        }
        const parts = [];
        const { x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1 } = t;
        if (x !== 0 || y !== 0)
            parts.push(`translate(${x}, ${y})`);
        if (rotation !== 0)
            parts.push(`rotate(${rotation})`);
        if (scaleX !== 1 || scaleY !== 1)
            parts.push(`scale(${scaleX}, ${scaleY})`);
        if (parts.length > 0)
            el.setAttribute('transform', parts.join(' '));
        else
            el.removeAttribute('transform');
    }
}
export { SVGRenderer };
