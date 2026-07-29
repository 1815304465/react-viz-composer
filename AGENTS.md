# ReactVizComposer

声明式 SVG/Canvas 混合渲染引擎。将图表拆解为 Rect、Ellipse、Line、Path、Text、Image、Group、Animation 等底层形状，通过 React Context 投递 JSON 数据给渲染引擎，实现"声明式数据驱动 + 引擎统一渲染"的二维可视化框架。

目前基于此底层组件在仓库 `apps/charts` 中提供了 **47 种二维图表参考实现**（不随 npm 发布），覆盖 ECharts 全部常见品类。

## 包结构

```
packages/core                 → 引擎 + 形状（主产品）
packages/kit                  → 半成品工具组件（Axis / Grid / Tooltip），样式全部 props 可控
packages/react-viz-composer   → umbrella：re-export core + kit
apps/charts                   → 47 图参考实现 + ChartFrame / scales / palette（private）
apps/demo                     → 演示壳
```

依赖关系：`demo → charts → kit → core`；`ChartFrame`、色板、scale 仅在 `apps/charts`，不进入 kit 发布面。

```
用户 JSX（Rect / Group / Line / ...）
    │
    │ 子组件将 props 拆解为 JSON，通过 VizContext 投递
    ▼
┌──────────────────────────────────────────┐
│  React 层（index.tsx / context.ts / shapes/） │
│  - 形状组件：纯代理，return null              │
│  - VizContext：register / update / unregister │
│  - VizFrameContext：requestFrame / enqueueJob  │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│  graph/SceneTree.ts          嵌套 JSON 树   │
│  - React → Engine 桥梁                       │
│  - 脏标记 + 订阅通知                         │
└────────────────────┬─────────────────────┘
                     │ subscribe → syncFromSceneTree
                     ▼
┌──────────────────────────────────────────┐
│  Model.ts                    M = 数据层     │
│  - 扁平索引 (Map<id, ElementRecord>)         │
│  - 父子引用 + worldMatrix 缓存 + 脏标记      │
└────────────────────┬─────────────────────┘
                     │ getTopLevelElements()
                     ▼
┌──────────────────────────────────────────┐
│  renderer/                   V = 渲染层     │
│  ├─ CanvasRenderer.ts      全量重绘+视口裁剪 │
│  └─ SVGRenderer.ts         增量 DOM 更新    │
└──────────────────────────────────────────┘

graph/Graph.ts = C（控制层）
  ├── 持有 Model、Renderer、Scheduler、EventSystem、SceneTree
  ├── mount(container)：串联所有模块
  └── doRender()：rAF 循环 → Model 脏根 → Renderer.render()
```

### MVC 角色

| 角色 | 模块 | 职责 |
|------|------|------|
| **C** | `engine/graph/Graph.ts` | 总调度器，持有所有模块，统筹 mount / dispose / renderFrame |
| **M** | `engine/Model.ts` | 渲染器端扁平索引，脏标记管理，worldMatrix 缓存 |
| **V** | `engine/renderer/` | CanvasRenderer（全量重绘） / SVGRenderer（增量 DOM） |
| **桥梁** | `engine/graph/SceneTree.ts` | React 端嵌套 JSON 树 ↔ Model 同步 |
| **事件** | `engine/graph/EventSystem.ts` | SVG/Canvas 命中检测 + 事件冒泡 + VizEvent 合成 |

### 数据流

1. **声明阶段**：用户写 `<Rect x={10} y={20} width={100} height={50} fill="red" onClick={handler} />`
2. **代理阶段**：Rect 调用 `useShapeElement('rect', id, data, eventProps)` → `useViz().register(parentId, node)` 投递 JSON 到 SceneTree
3. **同步阶段**：SceneTree 变更 → `sceneTree.subscribe` 回调 → `Graph.applyScene(root)` → `Model.syncFromSceneTree()`
4. **渲染阶段**：`Graph.doRender()`（rAF 循环）→ `Model.getTopLevelElements()` → `Renderer.render(roots)`
5. **事件阶段**：EventSystem 在渲染层统一命中检测 → 沿 parentId 链冒泡 → 调用事件处理器

### 关键设计约束

