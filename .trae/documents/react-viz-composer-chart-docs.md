# ReactVizComposer 二维图表文档站

## Context

用户已经有一个可工作的 ReactVizComposer 库（基于 Rect/Ellipse/Line/Path/Text/Group/LinearGradient/RadialGradient/ClipPath/Animation），现需要仿 antd 组件库官网的风格，构建一个二维图表文档站：每个图表是一个 antd Card 演示块（含可展开的代码），右侧固定锚点导航，第一版覆盖 12 种 echarts 常见图表。用户同时询问带颜色格式化代码的三方库选型。

## 用户已确认的关键决策

- **代码高亮库**：`prism-react-renderer`（轻量、React 原生、TS/TSX 支持、主题可定制）
- **图表范围**：12 种全做（基础三件套 + 进阶 + 业务向 + 漏斗/桑基/树图）
- **锚点模式**：右侧固定锚点（仿 antd 官网）

## 整体架构

```
左侧主区域（可滚动）               右侧固定 240px
┌─────────────────────────┐  ┌──────────┐
│  # 标题 / 简介             │  │ 锚点导航  │
│  ## 柱状图                  │  │ - 基础图表 │
│  ┌─Card──────────────┐   │  │   - 柱状图 │
│  │ 标题 + 描述         │   │  │   - 折线图 │
│  │ 渲染区（600x400）  │   │  │   - 散点图 │
│  │ [展开代码]         │   │  │ - 进阶图表 │
│  └────────────────────┘   │  │ ...       │
│  ## 折线图 ...              │  │          │
└─────────────────────────┘  └──────────┘
```

## 实施步骤

### 1. 安装依赖

`prism-react-renderer`（已确认选型）

```bash
pnpm add prism-react-renderer
```

### 2. 基础设施（`src/charts/shared/`）

**palette.ts** — 调色板
- 12 色分类色板（用于多系列）
- 6 色语义色板（蓝/橙/绿/红/紫/青）
- K线专用涨跌色（红涨绿跌，可切换）

**scales.ts** — 数据 → 像素映射工具函数
- `scaleLinear(domain, range)` 线性映射
- `scaleBand(domain, range, padding)` 离散映射
- 不引入 d3，纯手写（< 30 行）

**Axis.tsx** — 坐标轴组件
- props: `scale`, `orient` ('bottom' | 'left'), `ticks`, `tickFormat`, `length`
- 用 Rect 画轴线、Line 画 tick、Text 画标签
- `y` 坐标翻转：domain 是 [0, max]，range 翻转成 [bottom, top]

**Grid.tsx** — 网格线
- props: `scale`, `orient`, `length`, `count`
- 用 Line 画水平或垂直网格

**ChartFrame.tsx** — 图表外框
- 标准尺寸 600×400 容器
- 内边距 40px（留给轴标签）
- 负责挂载 ReactVizComposer

**mockData.ts** — 示例数据集
- 12 个图表各一份（如柱状图：6 个月销量；K线：30 天 OHLC；桑基：能源流向）

### 3. 12 个图表组件（`src/charts/`）

每个组件签名统一：`({ data, ...opts }) => JSX`，内部用 ChartFrame 包裹。

| 图表 | 实现方式 | 关键元素 |
|---|---|---|
| BarChart | 垂直柱子 | `Rect` + x 轴 `Axis`(band) + y 轴 `Axis`(linear) + 网格 |
| LineChart | 折线 + 数据点 | `Path`(无 fill) + `Ellipse`(数据点) + 双轴 |
| ScatterChart | 散点 | `Ellipse` + 双轴 |
| AreaChart | 折线 + 区域填充 | `Path`(fill 半透明) + 顶 `Path`(stroke) |
| PieChart | 圆饼 | `Path`(SVG 弧形 `A` 命令) + 中心 Text |
| RadarChart | 雷达多边形 | `Line`(多边形) + 标签 Text + 网格 Line |
| CandlestickChart | K线 | 高低 `Line` + 实体 `Rect`(红涨绿跌) + x 轴时间 |
| GanttChart | 甘特 | 横向 `Rect`(任务条) + y 轴任务名 + x 轴时间 |
| HeatmapChart | 热力 | 网格 `Rect` 颜色按 value 映射 |
| FunnelChart | 漏斗 | 横向梯形 `Path` + 中心 Text 标签 |
| SankeyChart | 桑基 | 节点 `Rect` + 连线 `Path`(贝塞尔) + Text |
| TreeChart | 树图 | 递归 `Group` + 连接 `Path` + 节点 `Rect` |

