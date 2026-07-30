/**
 * LRU Path2D 缓存
 * 避免每次重画 Path 时重复解析 d 字符串创建 Path2D 对象
 */
class Path2DCache {
  private map = new Map<string, Path2D>();
  private maxSize: number;

  constructor(maxSize = 512) {
    this.maxSize = maxSize;
  }

  /** 获取或创建缓存的 Path2D 对象，命中时将其移到 LRU 尾部 */
  get(d: string): Path2D | null {
    const cached = this.map.get(d);
    if (cached) {
      this.map.delete(d);
      this.map.set(d, cached);
      return cached;
    }
    try {
      const path = new Path2D(d);
      this.map.set(d, path);
      if (this.map.size > this.maxSize) {
        const oldest = this.map.keys().next().value;
        if (oldest) this.map.delete(oldest);
      }
      return path;
    } catch {
      return null;
    }
  }

  clear(): void {
    this.map.clear();
  }
}

export { Path2DCache };
