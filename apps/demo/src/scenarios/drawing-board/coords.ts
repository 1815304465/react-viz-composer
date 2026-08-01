import type { Viewport } from 'react-viz-composer';

/**
 * 屏幕坐标 → 世界坐标
 * @param screenX 容器内 x
 * @param screenY 容器内 y
 * @param viewport 视口
 */
export function screenToWorld(screenX: number, screenY: number, viewport: Viewport) {
  return {
    x: screenX / viewport.scale - viewport.x,
    y: screenY / viewport.scale - viewport.y,
  };
}

/**
 * 世界坐标 → 屏幕坐标
 * @param worldX 世界 x
 * @param worldY 世界 y
 * @param viewport 视口
 */
export function worldToScreen(worldX: number, worldY: number, viewport: Viewport) {
  return {
    x: (worldX + viewport.x) * viewport.scale,
    y: (worldY + viewport.y) * viewport.scale,
  };
}

/** 对齐到网格 */
export function snapToGrid(v: number, gridSize: number): number {
  return Math.round(v / gridSize) * gridSize;
}

/** 计算当前视口可见的世界范围 */
export function getVisibleWorldBounds(
  canvasW: number,
  canvasH: number,
  viewport: Viewport,
) {
  const left = -viewport.x;
  const top = -viewport.y;
  const right = canvasW / viewport.scale - viewport.x;
  const bottom = canvasH / viewport.scale - viewport.y;
  return { left, top, right, bottom };
}

/**
 * 根据缩放计算「约 targetPx 屏幕像素」对应的整齐网格步长
 * @param scale 视口缩放
 * @param targetPx 目标屏幕间距
 */
export function getAdaptiveGridStep(scale: number, targetPx = 48): number {
  const safeScale = Math.max(scale, 0.01);
  const raw = targetPx / safeScale;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-6)));
  const residual = raw / magnitude;
  if (residual <= 1) return magnitude;
  if (residual <= 2) return 2 * magnitude;
  if (residual <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

/**
 * 生成网格线 path d（单 Path 降低 SceneTree 节点数）
 */
export function buildGridPathD(
  bounds: { left: number; top: number; right: number; bottom: number },
  step: number,
): string {
  const pad = step * 2;
  const left = Math.floor((bounds.left - pad) / step) * step;
  const right = Math.ceil((bounds.right + pad) / step) * step;
  const top = Math.floor((bounds.top - pad) / step) * step;
  const bottom = Math.ceil((bounds.bottom + pad) / step) * step;
  const parts: string[] = [];
  for (let x = left; x <= right; x += step) {
    if (Math.abs(x) < 1e-9) continue;
    parts.push(`M ${x} ${top} L ${x} ${bottom}`);
  }
  for (let y = top; y <= bottom; y += step) {
    if (Math.abs(y) < 1e-9) continue;
    parts.push(`M ${left} ${y} L ${right} ${y}`);
  }
  return parts.join(' ');
}
