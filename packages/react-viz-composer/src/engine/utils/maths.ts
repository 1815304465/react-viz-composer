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

export { transformToMatrix, multiplyMat3, pointToSegmentDist };
