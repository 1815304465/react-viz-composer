import type { Mat3 } from './constants/matrix';
import { IDENTITY_MAT3 } from './constants/matrix';
import type { ElementRecord, RectData, EllipseData, LineData, PathData, TextData, ImageData, PointsData } from '../types';
import { isDescendantOf } from './elements';
import { getPathBounds } from './pathBounds';
import { estimatePointsBounds } from './points';
import { localBoundsToWorldAABB, worldToLocalPoint } from './maths';

/** 元素轴对齐包围盒 */
interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 计算单个 drawable 元素（rect/ellipse/line/path/text/image）的局部包围盒
 * @param record 元素记录
 * @returns 包围盒，无法计算时返回 null
 */
function getElementBounds(record: ElementRecord): ElementBounds | null {
  switch (record.type) {
    case 'rect': {
      const d = record.data as RectData;
      return { x: d.x, y: d.y, width: Math.max(0, d.width), height: Math.max(0, d.height) };
    }
    case 'ellipse': {
      const d = record.data as EllipseData;
      return {
        x: d.cx - d.rx,
        y: d.cy - d.ry,
        width: d.rx * 2,
        height: d.ry * 2,
      };
    }
    case 'line': {
      const d = record.data as LineData;
      if (d.points.length === 0) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of d.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case 'path': {
      const d = record.data as PathData;
      return getPathBounds(d.d);
    }
    case 'points': {
      const d = record.data as PointsData;
      return estimatePointsBounds(d);
    }
    case 'text': {
      const d = record.data as TextData;
      const lines = d.text.split('\n');
      const fs = d.fontSize ?? 16;
      const lineHeight = d.lineHeight ?? fs * 1.2;
      const height = lines.length * lineHeight;
      const width = Math.max(...lines.map((line) => line.length * fs * 0.6), fs);
      let x = d.x;
      if (d.textAlign === 'middle') x -= width / 2;
      else if (d.textAlign === 'end') x -= width;
      let y = d.y;
      if (d.textBaseline === 'middle') y -= height / 2;
      else if (d.textBaseline === 'bottom') y -= height;
      return { x, y, width, height };
    }
    case 'image': {
      const d = record.data as ImageData;
      return { x: d.x, y: d.y, width: Math.max(0, d.width), height: Math.max(0, d.height) };
    }
    default:
      return null;
  }
}

/**
 * 合并两个轴对齐包围盒，取并集
 * @param a 包围盒 a
 * @param b 包围盒 b
 * @returns 合并后的包围盒
 */
function mergeBounds(a: ElementBounds, b: ElementBounds): ElementBounds {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * 估算节点的世界坐标包围盒（未经 matrix 变换的局部 bounds）
 * 返回 null 表示无法估算（group/animation/渐变/clipPath 等容器节点 / path 节点）
 * @param node 元素记录
 * @returns 局部包围盒，无法估算时返回 null
 */
function estimateLocalBounds(node: ElementRecord): { x: number; y: number; w: number; h: number } | null {
  const d = node.data as Record<string, unknown>;
  switch (node.type) {
    case 'rect':
      return { x: (d.x as number) ?? 0, y: (d.y as number) ?? 0, w: (d.width as number) ?? 0, h: (d.height as number) ?? 0 };
    case 'ellipse':
      return { x: ((d.cx as number) ?? 0) - ((d.rx as number) ?? 0), y: ((d.cy as number) ?? 0) - ((d.ry as number) ?? 0), w: ((d.rx as number) ?? 0) * 2, h: ((d.ry as number) ?? 0) * 2 };
    case 'text': {
      const fs = (d.fontSize as number) ?? 14;
      const txt = String(d.text ?? '');
      return { x: (d.x as number) ?? 0, y: ((d.y as number) ?? 0) - fs, w: txt.length * fs * 0.6, h: fs * 1.5 };
    }
    case 'image':
      return { x: (d.x as number) ?? 0, y: (d.y as number) ?? 0, w: (d.width as number) ?? 0, h: (d.height as number) ?? 0 };
    case 'line': {
      const pts = (d.points as Array<{ x: number; y: number }>) ?? [];
      if (pts.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case 'path': {
      const pathD = d.d as string;
      if (!pathD) return null;
      const pb = getPathBounds(pathD);
      if (!pb) return null;
      return { x: pb.x, y: pb.y, w: pb.width, h: pb.height };
    }
    case 'points': {
      const pb = estimatePointsBounds(node.data as PointsData);
      if (!pb) return null;
      return { x: pb.x, y: pb.y, w: pb.width, h: pb.height };
    }
    default:
      return null;
  }
}

/**
 * 检查局部包围盒经 worldMatrix 变换后是否与可见区域相交
 * 使用 corner-translate 方法：将局部 bounds 的 4 个角变换到世界坐标，
 * 然后检查变换后的 AABB 是否与可见区域相交
 * @param localBounds 局部包围盒
 * @param worldMatrix 世界矩阵
 * @param visible 可见区域
 * @returns 是否相交
 */
function boundsIntersectViewport(
  localBounds: { x: number; y: number; w: number; h: number },
  worldMatrix: Mat3,
  visible: { x: number; y: number; w: number; h: number },
): boolean {
  // 列主序：与 transformPointMat3 / 渲染一致
  const wb = localBoundsToWorldAABB(localBounds, worldMatrix);
  const maxX = wb.x + wb.width;
  const maxY = wb.y + wb.height;
  return !(
    maxX < visible.x ||
    wb.x > visible.x + visible.w ||
    maxY < visible.y ||
    wb.y > visible.y + visible.h
  );
}

/**
 * 计算 Group 子树下 drawable 子节点在 Group 局部坐标系中的合并包围盒
 * 将子孙 world AABB 逆变换到 group 局部后再合并
 * @param model 元素模型
 * @param groupId group 节点 id
 * @returns 合并包围盒，无 drawable 子节点时返回 null
 */
function getGroupBounds(model: { getElement(id: string): ElementRecord | undefined; getActiveElements(): ElementRecord[] }, groupId: string): ElementBounds | null {
  const group = model.getElement(groupId);
  if (!group) return null;
  const groupWm = group.worldMatrix as Mat3;
  let bounds: ElementBounds | null = null;

  for (const record of model.getActiveElements()) {
    if (record.id === groupId) continue;
    if (record.parentId !== groupId && !isDescendantOf(model, record, groupId)) continue;
    if (
      record.type === 'group'
      || record.type === 'animation'
      || record.type === 'clipPath'
      || record.type === 'filter'
      || record.type === 'mask'
      || record.type === 'linearGradient'
      || record.type === 'radialGradient'
    ) continue;

    const lbs = estimateLocalBounds(record);
    if (!lbs) continue;
    const world = localBoundsToWorldAABB(lbs, record.worldMatrix as Mat3);
    // 世界 AABB 四角 → group 局部，再取 AABB（保守）
    const corners = [
      { x: world.x, y: world.y },
      { x: world.x + world.width, y: world.y },
      { x: world.x, y: world.y + world.height },
      { x: world.x + world.width, y: world.y + world.height },
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const c of corners) {
      const inv = worldToLocalPoint(groupWm, c.x, c.y);
      if (inv.x < minX) minX = inv.x;
      if (inv.y < minY) minY = inv.y;
      if (inv.x > maxX) maxX = inv.x;
      if (inv.y > maxY) maxY = inv.y;
    }
    const b: ElementBounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    bounds = bounds ? mergeBounds(bounds, b) : b;
  }
  return bounds;
}

export {
  getElementBounds,
  mergeBounds,
  estimateLocalBounds,
  boundsIntersectViewport,
  getGroupBounds,
  IDENTITY_MAT3,
  type ElementBounds,
};