### 4. 文档站基础设施（`src/components/`）

**CodeBlock.tsx** — 包装 prism-react-renderer
- props: `code: string`, `language?: string` (默认 tsx), `title?: string`
- 用 `Highlight` 组件渲染，自定义 antd 配色主题（背景 #fafafa，token 色与 antd Typography 一致）
- 顶部带"复制"按钮（用 antd `Button` size="small"）
- 顶部带"语言标签"（右上角灰字）
- 行号显示

**DemoBlock.tsx** — 单个图表演示块
- props: `id`（锚点用）, `title`, `description`, `code: string`, `children: ReactNode`
- 用 antd `Card`：
  - `title`: 标题 + 右侧"显示代码"按钮（切换展开）
  - body: 渲染区（白底 + 边框）
  - 展开区域：antd `Collapse`（或直接条件渲染）显示 CodeBlock
- 容器外层加 `id={id}` 用于锚点跳转

**Sidebar.tsx** — 右侧锚点
- 用 antd `Anchor` 组件（`affix: true`，`offsetTop: 80`）
- 分组：基础 / 进阶 / 业务 / 其他
- 每项 `href="#chart-bar"` 跳到对应 DemoBlock
- 选中状态用 antd 默认蓝色

### 5. App.tsx 改造

替换现有 App.tsx（保留拖拽 demo 的能力暂时不重要，按用户意图改为文档站）：

```tsx
export default function App() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <Header />                  // 顶部 logo + 标题
      <Layout>
        <Content style={{ maxWidth: 920, margin: '0 auto', padding: '40px' }}>
          <Typography.Title>ReactVizComposer</Typography.Title>
          <Paragraph>...简介...</Paragraph>

          <AnchorTitle>基础图表</AnchorTitle>
          <DemoBlock id="chart-bar" title="柱状图" code={barCode}><BarChart data={barData} /></DemoBlock>
          <DemoBlock id="chart-line" title="折线图" code={lineCode}><LineChart data={lineData} /></DemoBlock>
          <DemoBlock id="chart-scatter" title="散点图" code={scatterCode}><ScatterChart data={scatterData} /></DemoBlock>

          <AnchorTitle>进阶图表</AnchorTitle>
          <DemoBlock id="chart-area" title="面积图" code={areaCode}><AreaChart data={areaData} /></DemoBlock>
          <DemoBlock id="chart-pie" title="饼图" code={pieCode}><PieChart data={pieData} /></DemoBlock>
          <DemoBlock id="chart-radar" title="雷达图" code={radarCode}><RadarChart data={radarData} /></DemoBlock>

          <AnchorTitle>业务图表</AnchorTitle>
          <DemoBlock id="chart-candlestick" title="K线图" code={klineCode}><CandlestickChart data={klineData} /></DemoBlock>
          <DemoBlock id="chart-gantt" title="甘特图" code={ganttCode}><GanttChart data={ganttData} /></DemoBlock>
          <DemoBlock id="chart-heatmap" title="热力图" code={heatmapCode}><HeatmapChart data={heatmapData} /></DemoBlock>

          <AnchorTitle>其他图表</AnchorTitle>
          <DemoBlock id="chart-funnel" title="漏斗图" code={funnelCode}><FunnelChart data={funnelData} /></DemoBlock>
          <DemoBlock id="chart-sankey" title="桑基图" code={sankeyCode}><SankeyChart data={sankeyData} /></DemoBlock>
          <DemoBlock id="chart-tree" title="树图" code={treeCode}><TreeChart data={treeData} /></DemoBlock>
        </Content>
        <Sider width={240} style={{ position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
          <Sidebar />
        </Sider>
      </Layout>
    </Layout>
  );
}
```

`barCode` 等字符串直接用模板字符串书写完整 TSX 代码（包含 import、data、JSX），这样展开后用户能直接复制运行。

## 关键文件清单

