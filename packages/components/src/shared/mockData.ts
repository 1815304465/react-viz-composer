/** 模拟数据：12 个图表各一份 */

import type { Point } from '@react-viz-composer/core';

/* ==================== 基础三件套 ==================== */

export const barData = [
  { month: '1月', value: 120 },
  { month: '2月', value: 200 },
  { month: '3月', value: 150 },
  { month: '4月', value: 80 },
  { month: '5月', value: 170 },
  { month: '6月', value: 240 },
];

export const lineData = [
  { name: '访问量', values: [120, 200, 150, 80, 70, 110, 130] },
  { name: '注册量', values: [80, 130, 90, 50, 40, 70, 90] },
  { name: '订单量', values: [40, 60, 50, 30, 20, 35, 45] },
];
export const lineCategories = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* 散点：3 个聚类 */
export interface ScatterPoint {
  x: number;
  y: number;
  group: number;
}
export const scatterData: ScatterPoint[] = (() => {
  const out: ScatterPoint[] = [];
  // cluster 1
  for (let i = 0; i < 18; i++) {
    out.push({ x: 30 + Math.random() * 20, y: 30 + Math.random() * 20, group: 0 });
  }
  // cluster 2
  for (let i = 0; i < 18; i++) {
    out.push({ x: 60 + Math.random() * 20, y: 60 + Math.random() * 20, group: 1 });
  }
  // cluster 3
  for (let i = 0; i < 14; i++) {
    out.push({ x: 40 + Math.random() * 30, y: 70 + Math.random() * 20, group: 2 });
  }
  return out;
})();

/* ==================== 进阶图表 ==================== */

export const areaData = [
  { name: '产品A', values: [120, 200, 150, 80, 70, 110, 130] },
  { name: '产品B', values: [80, 130, 90, 50, 40, 70, 90] },
];
export const areaCategories = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'];

export const pieData = [
  { name: '直接访问', value: 335 },
  { name: '搜索引擎', value: 310 },
  { name: '推荐链接', value: 234 },
  { name: '社交媒体', value: 135 },
];

export const radarData = {
  indicator: [
    { name: '销售', max: 100 },
    { name: '管理', max: 100 },
    { name: '技术', max: 100 },
    { name: '客服', max: 100 },
    { name: '研发', max: 100 },
  ],
  series: [
    { name: '预算分配', values: [80, 70, 90, 60, 85] },
    { name: '实际开销', values: [70, 65, 80, 55, 75] },
  ],
};

/* ==================== 业务向 ==================== */

/** K线 OHLC 数据：30 天 */
export interface KLineItem {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
}
export const klineData: KLineItem[] = (() => {
  const out: KLineItem[] = [];
  let prev = 100;
  for (let i = 0; i < 30; i++) {
    const open = prev;
    const close = open + (Math.random() - 0.5) * 8;
    const high = Math.max(open, close) + Math.random() * 4;
    const low = Math.min(open, close) - Math.random() * 4;
    out.push({
      date: `${i + 1}日`,
      open: +open.toFixed(2),
      close: +close.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
    });
    prev = close;
  }
  return out;
})();

/** 甘特图任务 */
export interface GanttTask {
  name: string;
  start: number; // 0-30
  duration: number;
  color?: string;
}
export const ganttData: GanttTask[] = [
  { name: '需求评审', start: 0, duration: 3, color: '#5B8FF9' },
  { name: 'UI 设计', start: 2, duration: 5, color: '#5AD8A6' },
  { name: '后端开发', start: 4, duration: 8, color: '#F6BD16' },
  { name: '前端开发', start: 5, duration: 9, color: '#E86452' },
  { name: '联调测试', start: 12, duration: 4, color: '#6DC8EC' },
  { name: '发布上线', start: 15, duration: 2, color: '#945FB9' },
];

/** 热力图：7 列 × 7 行（24h × 星期） */
export const heatmapCols = ['0时', '4时', '8时', '12时', '16时', '20时', '24时'];
export const heatmapRows = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const heatmapData: number[][] = (() => {
  const out: number[][] = [];
  for (let r = 0; r < 7; r++) {
    const row: number[] = [];
    for (let c = 0; c < 7; c++) {
      // 中心高，边缘低
      const dx = (c - 3) / 3;
      const dy = (r - 3) / 3;
      const v = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)) * 0.9 + Math.random() * 0.1;
      row.push(+v.toFixed(2));
    }
    out.push(row);
  }
  return out;
})();

