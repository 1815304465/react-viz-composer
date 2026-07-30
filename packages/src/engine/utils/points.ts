import type { PointsData } from '../types';

/**
 * 从标量或数组中读取第 i 个点的属性
 * @param value 标量或数组
 * @param index 点索引
 * @param fallback 缺省值
 */
function pointAttr<T>(value: T | T[] | undefined, index: number, fallback: T): T {
  if (value === undefined) return fallback;
  return Array.isArray(value) ? (value[index] ?? fallback) : value;
}

/**
 * 批量圆点数量
 * @param data 圆点数据
 */
function getPointsCount(data: PointsData): number {
  return Math.min(data.cx.length, data.cy.length);
}

/**
 * 估算批量圆点的局部包围盒
 * @param data 圆点数据
 */
function estimatePointsBounds(data: PointsData): { x: number; y: number; width: number; height: number } | null {
  const n = getPointsCount(data);
  if (n === 0) return null;

  const defaultRx = pointAttr(data.rx, 0, 4);
  const defaultRy = pointAttr(data.ry, 0, defaultRx);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < n; i++) {
    const rx = pointAttr(data.rx, i, defaultRx);
    const ry = pointAttr(data.ry, i, defaultRy);
    const cx = data.cx[i];
    const cy = data.cy[i];
    minX = Math.min(minX, cx - rx);
    minY = Math.min(minY, cy - ry);
    maxX = Math.max(maxX, cx + rx);
    maxY = Math.max(maxY, cy + ry);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * 检测局部坐标是否命中批量圆点中的某个点
 * @param data 圆点数据
 * @param x 局部 x
 * @param y 局部 y
 * @returns 命中点索引，未命中返回 -1
 */
function hitTestPoints(data: PointsData, x: number, y: number): number {
  const n = getPointsCount(data);
  const defaultRx = pointAttr(data.rx, 0, 4);
  const defaultRy = pointAttr(data.ry, 0, defaultRx);

  for (let i = n - 1; i >= 0; i--) {
    const rx = pointAttr(data.rx, i, defaultRx);
    const ry = pointAttr(data.ry, i, defaultRy);
    const dx = (x - data.cx[i]) / (rx || 1);
    const dy = (y - data.cy[i]) / (ry || 1);
    if (dx * dx + dy * dy <= 1) return i;
  }
  return -1;
}

export { pointAttr, getPointsCount, estimatePointsBounds, hitTestPoints };
