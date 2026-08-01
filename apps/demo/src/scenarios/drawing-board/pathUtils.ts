/**
 * 将点列转为 SVG path d
 * @param points 路径点
 */
export function pointsToPathD(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (const p of rest) {
    d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d;
}

/**
 * 从拖拽矩形生成规范化 rect 参数
 * @param x0 起点 x
 * @param y0 起点 y
 * @param x1 终点 x
 * @param y1 终点 y
 */
export function normalizeRect(x0: number, y0: number, x1: number, y1: number) {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const width = Math.abs(x1 - x0);
  const height = Math.abs(y1 - y0);
  return { x, y, width, height };
}

/**
 * 从拖拽生成椭圆参数（以包围盒为准）
 * @param x0 起点 x
 * @param y0 起点 y
 * @param x1 终点 x
 * @param y1 终点 y
 */
export function normalizeEllipse(x0: number, y0: number, x1: number, y1: number) {
  const { x, y, width, height } = normalizeRect(x0, y0, x1, y1);
  return {
    cx: x + width / 2,
    cy: y + height / 2,
    rx: width / 2,
    ry: height / 2,
  };
}