/* ==================== 其他 ==================== */

export const funnelData = [
  { name: '访问', value: 1000 },
  { name: '咨询', value: 700 },
  { name: '订单', value: 400 },
  { name: '点击', value: 200 },
  { name: '购买', value: 80 },
];

/** 桑基节点 + 链接 */
export interface SankeyNode { name: string; depth: number; }
export interface SankeyLink { source: string; target: string; value: number; }
export const sankeyNodes: SankeyNode[] = [
  { name: '太阳能', depth: 0 },
  { name: '风能', depth: 0 },
  { name: '水电', depth: 0 },
  { name: '发电', depth: 1 },
  { name: '输电', depth: 2 },
  { name: '工业用电', depth: 3 },
  { name: '居民用电', depth: 3 },
];
export const sankeyLinks: SankeyLink[] = [
  { source: '太阳能', target: '发电', value: 30 },
  { source: '风能', target: '发电', value: 25 },
  { source: '水电', target: '发电', value: 35 },
  { source: '发电', target: '输电', value: 80 },
  { source: '输电', target: '工业用电', value: 50 },
  { source: '输电', target: '居民用电', value: 30 },
];

/** 树图（递归） */
export interface TreeNode {
  name: string;
  children?: TreeNode[];
}
export const treeData: TreeNode = {
  name: '根节点',
  children: [
    {
      name: '子节点 A',
      children: [
        { name: '叶子 A1' },
        { name: '叶子 A2' },
        { name: '叶子 A3' },
      ],
    },
    {
      name: '子节点 B',
      children: [
        { name: '叶子 B1' },
        { name: '叶子 B2' },
      ],
    },
    {
      name: '子节点 C',
      children: [
        {
          name: '子节点 C1',
          children: [{ name: '叶子 C1-1' }, { name: '叶子 C1-2' }],
        },
        { name: '叶子 C2' },
      ],
    },
  ],
};

/* ==================== 特色 / 复杂图表 ==================== */

/** 柱线混合：销量 + 增长率 */
export const comboData = [
  { month: '1月', sales: 320, rate: 12 },
  { month: '2月', sales: 280, rate: -8 },
  { month: '3月', sales: 410, rate: 18 },
  { month: '4月', sales: 360, rate: 5 },
  { month: '5月', sales: 480, rate: 22 },
  { month: '6月', sales: 520, rate: 15 },
];

export interface BubbleItem {
  name: string;
  x: number;
  y: number;
  size: number;
  group: number;
}

/** 气泡图：三维映射 x/y/大小 */
export const bubbleData: BubbleItem[] = [
  { name: '华北', x: 22, y: 68, size: 42, group: 0 },
  { name: '华东', x: 58, y: 72, size: 58, group: 0 },
  { name: '华南', x: 48, y: 38, size: 36, group: 1 },
  { name: '西南', x: 28, y: 32, size: 24, group: 1 },
  { name: '东北', x: 72, y: 55, size: 30, group: 2 },
  { name: '西北', x: 18, y: 48, size: 20, group: 2 },
  { name: '华中', x: 45, y: 55, size: 46, group: 0 },
  { name: '海外', x: 82, y: 28, size: 34, group: 3 },
];

/** 可探索散点：三簇 + 噪声，坐标范围 0~1000 */
export interface ExplorePoint {
  x: number;
  y: number;
  group: number;
}

export const exploreScatterData: ExplorePoint[] = (() => {
  const out: ExplorePoint[] = [];
  const clusters = [
    { cx: 220, cy: 280, n: 55, g: 0 },
    { cx: 520, cy: 320, n: 48, g: 1 },
    { cx: 380, cy: 620, n: 42, g: 2 },
    { cx: 720, cy: 180, n: 35, g: 3 },
  ];
  clusters.forEach(({ cx, cy, n, g }) => {
    for (let i = 0; i < n; i++) {
      out.push({
        x: cx + (Math.random() - 0.5) * 180,
        y: cy + (Math.random() - 0.5) * 140,
        group: g,
      });
    }
  });
  return out;
})();

