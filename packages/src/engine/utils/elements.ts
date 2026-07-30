import type { ElementRecord, GroupData } from '../types';
import { getShapeOpacity } from './opacity';

/** 元素模型最小接口（避免循环依赖，实际由 graph/Model 实现） */
interface Model {
  getElement(id: string): ElementRecord | undefined;
}

/** 带通用形状属性的 data 片段 */
interface ShapeCommonData {
  opacity?: number;
  visible?: boolean;
  pointerEvents?: 'auto' | 'none';
  zIndex?: number;
}

/**
 * 沿 parentId 链累乘 opacity，得到元素的有效不透明度
 * @param model 元素模型
 * @param record 当前元素记录
 * @returns 有效不透明度（0~1）
 */
function getEffectiveOpacity(model: Model, record: ElementRecord): number {
  let opacity = getShapeOpacity(record.data as ShapeCommonData);
  let parentId = record.parentId;
  while (parentId) {
    const parent = model.getElement(parentId);
    if (!parent) break;
    if (parent.type === 'group') {
      opacity *= getShapeOpacity(parent.data as GroupData);
    } else {
      opacity *= getShapeOpacity(parent.data as ShapeCommonData);
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
function isElementVisible(model: Model, record: ElementRecord): boolean {
  if ((record.data as ShapeCommonData).visible === false) return false;
  let parentId = record.parentId;
  while (parentId) {
    const parent = model.getElement(parentId);
    if (!parent) break;
    if ((parent.data as ShapeCommonData).visible === false) return false;
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
function isPointerEventsEnabled(model: Model, record: ElementRecord): boolean {
  if ((record.data as ShapeCommonData).pointerEvents === 'none') return false;
  let parentId = record.parentId;
  while (parentId) {
    const parent = model.getElement(parentId);
    if (!parent) break;
    if ((parent.data as ShapeCommonData).pointerEvents === 'none') return false;
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
function isDescendantOf(model: Model, record: ElementRecord, ancestorId: string): boolean {
  let pid = record.parentId;
  while (pid) {
    if (pid === ancestorId) return true;
    pid = model.getElement(pid)?.parentId;
  }
  return false;
}

export {
  getEffectiveOpacity,
  isElementVisible,
  isPointerEventsEnabled,
  isDescendantOf,
  type ShapeCommonData,
};