- **子组件是纯代理**：Rect、Group、Line 等 shape 组件**不渲染任何 DOM**，全部 `return null`。只把 props 拆成 JSON 投递到 SceneTree。
- **渲染引擎仅两个**：`CanvasRenderer` 和 `SVGRenderer`。WebGL/WebGPU 已移除。
- **事件在 EventSystem 统一处理**：形状组件的 `onClick`/`onMouseEnter` 等 props 转为事件表注册到 SceneTree，EventSystem 统一分发。支持 stopPropagation 阻止冒泡。
- **引擎层零 React 依赖**：`engine/` 目录下所有代码均为纯 TypeScript，可独立测试。
- **目录分离**：React 层（`index.tsx` / `context.ts` / `shapes/`）与引擎层（`engine/`）严格隔离。

## 目录结构

```
ReactVizComposer/
├── packages/core/src/           # 引擎 + 形状（主产品）
│   ├── ReactVizComposer.tsx     # React 层：根组件
│   ├── context.ts               # VizContext / FrameContext
│   ├── index.ts                 # 对外入口
│   ├── shapes/                  # 形状组件（纯代理，return null）
│   │   ├── geometries/          # Rect / Ellipse / Line / Path / Text / Image / Points
│   │   ├── containers/          # Group / Animation / ClipPath / Filter / Mask
│   │   └── definitions/         # LinearGradient / RadialGradient
│   └── engine/                  # 引擎层（纯 TS，零 React 依赖）
│       ├── Model.ts / types.ts
│       ├── graph/               # Graph / SceneTree / EventSystem
│       ├── renderer/            # CanvasRenderer / SVGRenderer
│       └── utils/
├── packages/kit/src/            # Axis / Grid / Tooltip / Legend / Marks / …
├── packages/react-viz-composer/ # umbrella：re-export core + kit
├── apps/charts/src/             # 参考图表 + ChartFrame / scales / palette（不发布）
└── apps/demo/                   # 演示壳
```

> 以下形状 / 引擎细节仍以 `packages/core/src` 为准；旧扁平目录布局已废弃。

### 引擎内部（`packages/core/src/engine`）

```
engine/
├── index.ts / types.ts / Model.ts
├── graph/     Graph.ts · SceneTree.ts · EventSystem.ts
├── renderer/  Renderer.ts · CanvasRenderer.ts · SVGRenderer.ts
└── utils/     Scheduler · maths · colors · viewport · animations · …
```

## 根组件 API

```tsx
interface Props {
  engine?: 'svg' | 'canvas';             // 渲染引擎，默认 'svg'
  width?: number | string;               // 画布宽，默认 '100%'
  height?: number | string;              // 画布高，默认 '100%'
  viewport?: { x: number; y: number; scale: number };  // 受控视口
  interactiveViewport?: boolean;         // 滚轮缩放 + 拖拽平移
  onViewportChange?: (v: Viewport) => void;
  autoSize?: boolean;                    // ResizeObserver，默认 true
  debounceWait?: number;                 // resize 防抖 ms，默认 120
  cullMargin?: {                         // 视口裁剪边距
    top?: number;       // 默认画布高度的 20%
    right?: number;     // 默认画布宽度的 20%
    bottom?: number;
    left?: number;
  };
  canvasEventProps?: ShapeEventProps;    // 根画布事件（空白区域点击等）
  className?: string;
  style?: CSSProperties;
}
```

### canvasEventProps

根组件支持与形状组件完全一致的事件 props，当点击/移动发生在画布空白区域（未命中任何子元素）时触发：

```tsx
<ReactVizComposer
  engine="canvas"
  width={600}
  height={400}
  canvasEventProps={{
    onClick: (evt) => console.log('画布空白区域点击', evt.offsetX, evt.offsetY),
    onMouseMove: (evt) => console.log('在画布上移动'),
  }}
>
  ...
</ReactVizComposer>
```

## 形状组件

所有形状组件都是**纯代理**，返回 `null`，不渲染 DOM：

```tsx
function Rect(props: RectData & ShapeEventProps & { id?: string }) {
  const { id, data, eventProps } = resolveShapeProps(props, RECT_DATA_KEYS);
  useShapeElement('rect', id, data, eventProps);
  return null;
}
```

### 可用形状