/* ==================== 新增图表 ==================== */

/** 瀑布图 */
export const waterfallData = [
  { name: '初始', value: 300 },
  { name: '收入', value: 120 },
  { name: '成本', value: -80 },
  { name: '税费', value: -45 },
  { name: '利润', value: 60 },
  { name: '分红', value: -30 },
  { name: '结余', value: 325 },
];

/** 直方图 */
export interface HistogramBin {
  bin: string;
  count: number;
}
export const histogramData: HistogramBin[] = [
  { bin: '0-10', count: 5 },
  { bin: '10-20', count: 12 },
  { bin: '20-30', count: 24 },
  { bin: '30-40', count: 30 },
  { bin: '40-50', count: 22 },
  { bin: '50-60', count: 15 },
  { bin: '60-70', count: 8 },
  { bin: '70-80', count: 4 },
];

/** 箱线图 */
export interface BoxplotItem {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}
export const boxplotData: BoxplotItem[] = [
  { category: 'A组', min: 10, q1: 25, median: 42, q3: 58, max: 80 },
  { category: 'B组', min: 20, q1: 35, median: 50, q3: 65, max: 90 },
  { category: 'C组', min: 5, q1: 18, median: 30, q3: 48, max: 70 },
  { category: 'D组', min: 15, q1: 28, median: 45, q3: 60, max: 85 },
  { category: 'E组', min: 8, q1: 22, median: 38, q3: 52, max: 75 },
];

/** 玫瑰图 */
export interface RoseItem {
  name: string;
  value: number;
}
export const roseData: RoseItem[] = [
  { name: '星期一', value: 40 },
  { name: '星期二', value: 55 },
  { name: '星期三', value: 70 },
  { name: '星期四', value: 45 },
  { name: '星期五', value: 60 },
  { name: '星期六', value: 80 },
  { name: '星期日', value: 35 },
  { name: '平均值', value: 50 },
];

/** 矩形树图 */
export interface TreemapData {
  name: string;
  value: number;
  children?: TreemapData[];
}
export const treemapData: TreemapData = {
  name: '销售额',
  value: 1000,
  children: [
    {
      name: '华北',
      value: 350,
      children: [
        { name: '北京', value: 150 },
        { name: '天津', value: 80 },
        { name: '河北', value: 120 },
      ],
    },
    {
      name: '华东',
      value: 400,
      children: [
        { name: '上海', value: 180 },
        { name: '浙江', value: 130 },
        { name: '江苏', value: 90 },
      ],
    },
    {
      name: '华南',
      value: 250,
      children: [
        { name: '广东', value: 160 },
        { name: '福建', value: 90 },
      ],
    },
  ],
};

/** 误差柱状图 */
export interface ErrorBarItem {
  category: string;
  value: number;
  error: number;
}
export const errorBarData: ErrorBarItem[] = [
  { category: 'A', value: 45, error: 8 },
  { category: 'B', value: 62, error: 12 },
  { category: 'C', value: 38, error: 5 },
  { category: 'D', value: 70, error: 15 },
  { category: 'E', value: 55, error: 7 },
  { category: 'F', value: 48, error: 10 },
];

/** 仪表盘 */
export const gaugeBaseConfig = { min: 0, max: 100 };
export const gaugeValue = 72;

/** 日历热力图 */
export interface CalendarDay {
  date: string;
  value: number;
}

/** 时间线 */
export interface TimelineEvent {
  time: string;
  label: string;
  type?: string;
}
export const timelineData: TimelineEvent[] = [
  { time: '2024-01', label: '项目启动', type: 'milestone' },
  { time: '2024-03', label: '需求评审', type: 'review' },
  { time: '2024-05', label: '开发阶段', type: 'dev' },
  { time: '2024-08', label: '联调测试', type: 'test' },
  { time: '2024-10', label: '发布上线', type: 'release' },
  { time: '2024-12', label: '年终总结', type: 'milestone' },
];

/* ==================== 新增图表：平行坐标图 ==================== */

