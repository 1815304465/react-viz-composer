import { getShapeOpacity } from './opacity';
/**
 * 沿 parentId 链累乘 opacity，得到元素的有效不透明度
 * @param model 元素模型
 * @param record 当前元素记录
 * @returns 有效不透明度（0~1）
 */
function getEffectiveOpacity(model, record) {
    let opacity = getShapeOpacity(record.data);
    let parentId = record.parentId;
    while (parentId) {
        const parent = model.getElement(parentId);
        if (!parent)
            break;
        if (parent.type === 'group') {
            opacity *= getShapeOpacity(parent.data);
        }
        else {
            opacity *= getShapeOpacity(parent.data);
        }
        parentId = parent.parentId;
    }
    return Math.max(0, Math.min(1, opacity));
}
/**
 * 判断元素及其所有祖先是否可见
 * @param model 元素模型
 * @param record 当前元素记录
 * @returns 是否可见
 */
function isElementVisible(model, record) {
    if (record.data.visible === false)
        return false;
    let parentId = record.parentId;
    while (parentId) {
        const parent = model.getElement(parentId);
        if (!parent)
            break;
        if (parent.data.visible === false)
            return false;
        parentId = parent.parentId;
    }
    return true;
}
/**
 * 判断元素是否参与指针命中检测（自身及祖先 pointerEvents 均不为 none）
 * @param model 元素模型
 * @param record 当前元素记录
 * @returns 是否参与指针事件
 */
function isPointerEventsEnabled(model, record) {
    if (record.data.pointerEvents === 'none')
        return false;
    let parentId = record.parentId;
    while (parentId) {
        const parent = model.getElement(parentId);
        if (!parent)
            break;
        if (parent.data.pointerEvents === 'none')
            return false;
        parentId = parent.parentId;
    }
    return true;
}
/**
 * 判断 record 是否为指定祖先的后代节点
 * @param model 元素模型
 * @param record 当前元素记录
 * @param ancestorId 祖先节点 id
 * @returns 是否为后代
 */
function isDescendantOf(model, record, ancestorId) {
    let pid = record.parentId;
    while (pid) {
        if (pid === ancestorId)
            return true;
        pid = model.getElement(pid)?.parentId;
    }
    return false;
}
export { getEffectiveOpacity, isElementVisible, isPointerEventsEnabled, isDescendantOf, };
