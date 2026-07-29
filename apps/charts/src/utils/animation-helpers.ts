/**
 * animation-helpers.ts —— 缓动函数 + 动画插值工具
 *
 * 零 React 依赖，可在任何环境使用
 */

/** easeOutCubic：起步更柔、末端减速 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** 将 progress 限制在 0~1 */
function clampProgress(progress: number): number {
  return Math.max(0, Math.min(1, progress));
}

/**
 * 将数值按入场进度从 0 插值到目标值
 * @param value 目标值
 * @param progress 0~1
 */
export function animValue(value: number, progress: number): number {
  return value * clampProgress(progress);
}

/**
 * 尺寸类属性插值，保证非负
 * @param value 目标尺寸
 * @param progress 0~1
 */
export function animSize(value: number, progress: number): number {
  return Math.max(0, value * clampProgress(progress));
}
