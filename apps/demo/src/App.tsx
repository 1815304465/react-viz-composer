/**
 * App —— ReactVizComposer 官网
 *
 * 路由：
 *   /           首页 —— 哲学、特性、快速上手
 *   /docs       文档 —— 完整的 API 文档和使用指南
 *   /examples   示例 —— 47 种参考图表画廊
 *   /scenarios  场景 —— 网络拓扑、工业HMI、实时大屏、粒子系统、智慧园区、知识图谱
 *
 * 顶部 Header 统一风格，全局搜索始终可见。
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Input, Popover, Anchor, Segmented, Tooltip, Empty, Spin } from 'antd';
import type { AnchorProps, InputRef } from 'antd';
import {
  HomeOutlined,
  BookOutlined,
  AppstoreOutlined,
  CompassOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  PauseCircleOutlined,
  FileTextOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { debounce } from 'lodash-es';
import { ViewportRender } from './components/ViewportRender';
import { LiveDataProvider, useLiveMode } from './live';
import { HomePage } from './pages/HomePage';
import { DocsPage } from './pages/DocsPage';
import {
  BarChartDemo,
  LineChartDemo,
  ScatterChartDemo,
  AreaChartDemo,
  PieChartDemo,
  RadarChartDemo,
  CandlestickChartDemo,
  GanttChartDemo,
  HeatmapChartDemo,
  FunnelChartDemo,
  SankeyChartDemo,
  TreeChartDemo,
  ComboChartDemo,
  BubbleChartDemo,
  ExplorableScatterDemo,
  WaterfallChartDemo,
  HistogramChartDemo,
  BoxplotChartDemo,
  RoseChartDemo,
  TreemapChartDemo,
  ErrorBarChartDemo,
  GaugeChartDemo,
  CalendarHeatmapChartDemo,
  TimelineChartDemo,
  ParallelCoordinatesChartDemo,
  ChordChartDemo,
  EffectScatterChartDemo,
  PolarBarChartDemo,
  CircularGraphChartDemo,
  SunburstChartDemo,
  ThemeRiverChartDemo,
  VennChartDemo,
  WordCloudChartDemo,
  LiquidFillChartDemo,
  NetworkGraphChartDemo,
  PictorialBarChartDemo,
  DensityCloudChartDemo,
  ContourChartDemo,
  CurvatureCombChartDemo,
  HorizontalBarChartDemo,
  StackedBarChartDemo,
  StackedAreaChartDemo,
  StepLineChartDemo,
  SmoothLineChartDemo,
  DoughnutChartDemo,
  SingleAxisScatterChartDemo,
  BidirectionalBarChartDemo,
  PercentStackedBarChartDemo,
  PercentStackedAreaChartDemo,
  RangeAreaChartDemo,
  NestedPieChartDemo,
  DualAxisChartDemo,
  LollipopChartDemo,
  DumbbellChartDemo,
  SlopeChartDemo,
  BulletChartDemo,
  PopulationPyramidChartDemo,
  ParetoChartDemo,
  ViolinChartDemo,
  RidgelineChartDemo,
  HexbinChartDemo,
  WaffleChartDemo,
  ProgressRingChartDemo,
  IcicleChartDemo,
  CirclePackingChartDemo,
  ArcDiagramChartDemo,
  DendrogramChartDemo,
  RadialTreeChartDemo,
  AdjacencyMatrixChartDemo,
  FlightLinesChartDemo,
} from './components/ChartDemos';
import {
  NetworkTopology,
  IndustrialHMI,
  RealtimeDashboard,
  ParticleFlow,
  SmartCampus,
  KnowledgeGraph,
} from './scenarios';

const { Header, Content } = Layout;

/* ==================== 类型 ==================== */

type PageKey = 'home' | 'docs' | 'examples' | 'scenarios';

