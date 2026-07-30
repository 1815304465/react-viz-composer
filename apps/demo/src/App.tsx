/**
 * App —— ReactVizComposer 二维图表文档站
 *
 * 左侧固定锚点目录 + 右侧全量展示二维图表（按分类分组，每组有标题）。
 * 顶部 Header 带搜索框 + 版本号。
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Layout, Input, Anchor, Switch, Select, Space } from 'antd';
import type { AnchorProps } from 'antd';
import { ViewportRender } from './components/ViewportRender';
import { LiveDataProvider, useLiveMode } from './live';
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

const { Header, Content } = Layout;

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

/* ==================== 实时模拟开关 ==================== */

const INTERVAL_OPTIONS = [
  { value: 50, label: '50ms 硬切压测' },
  { value: 100, label: '100ms 平滑' },
  { value: 200, label: '200ms 平滑' },
  { value: 500, label: '500ms 平滑' },
];

/** Header 内实时模拟控制条 */
function LiveDataControls() {
  const { enabled, intervalMs, setEnabled, setIntervalMs } = useLiveMode();

  return (
    <Space size={10} style={{ flexShrink: 0 }}>
      <span style={{ fontSize: 13, color: enabled ? '#69b1ff' : 'rgba(255,255,255,0.55)' }}>
        实时模拟
      </span>
      <Switch
        size="small"
        checked={enabled}
        onChange={setEnabled}
        checkedChildren="ON"
        unCheckedChildren="OFF"
      />
      <Select
        size="small"
        value={intervalMs}
        disabled={!enabled}
        options={INTERVAL_OPTIONS}
        onChange={setIntervalMs}
        style={{ width: 118 }}
        popupMatchSelectWidth={false}
      />
    </Space>
  );
}

/* ==================== 页面 ==================== */

function AppShell() {
  const [searchValue, setSearchValue] = useState('');
  const [activeAnchor, setActiveAnchor] = useState<string>('');
  const anchorContainerRef = useRef<HTMLDivElement>(null);

  // 锚点高亮变化时，自动滚动左侧容器使当前项可见
  useEffect(() => {
    if (!activeAnchor || !anchorContainerRef.current) return;
    const el = anchorContainerRef.current.querySelector(
      `.ant-anchor-link-title-active, [data-anchor-key="${activeAnchor}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeAnchor]);

  const searchOptions = useMemo(() => {
    if (!searchValue.trim()) return [];
    const q = searchValue.toLowerCase();
    return ALL_ENTRIES
      .filter((e) =>
        e.keywords.some((kw) => kw.toLowerCase().includes(q)) ||
        e.name.toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((e) => ({
        value: e.id,
        label: (
          <span>
            <span style={{ color: '#8c8c8c', fontSize: 12, marginRight: 8 }}>
              {CATEGORIES.find((c) => c.key === e.categoryKey)?.title}
            </span>
            {e.name}
          </span>
        ),
      }));
  }, [searchValue]);

  // 搜索选中 → 滚动到对应图表
  const handleSearchSelect = (id: string) => {
    setSearchValue('');
    const el = document.getElementById(`chart-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <Header
        style={{
          background: '#001529',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: 56,
          gap: 16,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: 1, flexShrink: 0 }}>
          ⚡ ReactVizComposer
        </span>

        {/* 搜索框 */}
        <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
          <Input.Search
            placeholder="搜索图表…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={(val) => {
              const found = ALL_ENTRIES.find(
                (e) =>
                  e.keywords.some((kw) => kw.toLowerCase().includes(val.toLowerCase())) ||
                  e.name.toLowerCase().includes(val.toLowerCase()),
              );
              if (found) handleSearchSelect(found.id);
            }}
            allowClear
            style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 6 }}
          />
          {searchOptions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 34,
                left: 0,
                right: 0,
                background: '#fff',
                borderRadius: 6,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                zIndex: 20,
              }}
            >
              {searchOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => handleSearchSelect(opt.value)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: 13,
                    borderBottom: '1px solid #f5f5f5',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f5ff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：实时模拟 + 描述 + 版本号 */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <LiveDataControls />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            声明式可视化组件库
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#1677ff', padding: '2px 8px', borderRadius: 4 }}>
            v0.1.0
          </span>
        </div>
      </Header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* 左侧锚点目录 */}
        <div style={{ width: ANCHOR_WIDTH, flexShrink: 0, position: 'relative' }}>
          <div
            ref={anchorContainerRef}
            style={{
              position: 'sticky',
              top: 72,
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              padding: '12px 0',
              maxHeight: 'calc(100vh - 100px)',
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
              offsetTop={72}
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
              <div key={`title-${group.key}`} id={`group-${group.key}`} style={{ gridColumn: '1 / -1', scrollMarginTop: 72, paddingTop: group.key === CATEGORIES[0].key ? 0 : 8 }}>
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
    </Layout>
  );
}

/** App 根：包一层 LiveDataProvider，供图表 Demo 订阅实时模拟 */
export default function App() {
  return (
    <LiveDataProvider>
      <AppShell />
    </LiveDataProvider>
  );
}