export const parallelCoordinatesData = {
  axes: ['销售额', '利润率', '增长率', '市场份额', '满意度'],
  data: [
    [85, 42, 18, 35, 88],
    [60, 55, 22, 28, 75],
    [72, 38, 12, 45, 80],
    [90, 60, 25, 50, 70],
    [50, 30, 8, 20, 65],
    [78, 48, 20, 40, 85],
  ],
};

/* ==================== 新增图表：弦图 ==================== */

export interface ChordNode {
  name: string;
  value: number;
}
export interface ChordLink {
  source: number;
  target: number;
  value: number;
}
export const chordData = {
  nodes: [
    { name: '北京', value: 28 },
    { name: '上海', value: 32 },
    { name: '广州', value: 20 },
    { name: '深圳', value: 18 },
    { name: '杭州', value: 14 },
  ] as ChordNode[],
  links: [
    { source: 0, target: 1, value: 12 },
    { source: 0, target: 2, value: 8 },
    { source: 1, target: 3, value: 10 },
    { source: 2, target: 3, value: 6 },
    { source: 1, target: 4, value: 5 },
    { source: 3, target: 4, value: 4 },
  ] as ChordLink[],
};

/* ==================== 新增图表：涟漪散点图 ==================== */

export const effectScatterData: ScatterPoint[] = (() => {
  const out: ScatterPoint[] = [];
  for (let i = 0; i < 15; i++) {
    out.push({ x: 20 + Math.random() * 15, y: 30 + Math.random() * 20, group: 0 });
  }
  for (let i = 0; i < 15; i++) {
    out.push({ x: 55 + Math.random() * 20, y: 60 + Math.random() * 20, group: 1 });
  }
  for (let i = 0; i < 12; i++) {
    out.push({ x: 35 + Math.random() * 25, y: 75 + Math.random() * 15, group: 2 });
  }
  return out;
})();

/* ==================== 新增图表：极坐标柱状图 ==================== */

export const polarBarData = [
  { name: '周一', value: 85 },
  { name: '周二', value: 60 },
  { name: '周三', value: 75 },
  { name: '周四', value: 45 },
  { name: '周五', value: 90 },
  { name: '周六', value: 55 },
  { name: '周日', value: 40 },
  { name: '平均', value: 64 },
];

/* ==================== 新增图表：环形布局关系图 ==================== */

export interface CircularGraphNode {
  id: string;
  label: string;
}
export interface CircularGraphEdge {
  source: string;
  target: string;
}
export const circularGraphData = {
  nodes: [
    { id: 'A', label: '服务器A' },
    { id: 'B', label: '服务器B' },
    { id: 'C', label: '数据库' },
    { id: 'D', label: '缓存' },
    { id: 'E', label: '网关' },
    { id: 'F', label: '前端' },
    { id: 'G', label: '消息队列' },
  ] as CircularGraphNode[],
  edges: [
    { source: 'F', target: 'E' },
    { source: 'E', target: 'A' },
    { source: 'E', target: 'B' },
    { source: 'A', target: 'C' },
    { source: 'B', target: 'C' },
    { source: 'A', target: 'D' },
    { source: 'B', target: 'D' },
    { source: 'A', target: 'G' },
    { source: 'B', target: 'G' },
  ] as CircularGraphEdge[],
};

/* ==================== 新增图表：旭日图 ==================== */

export interface SunburstData {
  name: string;
  value: number;
  children?: SunburstData[];
}
export const sunburstData: SunburstData = {
  name: '总销售',
  value: 1000,
  children: [
    {
      name: '华北', value: 350,
      children: [
        { name: '北京', value: 150 },
        { name: '天津', value: 80 },
        { name: '河北', value: 120 },
      ],
    },
    {
      name: '华东', value: 400,
      children: [
        { name: '上海', value: 180 },
        { name: '浙江', value: 130 },
        { name: '江苏', value: 90 },
      ],
    },
    {
      name: '华南', value: 250,
      children: [
        { name: '广东', value: 160 },
        { name: '福建', value: 90 },
      ],
    },
  ],
};

/* ==================== 新增图表：主题河流图 ==================== */

export interface ThemeRiverSeries {
  name: string;
  values: number[];
}
export const themeRiverCategories = ['1月', '2月', '3月', '4月', '5月', '6月', '7月'];
export const themeRiverData: ThemeRiverSeries[] = [
  { name: '产品A', values: [30, 50, 35, 45, 60, 40, 55] },
  { name: '产品B', values: [20, 30, 25, 40, 35, 30, 45] },
  { name: '产品C', values: [15, 25, 20, 30, 25, 20, 35] },
];