interface PageTab {
  key: PageKey;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const TABS: PageTab[] = [
  { key: 'home', label: '首页', icon: <HomeOutlined />, path: '/' },
  { key: 'docs', label: '文档', icon: <BookOutlined />, path: '/docs' },
  { key: 'examples', label: '示例', icon: <AppstoreOutlined />, path: '/examples' },
  { key: 'scenarios', label: '场景', icon: <CompassOutlined />, path: '/scenarios' },
];

function getActiveKey(pathname: string): PageKey {
  if (pathname.startsWith('/docs')) return 'docs';
  if (pathname.startsWith('/examples')) return 'examples';
  if (pathname.startsWith('/scenarios')) return 'scenarios';
  return 'home';
}

/* ==================== 常量 ==================== */

const ANCHOR_WIDTH = 180;
const CARD_SIZE = 300;
const GRID_GAP = 20;
const CARD_TITLE_HEIGHT = 44;

/* ==================== 图表分类定义 ==================== */

interface ChartEntry {
  id: string;
  name: string;
  keywords: string[];
  demo: React.ReactNode;
}

interface ChartCategory {
  key: string;
  title: string;
  children: ChartEntry[];
}

const CATEGORIES: ChartCategory[] = [
  {
    key: 'bar',
    title: '柱状图',
    children: [
      { id: 'bar', name: '基础柱状图', keywords: ['bar', '柱状图', '基础'], demo: <BarChartDemo /> },
      { id: 'horizontal-bar', name: '横向柱状图', keywords: ['horizontal', '横向', '柱状图'], demo: <HorizontalBarChartDemo /> },
      { id: 'stacked-bar', name: '堆叠柱状图', keywords: ['stacked', '堆叠', '柱状图'], demo: <StackedBarChartDemo /> },
      { id: 'bidirectional-bar', name: '双向柱状图', keywords: ['bidirectional', '双向', '柱状图'], demo: <BidirectionalBarChartDemo /> },
      { id: 'polar-bar', name: '极坐标柱状图', keywords: ['polar', '极坐标', '柱状图'], demo: <PolarBarChartDemo /> },
      { id: 'pictorial-bar', name: '象形柱图', keywords: ['pictorial', '象形', '柱状图'], demo: <PictorialBarChartDemo /> },
      { id: 'waterfall', name: '瀑布图', keywords: ['waterfall', '瀑布'], demo: <WaterfallChartDemo /> },
      { id: 'histogram', name: '直方图', keywords: ['histogram', '直方图'], demo: <HistogramChartDemo /> },
      { id: 'percent-stacked-bar', name: '百分比堆叠柱', keywords: ['percent', '百分比', '堆叠', '柱'], demo: <PercentStackedBarChartDemo /> },
      { id: 'lollipop', name: '棒棒糖图', keywords: ['lollipop', '棒棒糖'], demo: <LollipopChartDemo /> },
      { id: 'dumbbell', name: '哑铃图', keywords: ['dumbbell', '哑铃'], demo: <DumbbellChartDemo /> },
      { id: 'bullet', name: '子弹图', keywords: ['bullet', '子弹'], demo: <BulletChartDemo /> },
      { id: 'population-pyramid', name: '人口金字塔', keywords: ['pyramid', '人口', '金字塔'], demo: <PopulationPyramidChartDemo /> },
      { id: 'pareto', name: '帕累托图', keywords: ['pareto', '帕累托'], demo: <ParetoChartDemo /> },
    ],
  },
  {
    key: 'line',
    title: '折线图',
    children: [
      { id: 'line', name: '基础折线图', keywords: ['line', '折线图', '基础'], demo: <LineChartDemo /> },
      { id: 'smooth-line', name: '平滑曲线图', keywords: ['smooth', '平滑', '曲线', '折线图'], demo: <SmoothLineChartDemo /> },
      { id: 'step-line', name: '阶梯线图', keywords: ['step', '阶梯', '折线图'], demo: <StepLineChartDemo /> },
      { id: 'area', name: '面积图', keywords: ['area', '面积'], demo: <AreaChartDemo /> },
      { id: 'stacked-area', name: '堆叠面积图', keywords: ['stacked', '堆叠', '面积'], demo: <StackedAreaChartDemo /> },
      { id: 'percent-stacked-area', name: '百分比堆叠面积', keywords: ['percent', '百分比', '堆叠', '面积'], demo: <PercentStackedAreaChartDemo /> },
      { id: 'range-area', name: '区间面积图', keywords: ['range', '区间', '面积', '置信带'], demo: <RangeAreaChartDemo /> },
      { id: 'theme-river', name: '主题河流', keywords: ['theme', 'river', '主题河流', '河流'], demo: <ThemeRiverChartDemo /> },
      { id: 'ridgeline', name: '山脊图', keywords: ['ridgeline', 'joy', '山脊', '波浪'], demo: <RidgelineChartDemo /> },
      { id: 'slope', name: '斜率图', keywords: ['slope', '斜率'], demo: <SlopeChartDemo /> },
    ],
  },
  {
    key: 'pie',
    title: '饼图',
    children: [
      { id: 'pie', name: '基础饼图', keywords: ['pie', '饼图', '基础'], demo: <PieChartDemo /> },
      { id: 'doughnut', name: '环形图', keywords: ['doughnut', 'donut', '环形', '甜甜圈'], demo: <DoughnutChartDemo /> },
      { id: 'nested-pie', name: '嵌套饼图', keywords: ['nested', '嵌套', '饼图'], demo: <NestedPieChartDemo /> },
      { id: 'rose', name: '玫瑰图', keywords: ['rose', '玫瑰', '南丁格尔'], demo: <RoseChartDemo /> },
      { id: 'sunburst', name: '旭日图', keywords: ['sunburst', '旭日', '层级'], demo: <SunburstChartDemo /> },
      { id: 'treemap', name: '矩形树图', keywords: ['treemap', '矩形树', '层级'], demo: <TreemapChartDemo /> },
      { id: 'icicle', name: '冰柱图', keywords: ['icicle', '冰柱'], demo: <IcicleChartDemo /> },
      { id: 'circle-packing', name: '圆堆积', keywords: ['circle', 'packing', '圆堆积'], demo: <CirclePackingChartDemo /> },
      { id: 'waffle', name: '华夫图', keywords: ['waffle', '华夫'], demo: <WaffleChartDemo /> },
      { id: 'funnel', name: '漏斗图', keywords: ['funnel', '漏斗'], demo: <FunnelChartDemo /> },
    ],
  },
  {
    key: 'scatter',
    title: '散点图',
    children: [
      { id: 'scatter', name: '基础散点图', keywords: ['scatter', '散点', '基础'], demo: <ScatterChartDemo /> },
      { id: 'effect-scatter', name: '涟漪散点', keywords: ['effect', '涟漪', '散点', '动画'], demo: <EffectScatterChartDemo /> },
      { id: 'bubble', name: '气泡图', keywords: ['bubble', '气泡', '散点'], demo: <BubbleChartDemo /> },
      { id: 'single-axis-scatter', name: '单轴散点', keywords: ['single', 'axis', '单轴', '散点'], demo: <SingleAxisScatterChartDemo /> },
      { id: 'explore', name: '可探索散点', keywords: ['explore', '探索', '交互', '散点'], demo: <ExplorableScatterDemo /> },
      { id: 'density-cloud', name: '云图', keywords: ['density', 'cloud', '密度', '云图'], demo: <DensityCloudChartDemo /> },
      { id: 'contour', name: '等值线图', keywords: ['contour', '等值线', '等高线'], demo: <ContourChartDemo /> },
      { id: 'hexbin', name: '蜂窝热力', keywords: ['hexbin', '蜂窝', '六边形'], demo: <HexbinChartDemo /> },
    ],
  },
  {
    key: 'radar',
    title: '雷达图',
    children: [
      { id: 'radar', name: '基础雷达图', keywords: ['radar', '雷达', '蜘蛛网'], demo: <RadarChartDemo /> },
    ],
  },
  {
    key: 'gauge',
    title: '仪表盘',
    children: [
      { id: 'gauge', name: '仪表盘', keywords: ['gauge', '仪表', '表盘'], demo: <GaugeChartDemo /> },
      { id: 'liquid-fill', name: '水球图', keywords: ['liquid', 'fill', '水球', '水位'], demo: <LiquidFillChartDemo /> },
      { id: 'progress-ring', name: '环形进度', keywords: ['progress', 'ring', '环形', '进度'], demo: <ProgressRingChartDemo /> },
    ],
  },
  {
    key: 'heatmap',
    title: '热力图',
    children: [
      { id: 'heatmap', name: '基础热力图', keywords: ['heatmap', '热力', '热图'], demo: <HeatmapChartDemo /> },
      { id: 'calendar-heatmap', name: '日历热力图', keywords: ['calendar', '日历', '热力', 'github'], demo: <CalendarHeatmapChartDemo /> },
      { id: 'adjacency-matrix', name: '邻接矩阵', keywords: ['adjacency', 'matrix', '邻接', '矩阵'], demo: <AdjacencyMatrixChartDemo /> },
    ],
  },
  {
    key: 'candlestick',
    title: 'K线图',
    children: [
      { id: 'candlestick', name: '基础K线图', keywords: ['candlestick', 'k线', '蜡烛图', '股票'], demo: <CandlestickChartDemo /> },
    ],
  },
  {
    key: 'graph',
    title: '关系图',
    children: [
      { id: 'network', name: '力导向图', keywords: ['network', 'graph', '力导向', '网络'], demo: <NetworkGraphChartDemo /> },
      { id: 'sankey', name: '桑基图', keywords: ['sankey', '桑基', '流向'], demo: <SankeyChartDemo /> },
      { id: 'chord', name: '弦图', keywords: ['chord', '弦图', '和弦'], demo: <ChordChartDemo /> },
      { id: 'circular-graph', name: '环形关系图', keywords: ['circular', 'graph', '环形', '关系'], demo: <CircularGraphChartDemo /> },
      { id: 'tree', name: '树图', keywords: ['tree', '树', '层级', '思维导图'], demo: <TreeChartDemo /> },
      { id: 'dendrogram', name: '树状图', keywords: ['dendrogram', '树状'], demo: <DendrogramChartDemo /> },
      { id: 'radial-tree', name: '径向树', keywords: ['radial', 'tree', '径向', '树'], demo: <RadialTreeChartDemo /> },
      { id: 'arc-diagram', name: '弧线图', keywords: ['arc', 'diagram', '弧线'], demo: <ArcDiagramChartDemo /> },
      { id: 'flight-lines', name: '飞线图', keywords: ['flight', 'lines', '飞线', '迁徙'], demo: <FlightLinesChartDemo /> },
      { id: 'venn', name: '韦恩图', keywords: ['venn', '韦恩', '集合', '交集'], demo: <VennChartDemo /> },
    ],
  },
  {
    key: 'other',
    title: '其他',
    children: [
      { id: 'boxplot', name: '箱线图', keywords: ['boxplot', '箱线', '箱型', '统计'], demo: <BoxplotChartDemo /> },
      { id: 'violin', name: '小提琴图', keywords: ['violin', '小提琴', '统计'], demo: <ViolinChartDemo /> },
      { id: 'errorbar', name: '误差棒', keywords: ['errorbar', '误差', '棒', '统计'], demo: <ErrorBarChartDemo /> },
      { id: 'gantt', name: '甘特图', keywords: ['gantt', '甘特', '进度', '项目'], demo: <GanttChartDemo /> },
      { id: 'timeline', name: '时间线', keywords: ['timeline', '时间线', '时间轴'], demo: <TimelineChartDemo /> },
      { id: 'parallel', name: '平行坐标', keywords: ['parallel', '平行坐标', '多维'], demo: <ParallelCoordinatesChartDemo /> },
      { id: 'wordcloud', name: '词云图', keywords: ['wordcloud', '词云', '文字云'], demo: <WordCloudChartDemo /> },
      { id: 'combo', name: '柱线混合', keywords: ['combo', '混合', '组合'], demo: <ComboChartDemo /> },
      { id: 'dual-axis', name: '双 Y 轴', keywords: ['dual', 'axis', '双轴'], demo: <DualAxisChartDemo /> },
      { id: 'curvature-comb', name: '曲率梳图', keywords: ['curvature', 'comb', '曲率', '梳'], demo: <CurvatureCombChartDemo /> },
    ],
  },
];

const ALL_ENTRIES: (ChartEntry & { categoryKey: string })[] = CATEGORIES.flatMap((cat) =>
  cat.children.map((entry) => ({ ...entry, categoryKey: cat.key })),
);

/* ==================== 图表卡片 ==================== */

function ChartCard({ entry }: { entry: ChartEntry }) {
  return (
    <div id={`chart-${entry.id}`} style={{ scrollMarginTop: 72 }}>
      <div
        style={{
          width: CARD_SIZE,
          height: CARD_SIZE,
          borderRadius: 8,
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'box-shadow 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
      >
        <div
          style={{
            width: CARD_SIZE,
            height: CARD_SIZE - CARD_TITLE_HEIGHT,
            background: '#fff',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <ViewportRender minHeight={CARD_SIZE - CARD_TITLE_HEIGHT}>
            <div style={{ width: '100%', height: CARD_SIZE - CARD_TITLE_HEIGHT }}>
              {entry.demo}
            </div>
          </ViewportRender>
        </div>
        <div style={{ flexShrink: 0, padding: '10px 12px', borderTop: '1px solid #f0f0f0', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#262626' }}>
          {entry.name}
        </div>
      </div>
    </div>
  );
}

/* ==================== 锚点 ==================== */

function buildAnchorItems(categories: ChartCategory[]): AnchorProps['items'] {
  return categories.map((g) => {
    const children: AnchorProps['items'] = g.children.map((item) => ({
      key: item.id,
      href: `#chart-${item.id}`,
      title: <span style={{ fontSize: 12 }}>{item.name}</span>,
    }));
    return { key: g.key, href: `#group-${g.key}`, title: g.title, children } as any;
  });
}

/* ==================== 实时模拟 ==================== */

const LIVE_SPEED_OPTIONS = [
  { value: 50, label: '50ms' },
  { value: 100, label: '100ms' },
  { value: 200, label: '200ms' },
  { value: 500, label: '500ms' },
];

function LiveSimulationBar() {
  const { enabled, intervalMs, setEnabled, setIntervalMs } = useLiveMode();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#595959', whiteSpace: 'nowrap' }}>
        数据刷新
      </span>
      <Segmented
        size="small"
        value={enabled ? 'on' : 'off'}
        onChange={(val) => setEnabled(val === 'on')}
        options={[
          {
            value: 'off',
            label: (
              <Tooltip title="图表使用静态默认数据">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <PauseCircleOutlined />
                  静态
                </span>
              </Tooltip>
            ),
          },
          {
            value: 'on',
            label: (
              <Tooltip title="定时更新数据，模拟实时场景">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ThunderboltOutlined />
                  实时
                </span>
              </Tooltip>
            ),
          },
        ]}
      />
      <span style={{ fontSize: 12, color: '#8c8c8c' }}>更新频率</span>
      <Segmented
        size="small"
        value={intervalMs}
        onChange={(val) => setIntervalMs(val as number)}
        options={LIVE_SPEED_OPTIONS.map((opt, i) => ({
          ...opt,
          disabled: !enabled,
        }))}
      />
    </div>
  );
}

/* ==================== 搜索索引 ==================== */

interface SearchItem {
  /** 唯一标识，用于跳转 */
  id: string;
  /** 搜索匹配关键词 */
  keywords: string[];
  /** 展示用标题 */
  value: string;
  /** 跳转路径，支持 /examples#chart-id 或 /docs#section-id */
  route: string;
  /** 锚点 id（用于页面内滚动） */
  anchorId: string;
  /** 类型 */
  type: 'chart' | 'doc';
  /** 分类名 */
  category: string;
  /** 名称 */
  name: string;
  /** 描述 */
  description?: string;
}

/** 防抖搜索延迟（ms） */
const SEARCH_DEBOUNCE_MS = 280;

/** 根据关键词过滤搜索索引 */
function filterSearchItems(items: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const filtered = items.filter((item) =>
    item.keywords.some((kw) => kw.toLowerCase().includes(q)) ||
    item.name.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q) ||
    (item.description != null && item.description.toLowerCase().includes(q)),
  );

  const seen = new Set<string>();
  return filtered
    .filter((item) => {
      const key = `${item.route}#${item.anchorId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

const DOC_SECTIONS: SearchItem[] = [
  { id: 'gs-install', keywords: ['安装', 'npm', 'install', 'getting started', '快速开始'], value: '安装', route: '/docs', anchorId: 'getting-started', type: 'doc', category: '快速开始', name: '安装' },
  { id: 'gs-minimal', keywords: ['最小示例', 'hello world', '示例', 'example'], value: '最小示例', route: '/docs', anchorId: 'getting-started', type: 'doc', category: '快速开始', name: '最小示例' },
  { id: 'gs-first', keywords: ['第一个图表', 'bar chart', '图表', 'chart'], value: '你的第一个图表', route: '/docs', anchorId: 'getting-started', type: 'doc', category: '快速开始', name: '你的第一个图表' },
  { id: 'root-component', keywords: ['根组件', 'ReactVizComposer', 'props', '属性', 'engine', 'width', 'height', 'viewport', 'canvasEventProps'], value: '根组件 ReactVizComposer', route: '/docs', anchorId: 'root-component', type: 'doc', category: 'API', name: '根组件 ReactVizComposer', description: '画布创建 & 渲染引擎生命周期' },
  { id: 'shapes', keywords: ['形状', 'Rect', 'Ellipse', 'Line', 'Path', 'Text', 'Image', 'Points', 'Group', '几何', '图形'], value: '形状组件', route: '/docs', anchorId: 'shapes', type: 'doc', category: 'API', name: '形状组件', description: 'Rect / Ellipse / Line / Path / Text / Image / Points / Group' },
  { id: 'containers', keywords: ['ClipPath', 'Filter', 'Mask', '裁剪', '滤镜', '遮罩', '容器', '特效'], value: '容器与特效', route: '/docs', anchorId: 'containers', type: 'doc', category: 'API', name: '容器与特效', description: 'ClipPath / Filter / Mask' },
  { id: 'events', keywords: ['事件', 'onClick', 'onMouseEnter', 'onMouseMove', 'onDrag', 'event', '交互', '冒泡', 'stopPropagation'], value: '事件系统', route: '/docs', anchorId: 'events', type: 'doc', category: 'API', name: '事件系统', description: 'onClick / onMouseEnter / onDrag ...' },
  { id: 'animation', keywords: ['动画', 'Animation', 'playbook', 'tween', '入场', 'easing', 'from', 'to', 'compute', 'stagger'], value: '动画', route: '/docs', anchorId: 'animation', type: 'doc', category: 'API', name: '动画', description: '声明式 Tween，playbook 剧本' },
  { id: 'engine', keywords: ['引擎', 'SVG', 'Canvas', 'renderer', '渲染', 'engine', '增量', '重绘'], value: '渲染引擎', route: '/docs', anchorId: 'engine', type: 'doc', category: 'API', name: '渲染引擎', description: 'SVG 增量 DOM / Canvas 全量重绘' },
  { id: 'viewport', keywords: ['视口', '裁剪', 'cullMargin', 'cull', 'viewport'], value: '视口裁剪', route: '/docs', anchorId: 'viewport', type: 'doc', category: 'API', name: '视口裁剪', description: 'cullMargin 减少渲染压力' },
  { id: 'kit', keywords: ['kit', 'Axis', 'Grid', 'Tooltip', 'Legend', 'Crosshair', 'Brush', 'MarkLine', 'MarkPoint', 'MarkArea', '坐标轴', '网格', '浮层', '图例', '工具'], value: '半成品工具 kit', route: '/docs', anchorId: 'kit', type: 'doc', category: 'API', name: '半成品工具 (kit)', description: 'Axis / Grid / Tooltip / Legend ...' },
  { id: 'patterns', keywords: ['开发模式', 'pattern', '图表', '模式', '约定', 'ChartFrame', 'useChartItemHover', 'hover'], value: '图表开发模式', route: '/docs', anchorId: 'patterns', type: 'doc', category: '指南', name: '图表开发模式', description: '统一图表开发约定' },
  { id: 'types', keywords: ['类型', 'TypeScript', 'type', 'VizEvent', 'RectData', 'GroupData', 'ShapeEventProps', 'AnimStep', '类型导出'], value: '类型导出', route: '/docs', anchorId: 'types', type: 'doc', category: 'API', name: '类型导出', description: 'RectData / VizEvent / AnimStep ...' },
];

/** 场景搜索索引 */
const SCENARIO_SECTIONS: SearchItem[] = [
  { id: 'sc-topology', keywords: ['网络拓扑', 'Leaf-Spine', '交换机', '拓扑', 'topology', '网络', 'spine', 'leaf'], value: '企业网络拓扑', route: '/scenarios', anchorId: 'scenario-topology', type: 'doc', category: '场景', name: '企业网络拓扑', description: 'Leaf-Spine 网络架构拓扑可视化' },
  { id: 'sc-hmi', keywords: ['工业', 'HMI', '产线', '组态', '监控', 'industrial', '工厂', '设备'], value: '工业产线 HMI', route: '/scenarios', anchorId: 'scenario-hmi', type: 'doc', category: '场景', name: '工业产线 HMI', description: '工厂产线设备状态监控界面' },
  { id: 'sc-dashboard', keywords: ['大屏', 'dashboard', '实时', '仪表盘', '监控', 'realtime', '数据大屏'], value: '实时数据大屏', route: '/scenarios', anchorId: 'scenario-dashboard', type: 'doc', category: '场景', name: '实时数据大屏', description: '多指标实时监控仪表盘' },
  { id: 'sc-particle', keywords: ['粒子', '粒子系统', 'particle', '流动', '数据流', '动画', '粒子动画'], value: '粒子流动系统', route: '/scenarios', anchorId: 'scenario-particle', type: 'doc', category: '场景', name: '粒子流动系统', description: '大规模粒子动画数据流模拟' },
  { id: 'sc-campus', keywords: ['智慧园区', '园区', '楼宇', '停车', 'campus', 'smart', '安防', '能耗'], value: '智慧园区', route: '/scenarios', anchorId: 'scenario-campus', type: 'doc', category: '场景', name: '智慧园区', description: '楼宇/能源/停车/安防一体化概览' },
  { id: 'sc-kg', keywords: ['知识图谱', '知识网络', '社交网络', 'knowledge', 'graph', '图谱', '实体', '关系'], value: '知识图谱', route: '/scenarios', anchorId: 'scenario-kg', type: 'doc', category: '场景', name: '知识图谱', description: '科技领域实体关系图谱' },
];

function buildChartSearchItems(): SearchItem[] {
  return ALL_ENTRIES.map((e) => {
    const cat = CATEGORIES.find((c) => c.key === e.categoryKey);
    return {
      id: e.id,
      keywords: e.keywords,
      value: e.name,
      route: '/examples',
      anchorId: `chart-${e.id}`,
      type: 'chart' as const,
      category: cat?.title ?? '',
      name: e.name,
    };
  });
}

/* ==================== Header ==================== */

function HeaderBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeKey = getActiveKey(location.pathname);

  const [searchValue, setSearchValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<InputRef>(null);

  // 搜索索引：图表 + 文档 + 场景
  const chartItems = useMemo(() => buildChartSearchItems(), []);
  const allItems = useMemo(() => [...DOC_SECTIONS, ...SCENARIO_SECTIONS, ...chartItems], [chartItems]);

  // Ctrl+K / Cmd+K 聚焦搜索
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /** 防抖更新查询词并结束加载态 */
  const runDebouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedQuery(value.trim());
        setSearchLoading(false);
      }, SEARCH_DEBOUNCE_MS),
    [],
  );

  useEffect(() => {
    return () => {
      runDebouncedSearch.cancel();
    };
  }, [runDebouncedSearch]);

  useEffect(() => {
    setSearchResults(filterSearchItems(allItems, debouncedQuery));
  }, [allItems, debouncedQuery]);

  const handleSearchSelect = useCallback((item: SearchItem) => {
    runDebouncedSearch.cancel();
    setSearchValue('');
    setDebouncedQuery('');
    setSearchResults([]);
    setSearchLoading(false);
    setSearchOpen(false);

    if (location.pathname !== item.route) {
      navigate(item.route);
    }

    setTimeout(() => {
      const el = document.getElementById(item.anchorId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, location.pathname !== item.route ? 200 : 50);
  }, [navigate, location.pathname, runDebouncedSearch]);

  /**
   * 输入变更：立刻打开气泡并进入加载态，防抖后再出结果
   * @param value - 输入框当前值
   */
  function handleSearchChange(value: string) {
    setSearchValue(value);
    const trimmed = value.trim();
    if (!trimmed) {
      runDebouncedSearch.cancel();
      setSearchOpen(false);
      setSearchLoading(false);
      setDebouncedQuery('');
      setSearchResults([]);
      return;
    }
    setSearchOpen(true);
    setSearchLoading(true);
    runDebouncedSearch(value);
  }

  /**
   * 聚焦：有内容时重新打开气泡
   */
  function handleSearchFocus() {
    if (searchValue.trim()) {
      setSearchOpen(true);
    }
  }

  /**
   * 失焦：延迟关闭，避免点击结果项时气泡先消失
   */
  function handleSearchBlur() {
    setTimeout(() => {
      setSearchOpen(false);
    }, 180);
  }

  const searchPopupContent = (
    <div style={{ width: 320 }}>
      {searchLoading ? (
        <div style={{ padding: '28px 24px', textAlign: 'center' }}>
          <Spin size="small" />
          <div style={{ marginTop: 10, fontSize: 13, color: '#8c8c8c' }}>加载中..</div>
        </div>
      ) : searchResults.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ fontSize: 13, color: '#8c8c8c' }}>未找到相关内容</span>}
          />
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto', margin: '-12px -16px' }}>
          {searchResults.map((item) => (
            <SearchResultItem
              key={item.id}
              item={item}
              query={debouncedQuery.toLowerCase()}
              onSelect={() => handleSearchSelect(item)}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 56,
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#141414',
          letterSpacing: -0.3,
          flexShrink: 0,
          cursor: 'pointer',
          marginRight: 32,
          userSelect: 'none',
        }}
        onClick={() => navigate('/')}
      >
        <span style={{ color: '#1677ff' }}>ReactViz</span>Composer
      </div>

      {/* 导航 Tab */}
      <nav style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
              fontSize: 14,
              fontWeight: activeKey === tab.key ? 600 : 400,
              color: activeKey === tab.key ? '#1677ff' : '#595959',
              background: activeKey === tab.key ? '#e6f4ff' : 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 右侧：全局搜索 + 版本号 */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
        <div className="header-search" style={{ width: 260 }}>
          <Popover
            open={searchOpen}
            content={searchPopupContent}
            placement="bottomRight"
            trigger={[]}
            arrow={false}
            styles={{
              content: {
                padding: '12px 16px',
                borderRadius: 10,
                boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
              },
            }}
          >
            <Input
              ref={searchInputRef}
              value={searchValue}
              placeholder="搜索文档、图表…"
              prefix={<SearchOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />}
              allowClear
              size="small"
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onClear={() => handleSearchChange('')}
            />
          </Popover>
        </div>
        <span style={{ fontSize: 12, color: '#8c8c8c' }}>v0.1.0</span>
      </div>
    </Header>
  );
}

/* ─── 搜索结果项 ─── */

function SearchResultItem({ item, query, onSelect }: { item: SearchItem; query: string; onSelect: () => void }) {
  const typeColor = item.type === 'chart' ? '#1677ff' : '#52c41a';
  const TypeIcon = item.type === 'chart' ? PieChartOutlined : FileTextOutlined;

  // 关键词高亮
  const highlightName = useMemo(() => {
    const idx = item.name.toLowerCase().indexOf(query);
    if (idx === -1) return item.name;
    return (
      <>
        {item.name.slice(0, idx)}
        <span style={{ color: '#1677ff', fontWeight: 600 }}>
          {item.name.slice(idx, idx + query.length)}
        </span>
        {item.name.slice(idx + query.length)}
      </>
    );
  }, [item.name, query]);

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f5ff'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* 类型图标 */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: `${typeColor}10`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <TypeIcon style={{ color: typeColor, fontSize: 16 }} />
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#141414' }}>
            {highlightName}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 3,
              background: `${typeColor}15`,
              color: typeColor,
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {item.type === 'chart' ? '图表' : '文档'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            {item.type === 'chart' ? (
              <>分类：{item.category}</>
            ) : (
              <>{item.description || '文档章节'}</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ==================== 示例页（Gallery） ==================== */

function ExamplesPage() {
  const [activeAnchor, setActiveAnchor] = useState<string>('');
  const anchorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeAnchor || !anchorContainerRef.current) return;
    const el = anchorContainerRef.current.querySelector(
      `.ant-anchor-link-title-active, [data-anchor-key="${activeAnchor}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeAnchor]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* 工具栏：仅实时模拟 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 32px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 56,
          zIndex: 50,
        }}
      >
        <LiveSimulationBar />
      </div>

      {/* 内容区 */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* 左侧锚点 */}
        <div style={{ width: ANCHOR_WIDTH, flexShrink: 0, position: 'relative' }}>
          <div
            ref={anchorContainerRef}
            style={{
              position: 'sticky',
              top: 116,
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              padding: '12px 0',
              maxHeight: 'calc(100vh - 144px)',
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: '0 16px 8px', fontSize: 13, fontWeight: 600, color: '#262626', borderBottom: '1px solid #f0f0f0' }}>
              图表目录
            </div>
            <Anchor
              affix={false}
              items={buildAnchorItems(CATEGORIES)}
              getContainer={() => window}
              offsetTop={116}
              targetOffset={24}
              onChange={(currentLink) => setActiveAnchor(currentLink.replace('#', ''))}
              style={{ padding: '4px 12px' }}
            />
          </div>
        </div>

        {/* 右侧内容 */}
        <Content style={{ padding: '32px 32px 80px 24px', overflow: 'auto', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, ${CARD_SIZE}px)`, gap: GRID_GAP, justifyContent: 'center' }}>
            {CATEGORIES.flatMap((group) => [
              <div key={`title-${group.key}`} id={`group-${group.key}`} style={{ gridColumn: '1 / -1', scrollMarginTop: 116, paddingTop: group.key === CATEGORIES[0].key ? 0 : 8 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: '#262626' }}>
                  {group.title}
                </h2>
              </div>,
              ...group.children.map((entry) => (
                <ChartCard key={entry.id} entry={entry} />
              )),
            ])}
          </div>
        </Content>
      </div>
    </div>
  );
}

/* ==================== 场景页 ==================== */

interface ScenarioEntry {
  id: string;
  title: string;
  description: string;
  tags: string[];
  demo: React.ReactNode;
  /** 渲染区高度 */
  demoHeight?: number;
}

const SCENARIO_CARD_W = 680;
const SCENARIO_CARD_H = 440;
const SCENARIO_CARD_GAP = 32;

const SCENARIOS: ScenarioEntry[] = [
  {
    id: 'topology',
    title: '企业网络拓扑',
    description: 'Leaf-Spine 数据中心网络架构可视化，展示交换机节点与光纤链路，支持数据包流动动画。',
    tags: ['网络', '拓扑', 'Leaf-Spine'],
    demo: <NetworkTopology width={SCENARIO_CARD_W} height={SCENARIO_CARD_H} />,
  },
  {
    id: 'hmi',
    title: '工业产线 HMI',
    description: '工厂产线设备状态监控界面，展示熔炉、CNC、传送带等设备运行状态与实时数据。',
    tags: ['工业', 'HMI', '组态'],
    demo: <IndustrialHMI width={SCENARIO_CARD_W} height={SCENARIO_CARD_H} />,
  },
  {
    id: 'dashboard',
    title: '实时数据大屏',
    description: '多指标监控仪表盘，包含 KPI 卡片、柱状图、趋势线和环形进度，模拟生产环境大屏。',
    tags: ['大屏', '实时', '仪表盘'],
    demo: <RealtimeDashboard width={SCENARIO_CARD_W} height={SCENARIO_CARD_H} />,
  },
  {
    id: 'particle',
    title: '粒子流动系统',
    description: '47 个粒子沿 4 条贝塞尔曲线轨迹流动，模拟数据流传输，展示 Animation compute 能力。',
    tags: ['粒子', '动画', '数据流'],
    demo: <ParticleFlow width={SCENARIO_CARD_W} height={SCENARIO_CARD_H} />,
  },
  {
    id: 'campus',
    title: '智慧园区',
    description: '园区一体化概览大屏，集成楼宇入驻率、能耗监控、停车位占用和环境传感器数据。',
    tags: ['园区', '楼宇', '停车'],
    demo: <SmartCampus width={SCENARIO_CARD_W} height={SCENARIO_CARD_H} />,
  },
  {
    id: 'kg',
    title: '知识图谱',
    description: '科技领域 15 个实体关系图谱：悬停高亮关联边，拖拽节点后以该点为锚自动力导向重布局。',
    tags: ['知识图谱', '拖拽', '力导向'],
    demo: <KnowledgeGraph width={SCENARIO_CARD_W} height={SCENARIO_CARD_H} />,
  },
];

function ScenariosPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div style={{ maxWidth: SCENARIO_CARD_W + 80, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#141414', margin: '0 0 8px' }}>
        场景可视化
      </h1>
      <p style={{ fontSize: 14, color: '#8c8c8c', margin: '0 0 40px', lineHeight: 1.6 }}>
        这些场景全部基于 ReactVizComposer 底层形状组件（Rect、Ellipse、Line、Path、Text、
        Group、Animation 等）构建，展示框架在非图表领域的通用可视化能力。
      </p>

      {SCENARIOS.map((scenario) => (
        <div
          key={scenario.id}
          id={`scenario-${scenario.id}`}
          style={{ marginBottom: SCENARIO_CARD_GAP, scrollMarginTop: 80 }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              border: '1px solid #f0f0f0',
            }}
          >
            {/* 渲染区 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafafa',
                padding: '8px 0',
              }}
            >
              <ViewportRender minHeight={SCENARIO_CARD_H}>
                {scenario.demo}
              </ViewportRender>
            </div>
            {/* 信息区 */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#141414' }}>
                {scenario.title}
              </h3>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#595959', lineHeight: 1.6 }}>
                {scenario.description}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {scenario.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      fontSize: 11,
                      color: '#1677ff',
                      background: '#e6f4ff',
                      borderRadius: 4,
                      fontWeight: 500,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== 首页适配 ==================== */

function HomePageWrapper() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <HomePage onNavigate={(page) => navigate(page === 'home' ? '/' : `/${page}`)} />
  );
}

/* ==================== 文档页适配 ==================== */

function DocsPageWrapper() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return <DocsPage />;
}

/* ==================== 主布局 ==================== */

function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', flexDirection: 'column' }}>
      <HeaderBar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<HomePageWrapper />} />
          <Route path="/docs" element={<DocsPageWrapper />} />
          <Route path="/examples" element={<ExamplesPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
        </Routes>
      </div>

      <footer style={{
        borderTop: '1px solid #f0f0f0',
        padding: '20px 32px',
        textAlign: 'center',
        fontSize: 13,
        color: '#8c8c8c',
        background: '#fff',
      }}>
        ReactVizComposer · 声明式 SVG/Canvas 混合渲染引擎 · v0.1.0
      </footer>
    </Layout>
  );
}

export default function App() {
  return (
    <LiveDataProvider>
      <AppLayout />
    </LiveDataProvider>
  );
}
