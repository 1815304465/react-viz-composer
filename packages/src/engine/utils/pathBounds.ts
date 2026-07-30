/** SVG 命名空间 URI */
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Path d 字符串 → 包围盒 LRU 缓存 */
const pathBoundsCache = new Map<string, { x: number; y: number; width: number; height: number }>();
const PATH_BOUNDS_CACHE_MAX = 512;

/**
 * 解析 SVG path d 字符串的轴对齐包围盒（带 LRU 缓存）
 * @param d SVG path 命令字符串
 */
function getPathBounds(d: string): { x: number; y: number; width: number; height: number } | null {
  const cached = pathBoundsCache.get(d);
  if (cached) {
    pathBoundsCache.delete(d);
    pathBoundsCache.set(d, cached);
    return cached;
  }

  if (typeof document === 'undefined') return null;

  try {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    const bbox = path.getBBox();
    const bounds = {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
    };
    pathBoundsCache.set(d, bounds);
    if (pathBoundsCache.size > PATH_BOUNDS_CACHE_MAX) {
      const oldest = pathBoundsCache.keys().next().value;
      if (oldest) pathBoundsCache.delete(oldest);
    }
    return bounds;
  } catch {
    return null;
  }
}

/** 清空 path 包围盒缓存 */
function clearPathBoundsCache(): void {
  pathBoundsCache.clear();
}

export { getPathBounds, clearPathBoundsCache };
