import { IDENTITY_MAT3 } from './constants/matrix';
import { isDescendantOf } from './elements';
/**
 * 计算单个 drawable 元素（rect/ellipse/line/path/text/image）的局部包围盒
 * @param record 元素记录
 * @returns 包围盒，无法计算时返回 null
 */
function getElementBounds(record) {
    switch (record.type) {
        case 'rect': {
            const d = record.data;
            return { x: d.x, y: d.y, width: Math.max(0, d.width), height: Math.max(0, d.height) };
        }
        case 'ellipse': {
            const d = record.data;
            return {
                x: d.cx - d.rx,
                y: d.cy - d.ry,
                width: d.rx * 2,
                height: d.ry * 2,
            };
        }
        case 'line': {
            const d = record.data;
            if (d.points.length === 0)
                return null;
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (const p of d.points) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        case 'path':
            return null;
        case 'text': {
            const d = record.data;
            const lines = d.text.split('\n');
            const fs = d.fontSize ?? 16;
            const lineHeight = d.lineHeight ?? fs * 1.2;
            const height = lines.length * lineHeight;
            const width = Math.max(...lines.map((line) => line.length * fs * 0.6), fs);
            let x = d.x;
            if (d.textAlign === 'middle')
                x -= width / 2;
            else if (d.textAlign === 'end')
                x -= width;
            let y = d.y;
            if (d.textBaseline === 'middle')
                y -= height / 2;
            else if (d.textBaseline === 'bottom')
                y -= height;
            return { x, y, width, height };
        }
        case 'image': {
            const d = record.data;
            return { x: d.x, y: d.y, width: Math.max(0, d.width), height: Math.max(0, d.height) };
        }
        default:
            return null;
    }
}
/**
 * 合并两个轴对齐包围盒，取并集
 * @param a 包围盒 a
 * @param b 包围盒 b
 * @returns 合并后的包围盒
 */
function mergeBounds(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const right = Math.max(a.x + a.width, b.x + b.width);
    const bottom = Math.max(a.y + a.height, b.y + b.height);
    return { x, y, width: right - x, height: bottom - y };
}
/**
 * 估算节点的世界坐标包围盒（未经 matrix 变换的局部 bounds）
 * 返回 null 表示无法估算（group/animation/渐变/clipPath 等容器节点 / path 节点）
 * @param node 元素记录
 * @returns 局部包围盒，无法估算时返回 null
 */
function estimateLocalBounds(node) {
    const d = node.data;
    switch (node.type) {
        case 'rect':
            return { x: d.x ?? 0, y: d.y ?? 0, w: d.width ?? 0, h: d.height ?? 0 };
        case 'ellipse':
            return { x: (d.cx ?? 0) - (d.rx ?? 0), y: (d.cy ?? 0) - (d.ry ?? 0), w: (d.rx ?? 0) * 2, h: (d.ry ?? 0) * 2 };
        case 'text': {
            const fs = d.fontSize ?? 14;
            const txt = String(d.text ?? '');
            return { x: d.x ?? 0, y: (d.y ?? 0) - fs, w: txt.length * fs * 0.6, h: fs * 1.5 };
        }
        case 'image':
            return { x: d.x ?? 0, y: d.y ?? 0, w: d.width ?? 0, h: d.height ?? 0 };
        case 'line': {
            const pts = d.points ?? [];
            if (pts.length === 0)
                return null;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of pts) {
                if (p.x < minX)
                    minX = p.x;
                if (p.y < minY)
                    minY = p.y;
                if (p.x > maxX)
                    maxX = p.x;
                if (p.y > maxY)
                    maxY = p.y;
            }
            return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        }
        case 'path': {
            // Path 无法快速估算 bounds 而不解析 d 字符串；默认不裁剪 Path 节点
            return null;
        }
        default:
            return null;
    }
}
/**
 * 检查局部包围盒经 worldMatrix 变换后是否与可见区域相交
 * 使用 corner-translate 方法：将局部 bounds 的 4 个角变换到世界坐标，
 * 然后检查变换后的 AABB 是否与可见区域相交
 * @param localBounds 局部包围盒
 * @param worldMatrix 世界矩阵
 * @param visible 可见区域
 * @returns 是否相交
 */
function boundsIntersectViewport(localBounds, worldMatrix, visible) {
    const corners = [
        { x: localBounds.x, y: localBounds.y },
        { x: localBounds.x + localBounds.w, y: localBounds.y },
        { x: localBounds.x, y: localBounds.y + localBounds.h },
        { x: localBounds.x + localBounds.w, y: localBounds.y + localBounds.h },
    ];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of corners) {
        const wx = worldMatrix[0] * c.x + worldMatrix[1] * c.y + worldMatrix[2];
        const wy = worldMatrix[3] * c.x + worldMatrix[4] * c.y + worldMatrix[5];
        if (wx < minX)
            minX = wx;
        if (wy < minY)
            minY = wy;
        if (wx > maxX)
            maxX = wx;
        if (wy > maxY)
            maxY = wy;
    }
    // AABB 相交检测
    return !(maxX < visible.x ||
        minX > visible.x + visible.w ||
        maxY < visible.y ||
        minY > visible.y + visible.h);
}
/**
 * 计算 Group 子树下所有 drawable 子节点的合并包围盒
 * 用于 Group 的命中检测
 * @param model 元素模型
 * @param groupId group 节点 id
 * @returns 合并包围盒，无 drawable 子节点时返回 null
 */
function getGroupBounds(model, groupId) {
    let bounds = null;
    for (const record of model.getActiveElements()) {
        if (record.parentId !== groupId && !isDescendantOf(model, record, groupId))
            continue;
        if (record.type === 'group')
            continue;
        const b = getElementBounds(record);
        if (!b)
            continue;
        bounds = bounds ? mergeBounds(bounds, b) : b;
    }
    return bounds;
}
export { getElementBounds, mergeBounds, estimateLocalBounds, boundsIntersectViewport, getGroupBounds, IDENTITY_MAT3, };