**新增：**
- `src/charts/shared/palette.ts`
- `src/charts/shared/scales.ts`
- `src/charts/shared/Axis.tsx`
- `src/charts/shared/Grid.tsx`
- `src/charts/shared/ChartFrame.tsx`
- `src/charts/shared/mockData.ts`
- `src/charts/BarChart.tsx`
- `src/charts/LineChart.tsx`
- `src/charts/ScatterChart.tsx`
- `src/charts/AreaChart.tsx`
- `src/charts/PieChart.tsx`
- `src/charts/RadarChart.tsx`
- `src/charts/CandlestickChart.tsx`
- `src/charts/GanttChart.tsx`
- `src/charts/HeatmapChart.tsx`
- `src/charts/FunnelChart.tsx`
- `src/charts/SankeyChart.tsx`
- `src/charts/TreeChart.tsx`
- `src/components/CodeBlock.tsx`
- `src/components/DemoBlock.tsx`
- `src/components/Sidebar.tsx`

**修改：**
- `src/App.tsx`（重写为文档站）
- `package.json`（新增 `prism-react-renderer`）

**保持不变：**
- `src/components/ReactVizComposer/`（核心库）
- `src/main.tsx`

## 关键设计决策

1. **画布尺寸**：所有图表统一 600×400 内部坐标系，外层 ChartFrame 设置 ReactVizComposer 容器 `width: 600, height: 400`（不复用 `width: 100%`，因为 SVG 内部坐标就是像素）。
2. **Y 轴翻转**：在 scales.ts 中 `scaleLinear` 提供 `invert: true` 选项，把 domain 上下界对应到画布的上下界。
3. **代码字符串**：每个图表的 `code` 字符串是手写 TSX 模板，包含 import 和示例数据，让用户能直接拷贝。
4. **示例数据外置**：mockData.ts 提供 12 个数据集，图表组件可被复用，code 字符串里也嵌入这些数据。
5. **右侧锚点分组**：用 antd Anchor 的 `items` API，按图表分类组织。

## 复用的现有工具

- 所有形状组件来自 `src/components/ReactVizComposer/shapes/`（Rect / Ellipse / Line / Path / Text / Group / LinearGradient / RadialGradient / ClipPath）
- 颜色和文本渲染不需要重新发明，直接用组件
- 渲染器选择 `engine="svg"`（默认）：图表数据量 100-1000 完全够用，调试也最直观

## 验证方式

1. **启动 dev server**：
   ```bash
   cd /Users/tycho/Workspace/Projects/React/react-viz-composer
   pnpm install   # 安装 prism-react-renderer
   pnpm dev
   ```
2. **页面访问**：打开 http://localhost:5173，看到：
   - 顶部 header + 标题
   - 12 个 Card 按 4 组排列
   - 右侧锚点高亮当前章节
3. **交互验证**：
   - 点击右侧锚点，页面平滑滚动到对应 Card
   - 滚动页面，右侧锚点高亮跟随变化
   - 点击 "显示代码"，展开/收起 CodeBlock
   - CodeBlock 里的 TSX 代码带高亮：import / 组件名 / 字符串 / 数字颜色不同
   - 复制按钮可点击并复制到剪贴板
4. **图表正确性**：
   - 柱状图：6 个柱子高度比例与数据成比例
   - 折线图：3 条不同颜色的折线 + 数据点
   - 散点图：~50 个点随机分布
   - 饼图：3-4 块扇形，总和 360°
   - K线图：30 根红绿实体 + 上下影线
   - 雷达图：3 层多边形 + 5 个轴标签
   - 甘特图：5 个任务条横向排列
   - 热力图：7×7 网格颜色按值渐变
   - 漏斗图：4 层梯形
   - 桑基图：节点 + 贝塞尔连线
   - 树图：3 层节点 + 连接线
   - 面积图：填充半透明 + 顶线
5. **TypeScript 检查**：`pnpm tsc -b` 无错误

## 风险与注意

- **WebGPU 引擎在某些环境不可用**：用 `engine="svg"`，跨平台稳定。
- **Axis 组件性能**：12 个图表每次 mount 都画 ~20 个 Text，没问题（1000 元素以下都流畅）。
- **桑基图布局**：手写简易布局（节点等距分配），不引入 d3-sankey 算法。
- **树图布局**：用递归 + 等距布局，节点坐标手算。
- **代码字符串转义**：模板字符串里含 `</` 等字符要小心，可以直接写在 `const code = \`...\`` 中（TypeScript 允许），或用 raw 字符串。

## 完成判据

- 12 个图表每个都正确渲染
- 每个图表的"显示代码"展开后能看到带 TSX 语法高亮的代码
- 右侧锚点点击/滚动联动正常
- 整体观感与 antd 官网类似（白底 + Card 阴影 + 蓝色锚点）
- TypeScript 编译无错误
