/**
 * scales.ts —— 数据 → 像素映射
 *
 * 极简实现，无 d3 依赖
 */

/** 线性映射：domain [d0, d1] → range [r0, r1] */
export interface LinearScale {
  (v: number): number;
  /** 反向：像素 → 数据值 */
  invert: (px: number) => number;
  ticks: (count?: number) => number[];
}

export function scaleLinear(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const dSpan = d1 - d0 || 1;
  const rSpan = r1 - r0;

  const fn = ((v: number) => r0 + ((v - d0) / dSpan) * rSpan) as LinearScale;
  fn.invert = (px: number) => d0 + ((px - r0) / rSpan) * dSpan;
  fn.ticks = (count = 5) => {
    const step = niceStep((d1 - d0) / count);
    const start = Math.ceil(d0 / step) * step;
    const out: number[] = [];
    for (let v = start; v <= d1 + 1e-9; v += step) {
      out.push(Number(v.toFixed(10)));
    }
    return out;
  };
  return fn;
}

/** 离散 band 映射：domain 数组 → range [r0, r1] 内的等宽区间 */
export interface BandScale {
  (v: string | number): number;
  bandwidth: number;
  domain: (string | number)[];
  step: number;
}

export function scaleBand(
  domain: (string | number)[],
  range: [number, number],
  padding = 0.2,
): BandScale {
  const [r0, r1] = range;
  const n = domain.length;
  const totalSpan = r1 - r0;
  const step = totalSpan / (n + padding * (n - 1) + padding * 2);
  const bandwidth = step * (1 - padding);

  const map = new Map<string | number, number>();
  domain.forEach((d, i) => {
    map.set(d, r0 + padding * step + i * (step));
  });

  const fn = ((v: string | number) => map.get(v) ?? r0) as BandScale;
  fn.bandwidth = bandwidth;
  fn.domain = domain;
  fn.step = step;
  return fn;
}

/** niceStep —— 取 "整齐" 的刻度间隔（0.1 / 0.5 / 1 / 2 / 5 / 10 ...） */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = raw / Math.pow(10, exp);
  let nice: number;
  if (base < 1.5) nice = 1;
  else if (base < 3) nice = 2;
  else if (base < 7) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}
