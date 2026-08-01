import type { ElementRecord } from '../types';
import type { Mat3 } from './constants/matrix';
import { estimateLocalBounds, boundsIntersectViewport } from './bounds';
import { localBoundsToWorldAABB } from './maths';

/** 空间网格单元 */
interface SpatialCell {
  records: ElementRecord[];
}

/**
 * 均匀网格空间索引 —— 用于 Canvas 命中检测加速
 * 将元素按 world AABB 插入固定大小网格
 */
class SpatialIndex {
  private cellSize: number;
  private cells = new Map<string, SpatialCell>();
  private records: ElementRecord[] = [];

  /**
   * @param cellSize 网格单元边长（世界坐标）
   */
  constructor(cellSize = 64) {
    this.cellSize = cellSize;
  }

  /** 清空索引 */
  clear(): void {
    this.cells.clear();
    this.records = [];
  }

  /**
   * 用元素列表重建索引（仅包含视口内且可命中的叶子）
   * @param elements 元素列表
   * @param model 数据模型
   * @param visible 可视区域，null 表示不过滤
   */
  rebuild(
    elements: ElementRecord[],
    visible: { x: number; y: number; w: number; h: number } | null,
  ): void {
    this.clear();
    for (const record of elements) {
      if (record.removed) continue;
      const lbs = estimateLocalBounds(record);
      if (!lbs) continue;
      if (visible && !boundsIntersectViewport(lbs, record.worldMatrix, visible)) continue;

      this.records.push(record);
      const wb = this.toWorldBounds(
        { x: lbs.x, y: lbs.y, width: lbs.w, height: lbs.h },
        record.worldMatrix,
      );
      for (const key of this.cellKeysForBounds(wb)) {
        let cell = this.cells.get(key);
        if (!cell) {
          cell = { records: [] };
          this.cells.set(key, cell);
        }
        cell.records.push(record);
      }
    }
  }

  /**
   * 查询世界坐标点处可能命中的元素（逆序去重）
   * @param worldX 世界 x
   * @param worldY 世界 y
   */
  query(worldX: number, worldY: number): ElementRecord[] {
    const key = this.cellKey(worldX, worldY);
    const cell = this.cells.get(key);
    if (!cell) return [];

    const seen = new Set<string>();
    const out: ElementRecord[] = [];
    for (let i = cell.records.length - 1; i >= 0; i--) {
      const record = cell.records[i];
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      out.push(record);
    }
    return out;
  }

  /** 将局部包围盒变换到世界坐标（四角，兼容旋转） */
  private toWorldBounds(
    lbs: { x: number; y: number; width: number; height: number },
    matrix: Mat3,
  ): { x: number; y: number; width: number; height: number } {
    return localBoundsToWorldAABB(lbs, matrix);
  }

  private cellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  private cellKeysForBounds(b: { x: number; y: number; width: number; height: number }): string[] {
    const x0 = Math.floor(b.x / this.cellSize);
    const y0 = Math.floor(b.y / this.cellSize);
    const x1 = Math.floor((b.x + b.width) / this.cellSize);
    const y1 = Math.floor((b.y + b.height) / this.cellSize);
    const keys: string[] = [];
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        keys.push(`${cx},${cy}`);
      }
    }
    return keys;
  }
}

export { SpatialIndex };
