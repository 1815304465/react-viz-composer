/**
 * 实时模拟数据变换（纯函数）
 *
 * 用于 demo 压测：在保持结构稳定的前提下抖动数值，驱动 React → SceneTree → 渲染全链路更新。
 */

/** 在 [min, max] 内对数值施加振幅抖动 */
export function jitterNumber(value: number, amplitude: number, min = 0, max = Number.POSITIVE_INFINITY): number {
  const next = value + (Math.random() - 0.5) * 2 * amplitude;
  return Math.min(max, Math.max(min, next));
}

/** 抖动带 value 字段的条目列表 */
export function jitterValueItems<T extends { value: number }>(
  items: T[],
  amplitude = 18,
  min = 0,
): T[] {
  return items.map((item) => ({
    ...item,
    value: jitterNumber(item.value, amplitude, min),
  }));
}

/** 抖动多系列 { name, values } 数据 */
export function jitterSeries(
  series: { name: string; values: number[] }[],
  amplitude = 16,
): { name: string; values: number[] }[] {
  return series.map((s) => ({
    ...s,
    values: s.values.map((v) => jitterNumber(v, amplitude, 0)),
  }));
}

/**
 * 滚动窗口推进多系列：左移一格并追加新采样
 * @param series 多系列
 * @param amplitude 新点相对末值的抖动幅度
 */
export function scrollSeries(
  series: { name: string; values: number[] }[],
  amplitude = 20,
): { name: string; values: number[] }[] {
  return series.map((s) => {
    const last = s.values[s.values.length - 1] ?? 0;
    return {
      ...s,
      values: [...s.values.slice(1), jitterNumber(last, amplitude, 0)],
    };
  });
}

/** 抖动散点坐标 */
export function jitterScatterPoints<T extends { x: number; y: number }>(
  points: T[],
  amplitude = 2.5,
): T[] {
  return points.map((p) => ({
    ...p,
    x: jitterNumber(p.x, amplitude, -Infinity, Infinity),
    y: jitterNumber(p.y, amplitude, -Infinity, Infinity),
  }));
}

/** 抖动雷达 series.values */
export function jitterRadarData(data: {
  indicator: { name: string; max: number }[];
  series: { name: string; values: number[] }[];
}): typeof data {
  return {
    ...data,
    series: data.series.map((s) => ({
      ...s,
      values: s.values.map((v, i) => {
        const max = data.indicator[i]?.max ?? 100;
        return jitterNumber(v, 6, 10, max);
      }),
    })),
  };
}

/** 追加一根 K 线并丢弃最旧一根 */
export function advanceKline(
  items: { date: string; open: number; close: number; high: number; low: number }[],
): typeof items {
  if (items.length === 0) return items;
  const prev = items[items.length - 1];
  const open = prev.close;
  const close = jitterNumber(open, 4, 1);
  const high = Math.max(open, close) + Math.random() * 3;
  const low = Math.min(open, close) - Math.random() * 3;
  const dayMatch = /^(\d+)/.exec(prev.date);
  const day = dayMatch ? Number(dayMatch[1]) + 1 : items.length + 1;
  return [
    ...items.slice(1),
    {
      date: `${day}日`,
      open: +open.toFixed(2),
      close: +close.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
    },
  ];
}

/** 抖动热力矩阵 */
export function jitterHeatmap(matrix: number[][], amplitude = 0.08): number[][] {
  return matrix.map((row) =>
    row.map((v) => jitterNumber(v, amplitude, 0, 1)),
  );
}

/** 抖动柱线混合 */
export function jitterCombo(
  items: { month: string; sales: number; rate: number }[],
): typeof items {
  return items.map((d) => ({
    ...d,
    sales: jitterNumber(d.sales, 28, 50),
    rate: jitterNumber(d.rate, 4, -30, 40),
  }));
}

/** 抖动气泡 */
export function jitterBubbles(
  items: { name: string; x: number; y: number; size: number; group: number }[],
): typeof items {
  return items.map((d) => ({
    ...d,
    x: jitterNumber(d.x, 3, 0, 100),
    y: jitterNumber(d.y, 3, 0, 100),
    size: jitterNumber(d.size, 4, 8, 80),
  }));
}

/** 抖动直方图频次 */
export function jitterHistogram(
  items: { bin: string; count: number }[],
): typeof items {
  return items.map((d) => ({
    ...d,
    count: Math.round(jitterNumber(d.count, 3, 1)),
  }));
}

/** 抖动箱线五数概括（保持顺序） */
export function jitterBoxplot(
  items: {
    category: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  }[],
): typeof items {
  return items.map((d) => {
    const median = jitterNumber(d.median, 4, d.min + 1, d.max - 1);
    const q1 = jitterNumber(d.q1, 3, d.min, median);
    const q3 = jitterNumber(d.q3, 3, median, d.max);
    const min = jitterNumber(d.min, 2, 0, q1);
    const max = jitterNumber(d.max, 2, q3, d.max + 20);
    return { ...d, min, q1, median, q3, max };
  });
}

/** 抖动误差棒 */
export function jitterErrorBars(
  items: { category: string; value: number; error: number }[],
): typeof items {
  return items.map((d) => ({
    ...d,
    value: jitterNumber(d.value, 8, 5),
    error: jitterNumber(d.error, 1.5, 1, 20),
  }));
}

/** 在 [min, max] 内振荡标量（仪表盘 / 水球） */
export function oscillateScalar(value: number, min: number, max: number, step = 4): number {
  const next = value + (Math.random() - 0.45) * step;
  return Math.min(max, Math.max(min, next));
}

/** 抖动词云权重 */
export function jitterWordCloud(
  items: { text: string; weight: number }[],
): typeof items {
  return items.map((d) => ({
    ...d,
    weight: Math.round(jitterNumber(d.weight, 6, 5, 120)),
  }));
}

/** 抖动双向柱（positive / negative） */
export function jitterBidirectional(
  items: { name: string; positive: number; negative: number }[],
): typeof items {
  return items.map((d) => ({
    ...d,
    positive: jitterNumber(d.positive, 10, 5),
    negative: jitterNumber(d.negative, 10, 5),
  }));
}

/** 抖动单轴散点 */
export function jitterSingleAxis(
  items: { value: number; size: number; group: number }[],
): typeof items {
  return items.map((d) => ({
    ...d,
    value: jitterNumber(d.value, 4, 0, 100),
    size: jitterNumber(d.size, 2, 4, 30),
  }));
}

/** 抖动平行坐标行 */
export function jitterParallelRows(data: {
  axes: string[];
  data: number[][];
}): typeof data {
  return {
    ...data,
    data: data.data.map((row) =>
      row.map((v) => jitterNumber(v, v * 0.05 + 1, 0)),
    ),
  };
}

/** 抖动主题河流 */
export function jitterThemeRiver(
  series: { name: string; values: number[] }[],
): typeof series {
  return jitterSeries(series, 8);
}
