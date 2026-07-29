import { IDENTITY_MAT3 } from '../utils/constants/matrix';
import { transformToMatrix, multiplyMat3, } from '../utils';
/** 默认视口：不缩放、不平移 */
const DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 };
/**
 * Renderer —— 抽象渲染器基类（递归版）
 *
 * 提供渲染器共用的能力：
 * - viewport 视口管理
 * - 可视区域裁剪（cullMargin + AABB 检查）
 * - worldMatrix 合成（renderNode 递归模板方法）
 * - 局部包围盒估算（estimateLocalBounds，已提取到 utils/bounds.ts）
 *
 * 子类需实现：
 * - mount / resize / render / renderElement / remove / clear / dispose
 * - drawSelf（具体形状绘制）
 * - startDrag / stopDrag
 */
class Renderer {
    container = null;
    eventSystem = null;
    model = null;
    /** 视口（相机）状态 */
    viewport = { ...DEFAULT_VIEWPORT };
    /** 画布尺寸（mount/resize 时更新） */
    viewWidth = 0;
    viewHeight = 0;
    /** 可视区域裁剪边距 */
    cullMargin = { top: 0, right: 0, bottom: 0, left: 0 };
    /** 注入 Model */
    setModel(model) {
        this.model = model;
    }
    /**
     * 设置裁剪边距（传入画布尺寸的百分比；边距不能小于 0 即不允许向内收缩）
     * @param margin 裁剪边距
     * @param canvasWidth 画布宽度
     * @param canvasHeight 画布高度
     */
    setCullMargin(margin, canvasWidth, canvasHeight) {
        this.cullMargin = {
            top: Math.max(0, margin.top ?? canvasHeight * 0.2),
            right: Math.max(0, margin.right ?? canvasWidth * 0.2),
            bottom: Math.max(0, margin.bottom ?? canvasHeight * 0.2),
            left: Math.max(0, margin.left ?? canvasWidth * 0.2),
        };
        // 如果宽高还没设置，在 resize 时再次补调
        if (canvasWidth > 0)
            this.viewWidth = canvasWidth;
        if (canvasHeight > 0)
            this.viewHeight = canvasHeight;
    }
    /** 设置事件系统 */
    setEventSystem(es) {
        this.eventSystem = es;
    }
    /**
     * 设置视口（相机）变换
     * @param v 新视口
     * @returns true 表示 viewport 确实发生了变化
     */
    setViewport(v) {
        if (this.viewport.x === v.x &&
            this.viewport.y === v.y &&
            this.viewport.scale === v.scale) {
            return false;
        }
        this.viewport = { ...v };
        this.eventSystem?.setViewport(v);
        if (this.model) {
            for (const r of this.model.getAllElements())
                r.worldMatrixDirty = true;
        }
        return true;
    }
    /** 获取当前视口状态（返回拷贝） */
    getViewport() {
        return { ...this.viewport };
    }
    /** 启动拖拽监听（子类实现具体逻辑） */
    registerDrag(id, onDrag, onDragEnd, evt) {
        this.startDrag(id, onDrag, onDragEnd, evt);
    }
    // ========== 可视区域裁剪 ==========
    /**
     * 获取当前可视区域的世界坐标范围（考虑 viewport 变换 + 边距）
     * @returns 可视区域的世界坐标，边距全为 0 时返回 null 表示不做裁剪
     */
    getVisibleBounds() {
        const { top, right, bottom, left } = this.cullMargin;
        if (top === 0 && right === 0 && bottom === 0 && left === 0)
            return null;
        const { x: vx, y: vy, scale } = this.viewport;
        const invScale = 1 / scale;
        // 视口在画布坐标系中的可见范围
        const visX = -vx - left;
        const visY = -vy - top;
        const visW = this.viewWidth + left + right;
        const visH = this.viewHeight + top + bottom;
        // 转换到世界坐标
        return {
            x: visX * invScale,
            y: visY * invScale,
            w: visW * invScale,
            h: visH * invScale,
        };
    }
    /**
     * 判断一个节点是否在可视区域内（粗略 AABB 检查）
     * 子类在递归渲染前调用此方法决定是否跳过
     * @param _node 元素记录
     */
    isInViewport(_node) {
        // 基类默认不过滤；子类（Canvas/SVG）覆盖后加入 bounds 检查
        return true;
    }
    // ========== 递归渲染工具（供子类使用） ==========
    /**
     * 递归渲染节点：合成 worldMatrix → 画自身 → 递归 children
     * @param node 当前节点
     * @param parentMatrix 父节点的世界矩阵
     */
    renderNode(node, parentMatrix, _visible) {
        if (node.removed)
            return;
        // 1. 合成当前节点的 worldMatrix
        const dataAny = node.data;
        const localMatrix = transformToMatrix(dataAny.transform);
        multiplyMat3(node.worldMatrix, parentMatrix, localMatrix);
        node.worldMatrixDirty = false;
        // 2. 画自己（仅当 dirty 且非 group/animation 容器）
        if (node.dirty && node.type !== 'group' && node.type !== 'animation') {
            this.drawSelf(node);
        }
        // 3. 递归 children
        for (const child of node.children) {
            this.renderNode(child, node.worldMatrix);
        }
        // 4. 清理脏标记
        if (node.dirty) {
            node.dirty = false;
            node.subtreeDirty = false;
        }
    }
}
export { Renderer, IDENTITY_MAT3 };
