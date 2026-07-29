/**
 * forceLayout —— 简易力导向布局算法
 *
 * 在示例/用户层使用，对给定节点和边进行力模拟，返回带位置的节点数组。
 * 核心组件 NetworkGraphChart 本身不内置布局。
 */

export interface ForceNode {
  id: string;
  label?: string;
}

export interface ForceEdge {
  source: string;
  target: string;
}

interface SimNode {
  id: string;
  label?: string;
  x: number;
  y: number;
}

export interface ForceLayoutOptions {
  /** 绘图区中心 x */
  cx?: number;
  /** 绘图区中心 y */
  cy?: number;
  /** 边期望距离 */
  linkDistance?: number;
  /** 排斥力强度 */
  repulsion?: number;
  /** 迭代次数 */
  iterations?: number;
}

/**
 * 对节点做简易力导向布局，返回带像素坐标的节点副本
 * @param nodes 输入节点（无需坐标）
 * @param edges 边列表
 * @param options 布局参数
 * @returns 带 x/y 的节点数组
 */
export function forceLayout<T extends ForceNode>(
  nodes: T[],
  edges: ForceEdge[],
  options: ForceLayoutOptions = {},
): Array<T & { x: number; y: number }> {
  const {
    cx = 300,
    cy = 200,
    linkDistance = 100,
    repulsion = 300,
    iterations = 300,
  } = options;

  // 初始化位置：中心 + 随机偏移
  const simNodes: SimNode[] = nodes.map((n) => ({
    id: n.id,
    label: n.label,
    x: cx + (Math.random() - 0.5) * 50,
    y: cy + (Math.random() - 0.5) * 50,
  }));

  const simLinks = edges
    .map((e) => {
      const src = simNodes.find((sn) => sn.id === e.source);
      const tgt = simNodes.find((sn) => sn.id === e.target);
      if (!src || !tgt) return null;
      return { source: src, target: tgt };
    })
    .filter(Boolean) as { source: SimNode; target: SimNode }[];

  const alphaDecay = 0.98;
  let alpha = 1;

  for (let iter = 0; iter < iterations && alpha > 0.001; iter++) {
    alpha *= alphaDecay;

    // 排斥力
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i];
        const b = simNodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (repulsion * alpha) / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        a.x -= dx;
        a.y -= dy;
        b.x += dx;
        b.y += dy;
      }
    }

    // 边拉力
    for (const link of simLinks) {
      const a = link.source;
      const b = link.target;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - linkDistance) * alpha * 0.5;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      a.x += dx;
      a.y += dy;
      b.x -= dx;
      b.y -= dy;
    }

    // 中心引力
    for (const n of simNodes) {
      n.x += (cx - n.x) * 0.01 * alpha;
      n.y += (cy - n.y) * 0.01 * alpha;
    }
  }

  // 回写位置
  return nodes.map((n) => {
    const sim = simNodes.find((sn) => sn.id === n.id);
    return {
      ...n,
      x: sim?.x ?? cx,
      y: sim?.y ?? cy,
    };
  });
}