| 组件 | 关键属性 |
|------|---------|
| `<Rect>` | x, y, width, height, rx, ry, fill, stroke, strokeWidth, opacity |
| `<Ellipse>` | cx, cy, rx, ry, fill, stroke, ... |
| `<Line>` | points: { x, y }[], stroke, strokeWidth, closed |
| `<Path>` | d: string (SVG path 命令), fill, stroke |
| `<Text>` | x, y, text, fontSize, fontFamily, fontWeight, fill, textAlign, textBaseline |
| `<Image>` | x, y, width, height, src |
| `<Points>` | cx: number[], cy: number[], rx?, ry?, fill?, stroke?（批量圆点） |
| `<Group>` | x, y, rotation, scaleX, scaleY, opacity, children |
| `<Animation>` | playbook: AnimStep[], watch?: WatchConfig, autoPlay, children |
| `<LinearGradient>` | **id**（用户指定，供 `fill="url(#id)"` 引用）, x1, y1, x2, y2, stops |
| `<RadialGradient>` | **id**（用户指定，供 `fill="url(#id)"` 引用）, cx, cy, r, stops |
| `<ClipPath>` | clip: ReactElement, children（声明式裁剪容器） |
| `<Filter>` | effects: FilterEffect[], children（声明式滤镜容器） |
| `<Mask>` | mask: ReactElement, maskMode?, children（声明式遮罩容器） |

> 裁剪 / 滤镜 / 遮罩不再通过几何形状上的 `clipPath` / `filter` / `mask` 字符串 props 引用；改为用容器包裹子节点。渐变仍需用户提供 `id`，通过 `fill="url(#id)"` 引用。

### 事件

所有形状（包括 Group）支持 React 风格事件 props：

`onClick` / `onDoubleClick` / `onContextMenu` / `onMouseDown` / `onMouseUp` / `onMouseMove` / `onMouseEnter` / `onMouseLeave` / `onPointerDown` / `onPointerUp` / `onPointerMove` / `onPointerEnter` / `onPointerLeave` / `onTouchStart` / `onTouchEnd` / `onTouchMove` / `onWheel` / `onDragStart` / `onDrag` / `onDragEnd`

事件通过 EventSystem 统一处理，非 React 合成事件。支持 `evt.stopPropagation()` 阻止冒泡，`evt.preventDefault()` 阻止默认行为。

### ClipPath（裁剪容器）

声明式硬裁剪容器：`clip` 传入几何形状，作用范围为其全部 `children`，无需手动指定 id / `url(#id)`。

```tsx
<ClipPath clip={<Ellipse cx={100} cy={100} rx={50} ry={50} />}>
  <Path d="..." />
</ClipPath>
```

### Filter（滤镜容器）

声明式滤镜容器，对标 Canvas 2D `ctx.filter`（CSS filter 字符串）。支持 `blur` / `brightness` / `contrast` / `dropShadow` / `grayscale` / `opacity` / `saturate` / `sepia` / `hueRotate`。作用范围为其全部 `children`。

```tsx
<Filter effects={[{ type: 'blur', value: 3 }]}>
  <Rect x={50} y={50} width={200} height={200} fill="blue" />
</Filter>
<Filter effects={[
  { type: 'dropShadow', value: 4, offsetX: 2, offsetY: 2, color: 'rgba(0,0,0,0.3)' },
  { type: 'grayscale', value: 50 },
]}>
  <Rect x={50} y={50} width={200} height={200} fill="blue" />
</Filter>
```

### Mask（遮罩容器）

声明式软遮罩容器（通过透明度/亮度控制可见程度），区别于 ClipPath 的硬裁剪。支持 `alpha` 和 `luminance` 两种模式。`mask` 传入几何形状，作用范围为其全部 `children`。

```tsx
<Mask mask={<Ellipse cx={100} cy={100} rx={50} ry={50} />} maskMode="alpha">
  <Rect x={50} y={50} width={200} height={200} fill="blue" />
</Mask>
```

### Animation（动画容器）

声明式 Tween 动画容器。通过 `playbook` 剧本定义动画步骤，支持分组并行/串行、循环、watch 监听触发、命令式 API（play/pause/resume/cancel）。

子节点应写**最终视觉 props**（`to` 可省略，默认取自当前 props）；`from` 表示入场起点。

`targets: 'children'` 会**穿透** ClipPath / Filter / Mask，作用到真实子形状；也可用命名 `id` 作为 target（与效果容器混用时推荐）。

