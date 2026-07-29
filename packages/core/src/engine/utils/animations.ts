import { lerpColor } from './colors';
import { TRANSFORM_ANIM_ATTRS } from './constants/animation';
import type {
  AnimEasing,
  AnimTarget,
  ElementData,
  ElementType,
  Transform,
} from '../types';

/** group / animation 容器默认 transform */
const DEFAULT_TRANSFORM: Required<Transform> = {
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

/** 缓动函数表 */
const EASING_FNS: Record<AnimEasing, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2),
  easeInBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  easeInElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

/**
 * 判断属性名是否为 transform 动画属性
 * @param attr 属性名
 * @returns 是否属于 transform 动画属性
 */
function isTransformAnimAttr(attr: string): boolean {
  return TRANSFORM_ANIM_ATTRS.has(attr);
}

/**
 * 应用命名缓动
 * @param name 缓动名
 * @param t 原始进度 0→1
 * @returns 缓动后进度
 */
function applyEasing(name: AnimEasing | undefined, t: number): number {
  const fn = EASING_FNS[name ?? 'linear'] ?? EASING_FNS.linear;
  return fn(Math.max(0, Math.min(1, t)));
}

/**
 * 对单个 playbook 步骤的值进行插值
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

/**
 * 是否应写入 data.transform（容器节点）
 * @param type 节点类型
 * @param attr 属性名
 */
function shouldWriteTransform(type: ElementType, attr: string): boolean {
  return isTransformAnimAttr(attr) && (type === 'group' || type === 'animation');
}

/**
 * 读取节点上某动画属性的当前值
 * @param data 节点 data
 * @param type 节点类型
 * @param attr 属性名
 * @returns 当前值；缺失时返回合理默认
 */
function readAnimAttr(
  data: ElementData,
  type: ElementType,
  attr: string,
): number | string {
  const record = data as Record<string, unknown>;
  if (shouldWriteTransform(type, attr)) {
    const tf = (record.transform as Transform | undefined) ?? DEFAULT_TRANSFORM;
    const v = tf[attr as keyof Transform];
    if (typeof v === 'number') return v;
    return DEFAULT_TRANSFORM[attr as keyof Required<Transform>] ?? 0;
  }
  const v = record[attr];
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (attr === 'opacity') return 1;
  if (attr === 'scaleX' || attr === 'scaleY') return 1;
  return 0;
}

/**
 * 把属性值写入 partial data（可累加同帧多属性）
 * @param type 节点类型
 * @param attr 属性名
 * @param value 值
 * @param partial 累加的 partial（会被就地扩展后返回）
 * @param currentData 当前节点 data（用于合并 transform）
 * @returns 更新后的 partial
 */
function writeAnimAttr(
  type: ElementType,
  attr: string,
  value: number | string,
  partial: Record<string, unknown>,
  currentData: ElementData,
): Record<string, unknown> {
  if (shouldWriteTransform(type, attr)) {
    const base = {
      ...DEFAULT_TRANSFORM,
      ...((currentData as { transform?: Transform }).transform ?? {}),
      ...((partial.transform as Transform | undefined) ?? {}),
      [attr]: value as number,
    };
    partial.transform = base;
    return partial;
  }
  partial[attr] = value;
  return partial;
}

/**
 * 解析 AnimTarget 为节点 id 列表
 *
 * `targets: 'children'` 会穿透 clipPath / filter / mask 效果容器，
 * 取到真正的可动画子节点（避免 Animation 外包一层 ClipPath 后打空）。
 * @param targets 目标声明
 * @param containerId Animation 容器 id
 * @param getChildIds 读取直接子节点 id
 * @param getNode 读取节点（用于识别效果容器类型）
 * @param attribute 当前步骤属性（缺省 targets 时用于推断 self/children）
 */
function resolveAnimTargets(
  targets: AnimTarget | undefined,
  containerId: string,
  getChildIds: (id: string) => string[],
  getNode: (id: string) => { type: string } | undefined,
  attribute?: string,
): string[] {
  const resolved = targets ?? (
    attribute && isTransformAnimAttr(attribute) ? 'self' : 'children'
  );

  if (resolved === 'self') return [containerId];
  if (resolved === 'children') {
    return expandAnimChildTargets(containerId, getChildIds, getNode);
  }
  if (Array.isArray(resolved)) return resolved;
  return [resolved];
}

/** 效果容器类型：Animation targets:'children' 时穿透 */
const ANIM_EFFECT_CONTAINER_TYPES = new Set(['clipPath', 'filter', 'mask']);

/**
 * 展开 Animation 的 children 目标：穿透效果容器
 * @param containerId Animation 容器 id
 * @param getChildIds 子节点查询
 * @param getNode 节点查询
 */
function expandAnimChildTargets(
  containerId: string,
  getChildIds: (id: string) => string[],
  getNode: (id: string) => { type: string } | undefined,
): string[] {
  const result: string[] = [];
  const visit = (id: string) => {
    for (const childId of getChildIds(id)) {
      const node = getNode(childId);
      if (node && ANIM_EFFECT_CONTAINER_TYPES.has(node.type)) {
        visit(childId);
      } else {
        result.push(childId);
      }
    }
  };
  visit(containerId);
  return result;
}

/**
 * 将 loop 配置归一为剩余循环计数（-1 无限，0 不循环）
 * @param loop playbook loop 字段
 */
function normalizeLoopCount(loop: boolean | number | undefined): number {
  if (loop === true) return -1;
  if (typeof loop === 'number' && loop > 0) return loop;
  return 0;
}

export {
  DEFAULT_TRANSFORM,
  EASING_FNS,
  isTransformAnimAttr,
  applyEasing,
  lerpAnimValue,
  applyAnimAttrs,
  shouldWriteTransform,
  readAnimAttr,
  writeAnimAttr,
  resolveAnimTargets,
  normalizeLoopCount,
};