/* ==================== 新增图表：韦恩图 ==================== */

export interface VennSet {
  name: string;
  size: number;
  overlap: number[];
}
export const vennData: VennSet[] = [
  { name: '技术', size: 60, overlap: [12] },
  { name: '设计', size: 45, overlap: [12] },
];

/* ==================== 新增图表：词云图 ==================== */

export interface WordCloudItem {
  text: string;
  weight: number;
}
export const wordCloudData: WordCloudItem[] = [
  { text: 'React', weight: 100 },
  { text: 'TypeScript', weight: 92 },
  { text: 'Visualization', weight: 78 },
  { text: 'D3', weight: 65 },
  { text: 'Chart', weight: 60 },
  { text: 'Canvas', weight: 55 },
  { text: 'SVG', weight: 50 },
  { text: 'Animation', weight: 45 },
  { text: 'CSS', weight: 42 },
  { text: 'HTML', weight: 40 },
  { text: 'Vite', weight: 38 },
  { text: 'ESM', weight: 35 },
  { text: 'Node', weight: 32 },
  { text: 'API', weight: 30 },
  { text: 'UX', weight: 28 },
  { text: 'UI', weight: 26 },
  { text: 'WebGL', weight: 24 },
  { text: 'GPU', weight: 22 },
  { text: 'State', weight: 20 },
  { text: 'Props', weight: 18 },
  { text: 'Hooks', weight: 16 },
  { text: 'Redux', weight: 15 },
  { text: 'Router', weight: 14 },
  { text: 'Fetch', weight: 12 },
  { text: 'JSON', weight: 10 },
];

/* ==================== 新增图表：水球图 ==================== */

export interface LiquidFillData {
  value: number;
  max?: number;
}
export const liquidFillData: LiquidFillData = { value: 72, max: 100 };

/* ==================== 新增图表：力导向图 ==================== */

export interface NetworkNode {
  id: string;
  label?: string;
}
export interface NetworkEdge {
  source: string;
  target: string;
}
export const networkGraphData = {
  nodes: [
    { id: 'React', label: 'React' },
    { id: 'Vue', label: 'Vue' },
    { id: 'Angular', label: 'Angular' },
    { id: 'Svelte', label: 'Svelte' },
    { id: 'Solid', label: 'SolidJS' },
    { id: 'Preact', label: 'Preact' },
    { id: 'Lit', label: 'Lit' },
    { id: 'Qwik', label: 'Qwik' },
  ] as NetworkNode[],
  edges: [
    { source: 'React', target: 'Vue' },
    { source: 'React', target: 'Angular' },
    { source: 'React', target: 'Svelte' },
    { source: 'React', target: 'Preact' },
    { source: 'Vue', target: 'Angular' },
    { source: 'Vue', target: 'Solid' },
    { source: 'Angular', target: 'Svelte' },
    { source: 'Svelte', target: 'Solid' },
    { source: 'Solid', target: 'Preact' },
    { source: 'Preact', target: 'Qwik' },
    { source: 'Lit', target: 'Qwik' },
    { source: 'Lit', target: 'Svelte' },
  ] as NetworkEdge[],
};

/* ==================== 高级图表（batch 3） ==================== */

/** DensityCloudChart 散点数据 */
export interface DensityPoint {
  x: number;
  y: number;
}

export const densityCloudData: DensityPoint[] = (() => {
  const out: DensityPoint[] = [];
  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(-2 * Math.log(Math.max(1e-5, Math.random()))) * 15;
    out.push({ x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) });
  }
  return out;
})();

