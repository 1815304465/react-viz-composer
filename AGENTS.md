# ReactVizComposer

声明式 SVG/Canvas 混合渲染引擎。将图表拆解为 Rect、Ellipse、Line、Path、Text、Image、Group、Animation 等底层形状，通过 React Context 投递 JSON 数据给渲染引擎，实现"声明式数据驱动 + 引擎统一渲染"的二维可视化框架。

目前基于此底层组件实现了 **48 种二维图表**，覆盖 ECharts 全部常见品类。

## 架构

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
├── index.tsx                    # React 层：根组件 + 对外入口
├── context.ts                   # React 层：VizContext / FrameContext / AnimationContext
│
├── shapes/                      # React 层：形状组件（纯代理，return null）
│   ├── index.ts                 # 统一导出
│   ├── events.ts                # 事件 props 定义与映射
│   ├── register.ts              # 注册 hook + shapePropKeys + shapeProps
│   ├── geometries/              # 几何形状（6 个）
│   │   ├── Rect.tsx / Ellipse.tsx / Line.tsx
│   │   ├── Path.tsx / Text.tsx / Image.tsx
│   ├── containers/              # 容器组件（2 个）
│   │   ├── Group.tsx / Animation.tsx
│   └── definitions/             # 定义类组件（5 个）
│       ├── LinearGradient.tsx / RadialGradient.tsx
│       ├── ClipPath.tsx / Filter.tsx / Mask.tsx
│
└── engine/                      # 引擎层（纯 TS，零 React 依赖）
    ├── index.ts                 # 统一导出
    ├── types.ts                 # 所有类型定义
    ├── Model.ts                 # M：数据层
    ├── graph/                   # C：控制层
    │   ├── Graph.ts             # 总调度器
    │   ├── SceneTree.ts        # React ↔ 引擎桥梁
    │   └── EventSystem.ts      # 合成事件系统
    ├── renderer/                # V：渲染层
    │   ├── Renderer.ts         # 抽象基类
    │   ├── CanvasRenderer.ts   # Canvas 2D 渲染
    │   └── SVGRenderer.ts      # SVG 渲染
    └── utils/                   # 通用工具（无状态纯函数）
        ├── index.ts             # 统一导出
        ├── Scheduler.ts         # rAF 调度循环 + Job 队列
        ├── constants/           # 常量定义
        │   ├── index.ts / matrix.ts / paintOrder.ts
        │   ├── animation.ts / opacity.ts
        ├── maths.ts             # 矩阵变换 + 几何计算
        ├── colors.ts            # 颜色解析 + 渐变
        ├── viewport.ts          # 视口缩放/平移
        ├── opacity.ts           # 透明度
        ├── paintOrder.ts        # 绘制顺序
        ├── bounds.ts            # 包围盒估算
        ├── elements.ts          # 元素可见性 / 后代判断
        ├── shapes.ts            # 形状解析
        ├── pathCache.ts         # Path2D LRU 缓存
        └── animations.ts        # 动画工具
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

| 组件 | 关键属性 | 新增属性 |
|------|---------|---------|
| `<Rect>` | x, y, width, height, rx, ry, fill, stroke, strokeWidth, opacity, clipPath | filter, mask |
| `<Ellipse>` | cx, cy, rx, ry, fill, stroke, ... | filter, mask |
| `<Line>` | points: { x, y }[], stroke, strokeWidth, closed | filter, mask |
| `<Path>` | d: string (SVG path 命令), fill, stroke | filter, mask |
| `<Text>` | x, y, text, fontSize, fontFamily, fontWeight, fill, textAlign, textBaseline | filter, mask |
| `<Image>` | x, y, width, height, src | filter, mask |
| `<Group>` | x, y, rotation, scaleX, scaleY, opacity, children | filter, mask |
| `<Animation>` | playbook: AnimStep[], watch?: WatchConfig, autoPlay, children | - |
| `<LinearGradient>` | id, x1, y1, x2, y2, stops | - |
| `<RadialGradient>` | id, cx, cy, r, stops | - |
| `<ClipPath>` | id, shapeType, shapeData | - |
| `<Filter>` | id, effects: FilterEffect[] | **新增** |
| `<Mask>` | id, shapeType, shapeData, maskMode? | **新增** |

### 事件

所有形状（包括 Group）支持 React 风格事件 props：

`onClick` / `onDoubleClick` / `onContextMenu` / `onMouseDown` / `onMouseUp` / `onMouseMove` / `onMouseEnter` / `onMouseLeave` / `onPointerDown` / `onPointerUp` / `onPointerMove` / `onPointerEnter` / `onPointerLeave` / `onTouchStart` / `onTouchEnd` / `onTouchMove` / `onWheel` / `onDragStart` / `onDrag` / `onDragEnd`

