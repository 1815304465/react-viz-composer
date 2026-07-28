/**
 * 调色板 —— 12 色分类 + 6 色语义 + K线涨跌色
 *
 * 灵感来自 antd 与 echarts 默认配色
 */

/** 12 色分类色板（用于多系列柱状/折线/饼图） */
export const CATEGORY_12: string[] = [
  '#5B8FF9', // 蓝
  '#5AD8A6', // 青绿
  '#5D7092', // 灰蓝
  '#F6BD16', // 黄
  '#E86452', // 红
  '#6DC8EC', // 浅蓝
  '#945FB9', // 紫
  '#FF9D4D', // 橙
  '#269A99', // 深青
  '#FF99C3', // 粉
  '#3CC8C8', // 蓝绿
  '#A1A0F8', // 淡紫
];

/** 6 色语义色板（蓝/橙/绿/红/紫/青） */
export const SEMANTIC_6: string[] = [
  '#1677ff', // 主蓝
  '#fa8c16', // 橙
  '#52c41a', // 绿
  '#f5222d', // 红
  '#722ed1', // 紫
  '#13c2c2', // 青
];

/** K线 / 股票涨跌色（默认红涨绿跌，遵循中国 A 股习惯） */
export const KLINE_UP = '#f5222d';
export const KLINE_DOWN = '#52c41a';

/** 网格 / 轴线灰色 */
export const AXIS_COLOR = '#d9d9d9';
export const GRID_COLOR = '#f0f0f0';
export const TEXT_COLOR = '#595959';
export const TEXT_LIGHT = '#bfbfbf';

/** 按索引取色（自动循环） */
export function colorAt(i: number): string {
  return CATEGORY_12[i % CATEGORY_12.length];
}
