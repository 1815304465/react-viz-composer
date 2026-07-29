import { NON_DRAWABLE_TYPES } from './constants/paintOrder';
/**
 * 绘制排序：按 zIndex 升序排列，同 zIndex 保持插入顺序
 * @param records 元素记录列表
 * @returns 排序后的元素记录列表
 */
function sortByPaintOrder(records) {
    return records
        .map((record, index) => ({ record, index }))
        .sort((a, b) => {
        const za = a.record.data.zIndex ?? 0;
        const zb = b.record.data.zIndex ?? 0;
        if (za !== zb)
            return za - zb;
        return a.index - b.index;
    })
        .map(({ record }) => record);
}
/**
 * 判断元素是否参与 zIndex 绘制排序
 * @param type 元素类型
 */
function isDrawableForPaintOrder(type) {
    return !NON_DRAWABLE_TYPES.has(type);
}
/**
 * 按 zIndex 对 drawable 元素排序
 * @param elements 活跃元素列表
 */
function getPaintOrderedDrawables(elements) {
    return sortByPaintOrder(elements.filter((e) => !e.removed && isDrawableForPaintOrder(e.type)));
}
/**
 * SVG：按绘制顺序重排 DOM 子节点（appendChild 移动到末尾）
 * @param parent 父容器（viewportGroup）
 * @param elementMap id → DOM 映射
 * @param orderedRecords 已排序的元素记录
 */
function reorderSvgDomPaintOrder(parent, elementMap, orderedRecords) {
    for (const record of orderedRecords) {
        const el = elementMap.get(record.id);
        if (el && el.parentNode === parent) {
            parent.appendChild(el);
        }
    }
}
export { sortByPaintOrder, isDrawableForPaintOrder, getPaintOrderedDrawables, reorderSvgDomPaintOrder, };
