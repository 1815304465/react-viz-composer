/**
 * 深度数值插值 —— 对对象 / 数组中的 number 做 lerp，其余字段跟 to 走
 */

/** easeOutCubic，用于实时模拟过渡 */
export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

/**
 * 在 from → to 之间按 t∈[0,1] 插值
 * @param from 起点
 * @param to 终点
 * @param t 进度
 */
export function lerpDeep<T>(from: T, to: T, t: number): T {
  if (t <= 0) return from;
  if (t >= 1) return to;

  if (typeof from === 'number' && typeof to === 'number') {
    return (from + (to - from) * t) as T;
  }

  if (Array.isArray(from) && Array.isArray(to)) {
    return to.map((item, i) => {
      if (i >= from.length) return item;
      return lerpDeep(from[i], item, t);
    }) as T;
  }

  if (
    from !== null
    && to !== null
    && typeof from === 'object'
    && typeof to === 'object'
    && !Array.isArray(from)
    && !Array.isArray(to)
  ) {
    const a = from as Record<string, unknown>;
    const b = to as Record<string, unknown>;
    const out: Record<string, unknown> = { ...b };
    for (const key of Object.keys(b)) {
      if (Object.prototype.hasOwnProperty.call(a, key)) {
        out[key] = lerpDeep(a[key], b[key], t);
      }
    }
    return out as T;
  }

  return to;
}
