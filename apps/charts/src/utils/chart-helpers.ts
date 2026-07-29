/**
 * chart-helpers.ts —— 图表交互辅助纯函数
 *
 * 不依赖 React 的纯工具函数
 */

/**
 * hover 时描边加粗
 * @param base 默认描边宽度
 * @param active 是否 hover
 */
export function hoverStrokeWidth(base: number, active: boolean): number {
  return active ? base + 1.5 : base;
}

/**
 * hover 时略微提高不透明度
 * @param base 默认 opacity
 * @param active 是否 hover
 */
export function hoverOpacity(base: number, active: boolean): number {
  return active ? Math.min(1, base + 0.12) : base;
}