事件通过 EventSystem 统一处理，非 React 合成事件。支持 `evt.stopPropagation()` 阻止冒泡，`evt.preventDefault()` 阻止默认行为。

### Filter（滤镜）

定义滤镜效果，对标 Canvas 2D `ctx.filter`（CSS filter 字符串）。支持 `blur` / `brightness` / `contrast` / `dropShadow` / `grayscale` / `opacity` / `saturate` / `sepia` / `hueRotate`。

```tsx
<Filter id="my-blur" effects={[{ type: 'blur', value: 3 }]} />
<Filter id="combo" effects={[
  { type: 'dropShadow', value: 4, offsetX: 2, offsetY: 2, color: 'rgba(0,0,0,0.3)' },
  { type: 'grayscale', value: 50 },
]} />
<Rect x={50} y={50} width={200} height={200} fill="blue" filter="url(#my-blur)" />
```

### Mask（遮罩）

软遮罩（通过透明度/亮度控制可见程度），区别于 ClipPath 的硬裁剪。支持 `alpha` 和 `luminance` 两种模式。

```tsx
<Mask id="circle-mask" shapeType="ellipse"
  shapeData={{ cx: 100, cy: 100, rx: 50, ry: 50 }} />
<Rect x={50} y={50} width={200} height={200} fill="blue" mask="url(#circle-mask)" />
```

### Animation（动画容器）

声明式 Tween 动画容器。通过 `playbook` 剧本定义动画步骤，支持分组并行/串行、循环、watch 监听触发、命令式 API（play/pause/resume/cancel）。

```tsx
<Animation playbook={[
  { attribute: 'height', from: 0, to: 200, duration: 600, easing: 'easeOut' },
  { attribute: 'scaleX', from: 1, to: 1.5, duration: 400, group: 1 },
]} onComplete={() => console.log('done')}>
  <Rect x={50} y={50} width={100} height={0} fill="blue" />
</Animation>
```

可动画属性：`x` / `y` / `rotation` / `scaleX` / `scaleY`（transform 类）和 `width` / `height` / `opacity` / `rx` / `ry` / `cx` / `cy` / `strokeWidth` / `fill` / `stroke` / `fontSize`（形状属性类）。

## 图表开发模式

所有图表遵循统一模式，以 BarChart 为例：

```tsx
import { Rect, Text } from '../components/ReactVizComposer';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animSize } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { scaleBand, scaleLinear } from './shared/scales';
import { Axis, Grid } from './shared/Axis';
import { SEMANTIC_6 } from './shared/palette';

interface BarItem {
  month: string;
  value: number;
}

interface Props extends ChartItemHoverProps<BarItem> {
  data?: BarItem[];
  color?: string;
}

export function BarChart(props: Props) {
  const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: BarItem) => d.month,
  );

  const dataset = data ?? [/* 默认数据 */];
  const categories = dataset.map((d) => d.month);

  const xScale = scaleBand(categories, [0, PLOT_WIDTH], 0.3);
  const yScale = scaleLinear([0, maxValue * 1.1], [PLOT_HEIGHT, 0]);

  return (
    <ChartFrame>
      {(progress) => (
        <>
          <Grid scale={yScale} orient="y" />

          {dataset.map((d) => {
            const h = animSize(fullHeight, progress);
            const hovered = isHovering(d.month);
            return (
              <Rect
                key={d.month}
                x={xScale(d.month)}
                y={PLOT_HEIGHT - h}
                width={xScale.bandwidth}
                height={h}
                fill={color}
                strokeWidth={hoverStrokeWidth(1, hovered)}
                {...bindHover(d)}
              />
            );
          })}

          <Axis scale={xScale} orient="bottom" />
          <Axis scale={yScale} orient="left" />
        </>
      )}
    </ChartFrame>
  );
}
```

### 关键约定

1. **ChartFrame 包裹**：所有图表必须包裹在 `<ChartFrame>` 中，使用 `{progress => ...}` render prop
2. **入场动画**：使用 `animValue(value, progress)` / `animSize(value, progress)` 实现 0→目标值的过渡
3. **Hover 支持**：extends `ChartItemHoverProps<T>`，使用 `useChartItemHover` + `bindHover` + `isHovering`
4. **默认数据**：所有 data prop 可选，缺失时使用内置默认数据确保可独立渲染
5. **Named + Default 导出**：`export function ChartName` + `export default ChartName`
6. **mockData 集中管理**：所有 mock 数据定义在 `src/charts/shared/mockData.ts`