```tsx
<Animation playbook={[
  { attribute: 'height', from: 0, duration: 600, easing: 'easeOut', targets: 'children' },
  { attribute: 'scaleX', from: 1, to: 1.5, duration: 400, group: 1 },
]} onComplete={() => console.log('done')}>
  <Rect x={50} y={50} width={100} height={200} fill="blue" />
</Animation>

{/* children 穿透 ClipPath */}
<Animation playbook={[{ attribute: 'opacity', from: 0, targets: 'children' }]}>
  <ClipPath clip={<Ellipse cx={100} cy={100} rx={50} ry={50} />}>
    <Path d="..." />
  </ClipPath>
</Animation>
```

可动画属性：`x` / `y` / `rotation` / `scaleX` / `scaleY`（transform 类）和 `width` / `height` / `opacity` / `rx` / `ry` / `cx` / `cy` / `strokeWidth` / `fill` / `stroke` / `fontSize`（形状属性类）。

## 图表开发模式

所有图表遵循统一模式，以 HorizontalBarChart 为例：形状写**最终视觉 props**，入场动画用 `<Animation playbook>`，`ChartFrame` 直接接收 children（不再使用 progress render prop / `useEntryProgress`）。

```tsx
import { Animation, Rect, Text } from '@react-viz-composer/core';
import { Axis, Grid } from '@react-viz-composer/kit';
import {
  ChartFrame, useChartSize,
  useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps,
  scaleBand, scaleLinear, SEMANTIC_6,
} from './local';

interface BarItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<BarItem> {
  data?: BarItem[];
  color?: string;
}

const BAR_PLAYBOOK = [
  { attribute: 'width', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
] as const;

export function HorizontalBarChart(props: Props) {
  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: BarItem) => d.name,
  );

  const dataset = data ?? [/* 默认数据 */];
  const categories = dataset.map((d) => d.name);
  const yScale = scaleBand(categories, [0, PLOT_HEIGHT], 0.3);
  const xScale = scaleLinear([0, maxValue * 1.1], [0, PLOT_WIDTH]);

  return (
    <ChartFrame>
      <Grid scale={xScale} orient="x" />
      <Animation playbook={[...BAR_PLAYBOOK]}>
        {dataset.map((d) => (
          <Rect
            key={d.name}
            x={0}
            y={yScale(d.name)}
            width={xScale(d.value)}
            height={yScale.bandwidth}
            fill={color}
            strokeWidth={hoverStrokeWidth(1, isHovering(d.name))}
            {...bindHover(d)}
          />
        ))}
      </Animation>
      <Axis scale={xScale} orient="bottom" />
      <Axis scale={yScale} orient="left" />
    </ChartFrame>
  );
}
```

### 关键约定

1. **ChartFrame 包裹**：所有图表必须包裹在 `<ChartFrame>` 中，直接传入 children（非 render prop）
2. **入场动画**：用 `<Animation playbook>`；子节点写最终视觉 props，`from` 表示入场起点；`targets: 'children'` 可穿透 ClipPath / Filter / Mask，也可用命名 id
3. **Hover 支持**：extends `ChartItemHoverProps<T>`，使用 `useChartItemHover` + `bindHover` + `isHovering`
4. **默认数据**：所有 data prop 可选，缺失时使用内置默认数据确保可独立渲染
5. **Named + Default 导出**：`export function ChartName` + `export default ChartName`
6. **mockData 集中管理**：所有 mock 数据定义在 `apps/charts/src/mockData.ts`

## Demo 模式

每个图表在 `apps/demo/src/components/ChartDemos.tsx` 中有一个 Demo 函数，包裹 `ChartHoverShell` 提供 Tooltip：

```tsx
export function BarChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <BarChart
          data={barData}
          onItemEnter={(d, evt) => show(`${d.month}\n数值: ${d.value}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}
