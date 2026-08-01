import type { Transform } from '../types';
import { IDENTITY_MAT3, type Mat3 } from './constants/matrix';

/**
 * Transform 转 3×3 仿射矩阵（列主序）
 * 变换顺序：translate → rotate → scale
 */
function transformToMatrix(t: Transform | undefined): Mat3 {
  if (!t) return new Float32Array(IDENTITY_MAT3);
  const { x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1 } = t;
  if (x === 0 && y === 0 && rotation === 0 && scaleX === 1 && scaleY === 1) {
    return new Float32Array(IDENTITY_MAT3);
  }
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return new Float32Array([
    scaleX * cos, scaleX * sin, 0,
    -scaleY * sin, scaleY * cos, 0,
    x, y, 1,
  ]);
}

/** 矩阵相乘 out = a * b（列主序，结果写入 out） */
function multiplyMat3(out: Mat3, a: Mat3, b: Mat3): Mat3 {
  const a00 = a[0], a01 = a[1], a02 = a[2];
  const a10 = a[3], a11 = a[4], a12 = a[5];
  const a20 = a[6], a21 = a[7], a22 = a[8];
  const b00 = b[0], b01 = b[1], b02 = b[2];
  const b10 = b[3], b11 = b[4], b12 = b[5];
  const b20 = b[6], b21 = b[7], b22 = b[8];
  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a00 * b10 + a10 * b11 + a20 * b12;
  out[4] = a01 * b10 + a11 * b11 + a21 * b12;
  out[5] = a02 * b10 + a12 * b11 + a22 * b12;
  out[6] = a00 * b20 + a10 * b21 + a20 * b22;
  out[7] = a01 * b20 + a11 * b21 + a21 * b22;
  out[8] = a02 * b20 + a12 * b21 + a22 * b22;
  return out;
}

/** 点到线段的最短距离 */
function pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * 仿射 3×3 矩阵求逆（列主序，最后一行应为 0,0,1）
 * @param out 输出矩阵
 * @param m 输入矩阵
 * @returns 是否可逆
 */
function invertMat3(out: Mat3, m: Mat3): boolean {
  // 对 2D 仿射：| a c tx |
  //            | b d ty |
  //            | 0 0 1  |
  const a = m[0];
  const b = m[1];
  const c = m[3];
  const d = m[4];
  const tx = m[6];
  const ty = m[7];
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return false;
  const invDet = 1 / det;
  out[0] = d * invDet;
  out[1] = -b * invDet;
  out[2] = 0;
  out[3] = -c * invDet;
  out[4] = a * invDet;
  out[5] = 0;
  out[6] = (c * ty - d * tx) * invDet;
  out[7] = (b * tx - a * ty) * invDet;
  out[8] = 1;
  return true;
}

/**
 * 用矩阵变换点（列主序仿射）
 * @param m 变换矩阵
 * @param x 输入 x
 * @param y 输入 y
 */
function transformPointMat3(m: Mat3, x: number, y: number): { x: number; y: number } {
  return {
    x: m[0] * x + m[3] * y + m[6],
    y: m[1] * x + m[4] * y + m[7],
  };
}

/**
 * 用矩阵的逆将世界坐标变换到局部坐标
 * @param m 世界矩阵（parent × local）
 * @param worldX 世界 x
 * @param worldY 世界 y
 */
function worldToLocalPoint(m: Mat3, worldX: number, worldY: number): { x: number; y: number } {
  const inv = new Float32Array(9) as Mat3;
  if (!invertMat3(inv, m)) return { x: worldX, y: worldY };
  return transformPointMat3(inv, worldX, worldY);
}

/**
 * 将世界空间位移转换为局部空间位移（忽略平移，只取线性部分逆）
 * 用于拖拽：屏幕增量 → 世界增量后再换到元素局部坐标
 * @param m 元素 worldMatrix
 * @param worldDx 世界 dx
 * @param worldDy 世界 dy
 */
function worldDeltaToLocalDelta(
  m: Mat3,
  worldDx: number,
  worldDy: number,
): { x: number; y: number } {
  const a = m[0];
  const b = m[1];
  const c = m[3];
  const d = m[4];
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return { x: worldDx, y: worldDy };
  const invDet = 1 / det;
  return {
    x: (d * worldDx - c * worldDy) * invDet,
    y: (-b * worldDx + a * worldDy) * invDet,
  };
}

/**
 * 将局部包围盒 4 角经列主序矩阵变换后取世界 AABB
 * @param local 局部包围盒 {x,y,w,h} 或 {x,y,width,height}
 * @param matrix 世界矩阵
 */
function localBoundsToWorldAABB(
  local: { x: number; y: number; w?: number; h?: number; width?: number; height?: number },
  matrix: Mat3,
): { x: number; y: number; width: number; height: number } {
  const w = local.w ?? local.width ?? 0;
  const h = local.h ?? local.height ?? 0;
  const corners = [
    { x: local.x, y: local.y },
    { x: local.x + w, y: local.y },
    { x: local.x, y: local.y + h },
    { x: local.x + w, y: local.y + h },
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    const p = transformPointMat3(matrix, c.x, c.y);
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export {
  transformToMatrix,
  multiplyMat3,
  pointToSegmentDist,
  invertMat3,
  transformPointMat3,
  worldToLocalPoint,
  worldDeltaToLocalDelta,
  localBoundsToWorldAABB,
};