/** ContourChart 二维标量场数据 */
export const contourData: number[][] = (() => {
  const rows = 15;
  const cols = 15;
  const out: number[][] = [];
  for (let ri = 0; ri < rows; ri++) {
    const row: number[] = [];
    for (let ci = 0; ci < cols; ci++) {
      const cx1 = cols * 0.3;
      const cy1 = rows * 0.4;
      const cx2 = cols * 0.7;
      const cy2 = rows * 0.6;
      const d1 = Math.sqrt((ci - cx1) ** 2 + (ri - cy1) ** 2);
      const d2 = Math.sqrt((ci - cx2) ** 2 + (ri - cy2) ** 2);
      const v =
        Math.exp(-(d1 * d1) / 20) * 1.0 +
        Math.exp(-(d2 * d2) / 15) * 0.7 +
        Math.random() * 0.05;
      row.push(+v.toFixed(3));
    }
    out.push(row);
  }
  return out;
})();

export const contourRows: string[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15'];
export const contourCols: string[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14', 'C15'];

/** CurvatureCombChart 曲线数据 */
export interface CurvePoint {
  x: number;
  y: number;
}

export const curvatureCombData: CurvePoint[] = (() => {
  const points: CurvePoint[] = [];
  const n = 80;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = t * 100;
    const y =
      50 +
      25 * Math.sin(t * Math.PI * 3) +
      10 * Math.sin(t * Math.PI * 7) * Math.exp(-t * 3);
    points.push({ x, y });
  }
  return points;
})();

/* 工具：极坐标 → 直角坐标（用于饼图/雷达） */
export function polar(cx: number, cy: number, r: number, angleRad: number): Point {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

/* ==================== 新增 8 个图表 mock 数据 ==================== */

export const horizontalBarData = [
  { name: '北京', value: 120 },
  { name: '上海', value: 200 },
  { name: '广州', value: 150 },
  { name: '深圳', value: 80 },
  { name: '杭州', value: 170 },
  { name: '成都', value: 240 },
];

export const stackedBarData = [
  { name: '搜索引擎', values: [104, 56, 136, 86, 70] },
  { name: '直接访问', values: [42, 55, 26, 60, 48] },
  { name: '推荐来源', values: [51, 36, 45, 20, 38] },
];
export const stackedBarCategories = ['周一', '周二', '周三', '周四', '周五'];

export const stackedAreaData = [
  { name: '产品A', values: [120, 200, 150, 80, 70, 110, 130] },
  { name: '产品B', values: [80, 130, 90, 50, 40, 70, 90] },
  { name: '产品C', values: [40, 60, 50, 30, 20, 35, 45] },
];
export const stackedAreaCategories = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'];

export const stepLineData = [
  { name: '访问量', values: [120, 200, 150, 80, 70, 110, 130] },
  { name: '注册量', values: [80, 130, 90, 50, 40, 70, 90] },
  { name: '订单量', values: [40, 60, 50, 30, 20, 35, 45] },
];
export const stepLineCategories = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const smoothLineData = [
  { name: '访问量', values: [120, 200, 150, 80, 70, 110, 130] },
  { name: '注册量', values: [80, 130, 90, 50, 40, 70, 90] },
  { name: '订单量', values: [40, 60, 50, 30, 20, 35, 45] },
];
export const smoothLineCategories = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const doughnutData = [
  { name: '直接访问', value: 335 },
  { name: '搜索引擎', value: 310 },
  { name: '推荐链接', value: 234 },
  { name: '社交媒体', value: 135 },
];

export const singleAxisScatterData = [
  { value: 25, size: 20, group: 0 },
  { value: 40, size: 35, group: 1 },
  { value: 55, size: 15, group: 2 },
  { value: 30, size: 50, group: 3 },
  { value: 70, size: 25, group: 4 },
  { value: 45, size: 40, group: 0 },
  { value: 60, size: 30, group: 1 },
  { value: 20, size: 45, group: 2 },
  { value: 80, size: 18, group: 3 },
  { value: 50, size: 28, group: 4 },
  { value: 35, size: 22, group: 0 },
  { value: 65, size: 38, group: 1 },
  { value: 48, size: 32, group: 2 },
  { value: 72, size: 42, group: 3 },
  { value: 58, size: 16, group: 4 },
];

export const bidirectionalBarData = [
  { name: '18-25', positive: 45, negative: 38 },
  { name: '26-35', positive: 72, negative: 60 },
  { name: '36-45', positive: 55, negative: 48 },
  { name: '46-55', positive: 38, negative: 40 },
  { name: '56-65', positive: 25, negative: 30 },
  { name: '65+', positive: 15, negative: 22 },
];