```

## 辅助模块

| 路径 | 说明 |
|------|------|
| `packages/kit/src/Axis.tsx` | 半成品坐标轴（length/crossAt/颜色/字号均 props） |
| `packages/kit/src/Grid.tsx` | 半成品网格线（length/stroke 均 props） |
| `packages/kit/src/Tooltip.tsx` | 半成品浮层（位置/样式均 props） |
| `packages/kit/src/Legend.tsx` | 半成品图例（items + onItem* 事件，自行对接系列显隐） |
| `packages/kit/src/MarkLine.tsx` / `MarkPoint.tsx` / `MarkArea.tsx` | 阈值线 / 标注点 / 区间阴影 |
| `packages/kit/src/Crosshair.tsx` | 十字准星（受控 x/y，配合 onMouseMove） |
| `packages/kit/src/Brush.tsx` | 框选矩形（受控几何，配合拖拽事件） |
| `apps/charts/src/shared/ChartFrame.tsx` | 示例外框（跟随父级宽高） |
| `apps/charts/src/local.ts` | 示例本地 barrel（scales/palette/hover） |
| `apps/charts/src/mockData.ts` | 图表 mock 数据 |
| `apps/demo/src/components/ChartDemos.tsx` | Demo 函数 |
| `apps/demo/src/components/ChartHoverShell.tsx` | Demo Tooltip 壳（基于 kit Tooltip） |

> 入场动画统一由 core 的 `<Animation playbook>` 驱动。

## 仪表盘示例

图表入场与持续动画统一用 `<Animation playbook>`，子节点写最终视觉值（可用命名 `id` 作为 target）。几何上：`sweep-flag=1`（顺时针），`large-arc-flag=0`（短弧），从 225° 顺时针 90° 到 315°。

```tsx
import { Animation, Path, Line, Text, Ellipse } from '@react-viz-composer/core';
import {
  ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, SEMANTIC_6, TEXT_COLOR,
} from './local'; // apps/charts 本地 barrel（不进 kit）

export function GaugeChart({ value = 72, min = 0, max = 100 }) {
  const cx = PLOT_WIDTH / 2;
  const cy = PLOT_HEIGHT - 30;
  const outerR = 130;
  const innerR = outerR * 0.7;
  const arcCenterR = (innerR + outerR) / 2;
  const startAngleDeg = 225;
  const totalArc = 90;
  const valueRatio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  function arcPath(r: number, fromRatio: number, toRatio: number): string { /* ... */ }
  function pointerPoints(ratio: number) { /* ... */ }

  return (
    <ChartFrame>
      <Path d={arcPath(arcCenterR, 0, 1)} fill="none" stroke="#f0f0f0"
        strokeWidth={outerR - innerR} />
      <Animation playbook={[
        {
          duration: 900, easing: 'easeOutCubic', targets: 'progress-arc',
          compute: ({ progress }) => ({ d: arcPath(arcCenterR, 0, valueRatio * progress) }),
        },
        {
          duration: 900, easing: 'easeOutCubic', targets: 'pointer',
          compute: ({ progress }) => ({ points: pointerPoints(valueRatio * progress) }),
        },
        {
          duration: 900, easing: 'easeOutCubic', targets: 'value-text',
          compute: ({ progress }) => ({
            text: String(Math.round(min + valueRatio * progress * (max - min))),
          }),
        },
      ]}>
        <Path id="progress-arc" d={arcPath(arcCenterR, 0, valueRatio)}
          fill="none" stroke={SEMANTIC_6[0]} strokeWidth={outerR - innerR} />
        <Line id="pointer" points={pointerPoints(valueRatio)}
          stroke={SEMANTIC_6[3]} strokeWidth={3} />
        <Text id="value-text" x={cx} y={cy - 8} text={String(value)}
          fontSize={28} fontWeight="bold" fill={TEXT_COLOR} textAlign="middle" />
      </Animation>
      <Ellipse cx={cx} cy={cy} rx={8} ry={8} fill={SEMANTIC_6[3]} />
      <Text x={cx} y={cy + 16} text={`/ ${max}`} fontSize={12}
        fill={TEXT_COLOR} textAlign="middle" />
    </ChartFrame>
  );
}
```

## 视口裁剪

ReactVizComposer 支持基于可见区域的节点裁剪，减少大数据量时的渲染压力：

```tsx
<ReactVizComposer
  engine="canvas"
  width={800}
  height={600}
  cullMargin={{ top: 50, right: 50, bottom: 50, left: 50 }}
>
  ...
</ReactVizComposer>
```

不传 `cullMargin` 时默认启用四边各 20% 的裁剪。裁剪在 CanvasRenderer 和 SVGRenderer 中生效：节点在视口外（含边距扩展）→ 跳过绘制 / 设置 `visibility: hidden`。Path 节点不做裁剪（保守策略）。

## 添加新图表流程

1. 在 `apps/charts/src/` 创建 `NewChart.tsx`，遵循图表开发模式
2. 在 `apps/charts/src/mockData.ts` 追加 mock 数据
3. 在 `apps/demo/src/components/ChartDemos.tsx` 添加 import 和 Demo 函数
4. 在 `apps/demo/src/App.tsx` 的 `buildGroups()` 中添加条目
5. 运行 `npx tsc --noEmit` 验证
