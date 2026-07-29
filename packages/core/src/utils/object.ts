/**
 * 轻量对象工具（替代 lodash-es，保证 CJS/ESM 双构建无 ESM-only 外置依赖）
 */

/** 从对象中按 key 列表拣选字段 */
export function pick<T extends object>(
  obj: T,
  keys: readonly PropertyKey[],
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (out as Record<PropertyKey, unknown>)[key] = (obj as Record<PropertyKey, unknown>)[key];
    }
  }
  return out;
}

/** 浅合并多个对象（后者覆盖前者）；用于 Group transform 等扁平配置 */
export function shallowMerge<T extends object>(...sources: Partial<T>[]): T {
  return Object.assign({}, ...sources) as T;
}

/**
 * 深度相等（覆盖 null / 数组 / 纯对象 / 原始值）
 * 不处理 Date / Map / 循环引用；图表 ElementData 场景足够
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object') {
    if (typeof b !== 'object' || Array.isArray(b)) return false;
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
      if (!isEqual(aObj[key], bObj[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * 节流：尾随触发，wait ms 内最多执行一次；返回的函数带 cancel
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
): ((...args: TArgs) => void) & { cancel: () => void } {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: TArgs | null = null;

  const invoke = (args: TArgs, now: number) => {
    last = now;
    pending = null;
    fn(...args);
  };

  const throttled = ((...args: TArgs) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    pending = args;
    if (remaining <= 0 || remaining > wait) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      invoke(args, now);
      return;
    }
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        if (pending) invoke(pending, Date.now());
      }, remaining);
    }
  }) as ((...args: TArgs) => void) & { cancel: () => void };

  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  };

  return throttled;
}
