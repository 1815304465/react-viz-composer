import { lerpColor } from './colors';
import { TRANSFORM_ANIM_ATTRS } from './constants/animation';

/**
 * 判断属性名是否为 transform 动画属性
 * @param attr 属性名
 * @returns 是否属于 transform 动画属性
 */
function isTransformAnimAttr(attr: string): boolean {
  return TRANSFORM_ANIM_ATTRS.has(attr);
}

/**
 * 对单个 playbook 步骤的值进行插值
 * 自动根据类型（数字/颜色字符串）选择插值策略
 * @param from 起始值
 * @param to 结束值
 * @param t 插值因子（0~1，已缓动）
 * @returns 插值后的值
 */
function lerpAnimValue(from: number | string, to: number | string, t: number): number | string {
  if (typeof from === 'string' || typeof to === 'string') {
    return lerpColor(String(from), String(to), t);
  }
  return from + (to - from) * t;
}

/**
 * 将动画属性值浅合并到形状 data 上（不覆盖 transform 属性）
 * transform 属性（x/y/rotation/scaleX/scaleY）由 Animation/Group 单独通过矩阵合成处理
 * @param base 原始 data
 * @param attrs 动画属性值映射
 * @returns 合并后的新 data 对象
 */
function applyAnimAttrs<T extends object>(
  base: T,
  attrs: Record<string, number | string>,
): T {
  if (Object.keys(attrs).length === 0) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [key, val] of Object.entries(attrs)) {
    if (isTransformAnimAttr(key)) continue;
    out[key] = val;
  }
  return out as T;
}

export {
  isTransformAnimAttr,
  lerpAnimValue,
  applyAnimAttrs,
};