## Demo 模式

每个图表在 `src/components/ChartDemos.tsx` 中有一个 Demo 函数，包裹 `ChartHoverShell` 提供 Tooltip：

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
| `charts/shared/ChartFrame.tsx` | 图表外框（600×400 Canvas），内置 EntryProgressProvider |
| `charts/shared/useEntryProgress.ts` | 入场动画 hook（0→1 progress，easeOutCubic 缓动） |
| `charts/shared/scales.ts` | scaleLinear / scaleBand（无 d3 依赖） |
| `charts/shared/Axis.tsx` | 坐标轴组件（bottom/left/top/right 四方向） |
| `charts/shared/chartEvents.ts` | useChartItemHover hook + hoverStrokeWidth/hoverOpacity 工具 |
| `charts/shared/palette.ts` | 12 色分类色板 + 6 色语义色板 + K线涨跌色 |
| `components/ChartDemos.tsx` | 所有图表的 Demo 函数，包裹 ChartHoverShell 提供 Tooltip |
| `components/ChartHoverShell.tsx` | App 层 Tooltip 浮层 |

## 仪表盘示例

```tsx
import { Path, Line, Text, Ellipse } from '../components/ReactVizComposer';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { animValue } from './shared/useEntryProgress.ts';
import { SEMANTIC_6, AXIS_COLOR, TEXT_COLOR } from './shared/palette';

export function GaugeChart({ value = 72, min = 0, max = 100 }) {
  const cx = PLOT_WIDTH / 2;
  const cy = PLOT_HEIGHT - 30;
  const outerR = 130;
  const innerR = outerR * 0.7;
  const startAngleDeg = 225;       // 左下
  const endAngleDeg = 315;         // 右下（等价 -45）
  const totalArc = endAngleDeg - startAngleDeg; // = 90（顺时针）

  const valueRatio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  // 顺时针弧线 SVG path
  function arcPath(r: number, fromRatio: number, toRatio: number): string {
    const fromDeg = startAngleDeg + totalArc * fromRatio;
    const toDeg = startAngleDeg + totalArc * toRatio;
    const fromRad = degToRad(fromDeg);
    const toRad = degToRad(toDeg);
    const x0 = cx + r * Math.cos(fromRad);
    const y0 = cy + r * Math.sin(fromRad);
    const x1 = cx + r * Math.cos(toRad);
    const y1 = cy + r * Math.sin(toRad);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  }

  return (
    <ChartFrame entryDuration={900}>
      {(progress) => (
        <>
          {/* 轨道 */}
          <Path d={arcPath(outerR, 0, 1)} fill="none" stroke="#f0f0f0"
            strokeWidth={outerR - innerR} zIndex={0} />
          {/* 进度 */}
          <Path d={arcPath(innerR, 0, animValue(valueRatio, progress))}
            fill="none" stroke={SEMANTIC_6[0]}
            strokeWidth={outerR - innerR} zIndex={1} />
          {/* 指针 */}
          {(() => {
            const ratio = animValue(valueRatio, progress);
            const deg = startAngleDeg + totalArc * ratio;
            const rad = degToRad(deg);
            const px = cx + (innerR - 20) * Math.cos(rad);
            const py = cy + (innerR - 20) * Math.sin(rad);
            return <Line points={[{ x: cx, y: cy }, { x: px, y: py }]}
              stroke={SEMANTIC_6[3]} strokeWidth={3} />;
          })()}
          <Ellipse cx={cx} cy={cy} rx={8} ry={8} fill={SEMANTIC_6[3]} />
          <Text x={cx} y={cy - 8} text={String(Math.round(animValue(value, progress)))}
            fontSize={28} fontWeight="bold" fontFamily="sans-serif" fill={TEXT_COLOR}
            textAlign="middle" />
          <Text x={cx} y={cy + 16} text={`/ ${max}`} fontSize={12}
            fontFamily="sans-serif" fill={TEXT_COLOR} textAlign="middle" />
        </>
      )}
    </ChartFrame>
  );
}
```

关键点：`sweep-flag=1`（顺时针），`large-arc-flag=0`（短弧），从 225° 顺时针 90° 到 315°，走过下半圆。

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

1. 在 `src/charts/` 创建 `NewChart.tsx`，遵循图表开发模式
2. 在 `src/charts/shared/mockData.ts` 追加 mock 数据
3. 在 `src/components/ChartDemos.tsx` 添加 import 和 Demo 函数
4. 在 `src/App.tsx` 的 `buildGroups()` 中添加条目
5. 运行 `npx tsc --noEmit` 验证
