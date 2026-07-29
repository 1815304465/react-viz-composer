# ⚡ ReactVizComposer

声明式 SVG/Canvas 混合渲染引擎。将可视化拆解为 `Rect`、`Ellipse`、`Line`、`Path`、`Text`、`Image`、`Group`、`Animation` 等底层形状，通过 React Context 投递 JSON 数据给渲染引擎，实现"声明式数据驱动 + 引擎统一渲染"的二维可视化框架。仓库 `apps/charts` 中另有 47 种参考图表实现（不随 npm 发布）。

[![npm version](https://img.shields.io/npm/v/react-viz-composer)](https://www.npmjs.com/package/react-viz-composer)
[![license](https://img.shields.io/npm/l/react-viz-composer)](./LICENSE)

## ✨ 特性

- **声明式数据驱动** — 写 JSX 描述形状，引擎负责渲染
- **SVG/Canvas 双引擎** — `engine="svg"` 增量 DOM 更新，`engine="canvas"` 全量重绘 + 视口裁剪
- **构图积木 Kit** — `Axis`、`Grid`、`Tooltip`、`Legend`、标注、`Crosshair`、`Brush`，通过 `@react-viz-composer/kit`（亦由 `react-viz-composer` 再导出）。`ChartFrame` / scales / 色板仅在仓库 `apps/charts` 示例中
- **零 DOM 形状组件** — 形状组件是纯代理（`return null`），渲染完全在引擎层进行
- **合成事件系统** — `onClick`、`onMouseEnter`、`onDrag` 等，支持 `stopPropagation()` 阻止冒泡
- **声明式动画** — Tween 剧本，支持分组并行/串行、循环、watch 触发
- **视口裁剪** — Canvas 模式下自动裁剪视口外元素
- **TypeScript 优先** — 完整类型定义

## 📦 安装

```bash
npm install react-viz-composer
# 或分别安装：
# npm install @react-viz-composer/core @react-viz-composer/kit
```

需要 `react` 和 `react-dom` 作为 peer dependencies（>=18.0.0）。

## 🚀 快速开始

```tsx
import ReactVizComposer, { Rect, Text, Group } from 'react-viz-composer';

function MyFirstChart() {
  return (
    <ReactVizComposer engine="canvas" width={600} height={400}>
      <Rect x={50} y={50} width={100} height={200} fill="#1677ff" rx={4} />
      <Text x={100} y={270} text="你好 Viz！" fontSize={14} fill="#333" textAlign="middle" />
    </ReactVizComposer>
  );
}
```

### 用 Kit 组合图表

发布包提供形状 + kit 叠加层。图框、scale、色板是 **`apps/charts` 参考辅助**（不进 npm）：

```tsx
import ReactVizComposer, { Animation, Rect } from 'react-viz-composer';
import { Axis, Grid } from 'react-viz-composer';
// ChartFrame / scaleBand / SEMANTIC_6 → 仅 apps/charts（见仓库 demo）

function SimpleBarChart({ data, xScale, yScale, plotHeight, color }) {
  return (
    <ReactVizComposer engine="svg" width={600} height={400}>
      <Grid scale={yScale} orient="y" length={560} />
      <Animation playbook={[
        { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children' },
      ]}>
        {data.map((d) => (
          <Rect
            key={d.month}
            x={xScale(d.month)}
            y={yScale(d.value)}
            width={xScale.bandwidth}
            height={plotHeight - yScale(d.value)}
            fill={color}
          />
        ))}
      </Animation>
      <Axis scale={xScale} orient="bottom" length={560} />
      <Axis scale={yScale} orient="left" length={plotHeight} />
    </ReactVizComposer>
  );
}
```

参考图表实现（柱状图、折线图、饼图、桑基图等）位于仓库 `apps/charts`，供 demo 使用，**不随 npm 包发布**。

## 📚 API

### `<ReactVizComposer>` 根组件

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `engine` | `'svg' \| 'canvas'` | `'svg'` | 渲染引擎 |
| `width` | `number \| string` | `'100%'` | 画布宽度 |
| `height` | `number \| string` | `'100%'` | 画布高度 |
| `viewport` | `{ x, y, scale }` | — | 受控视口（平移/缩放） |
| `interactiveViewport` | `boolean` | `false` | 启用滚轮缩放 + 拖拽平移 |
| `onViewportChange` | `(v: Viewport) => void` | — | 视口变化回调 |
| `autoSize` | `boolean` | `true` | ResizeObserver 自动适配 |
| `debounceWait` | `number` | `120` | resize 防抖（ms） |
| `cullMargin` | `ViewportCullMargin` | `20%` | 裁剪边距 |
| `canvasEventProps` | `ShapeEventProps` | — | 画布空白区域事件 |

### 形状组件

| 组件 | 关键属性 |
|------|---------|
| `<Rect>` | `x, y, width, height, rx, ry, fill, stroke, strokeWidth, opacity` |
| `<Ellipse>` | `cx, cy, rx, ry, fill, stroke, strokeWidth, opacity` |
| `<Line>` | `points: {x,y}[], stroke, strokeWidth, closed` |
| `<Path>` | `d: string, fill, stroke` |
| `<Text>` | `text, x, y, fontSize, fontFamily, fontWeight, fill, textAlign, textBaseline` |
| `<Image>` | `src, x, y, width, height` |
| `<Points>` | `cx: number[], cy: number[], rx?, ry?, fill?, stroke?` |
| `<Group>` | `x, y, rotation, scaleX, scaleY, opacity, children` |
| `<Animation>` | `playbook: AnimStep[], autoPlay, children` |
| `<LinearGradient>` | `id`（供 `fill="url(#id)"` 引用）, `x1, y1, x2, y2, stops` |
| `<RadialGradient>` | `id`（供 `fill="url(#id)"` 引用）, `cx, cy, r, stops` |
| `<ClipPath>` | `clip: ReactElement, children` |
| `<Filter>` | `effects: FilterEffect[], children` |
| `<Mask>` | `mask: ReactElement, maskMode?, children` |

### 事件

所有形状支持 React 风格事件 props：

`onClick`、`onDoubleClick`、`onContextMenu`、`onMouseDown`、`onMouseUp`、`onMouseMove`、`onMouseEnter`、`onMouseLeave`、`onPointerDown`、`onPointerUp`、`onPointerMove`、`onPointerEnter`、`onPointerLeave`、`onTouchStart`、`onTouchEnd`、`onTouchMove`、`onWheel`、`onDragStart`、`onDrag`、`onDragEnd`

```tsx
<Rect
  x={10} y={10} width={100} height={50} fill="blue"
  onClick={(evt) => console.log('点击坐标', evt.offsetX, evt.offsetY)}
  onMouseEnter={(evt) => evt.preventDefault()}
/>
```

### ClipPath / Filter / Mask（容器）

裁剪、滤镜、遮罩作用于各自的 **children** — 几何形状上不再使用 `url(#id)` 字符串 props。

```tsx
<ClipPath clip={<Ellipse cx={100} cy={100} rx={50} ry={50} />}>
  <Path d="..." />
</ClipPath>

<Filter effects={[{ type: 'blur', value: 3 }]}>
  <Rect x={50} y={50} width={200} height={200} fill="blue" />
</Filter>

<Mask mask={<Ellipse cx={100} cy={100} rx={50} ry={50} />}>
  <Rect x={50} y={50} width={200} height={200} fill="blue" />
</Mask>
```

滤镜效果：`blur`、`brightness`、`contrast`、`dropShadow`、`grayscale`、`opacity`、`saturate`、`sepia`、`hueRotate`。

### 动画

子节点写**最终视觉 props**；`from` 为入场起点。`targets: 'children'` 会穿透 ClipPath / Filter / Mask；也可用命名 `id` 作为 target。

```tsx
<Animation
  playbook={[
    { attribute: 'height', from: 0, duration: 600, easing: 'easeOut', targets: 'children' },
    { attribute: 'opacity', from: 0, duration: 400, group: 1, targets: 'children' },
  ]}
  autoPlay
>
  <Rect x={50} y={50} width={100} height={200} fill="blue" />
</Animation>
```

## 📦 包结构

| 包 | 职责 |
|----|------|
| `react-viz-composer` / `@react-viz-composer/core` | 引擎 + 形状原语 |
| `@react-viz-composer/kit` | Axis、Grid、Tooltip、Legend、标注、Crosshair、Brush |
| `apps/charts`（仅仓库） | 47 种参考图表 + ChartFrame / scales / 色板 |

## 🏗️ 架构

```
React JSX（Rect、Group、Line 等）
    │  组件将 props 序列化为 JSON → VizContext 投递
    ▼
SceneTree（嵌套 JSON 树，脏标记管理）
    │  subscribe → syncFromSceneTree
    ▼
Model（扁平索引、worldMatrix 缓存、脏标记）
    │  getTopLevelElements()
    ▼
Renderer（CanvasRenderer / SVGRenderer）
```

- **React 层** — 形状组件是纯代理（`return null`），渲染全部委托给引擎
- **引擎层** — 纯 TypeScript，零 React 依赖，可独立测试
- **EventSystem** — SVG/Canvas 统一命中检测 + 冒泡

## 🔧 高级：引擎 API

```tsx
import { Model, Graph, SceneTree, EventSystem, CanvasRenderer, SVGRenderer } from 'react-viz-composer';

// 直接访问引擎层，用于自定义集成
const graph = new Graph({ engine: 'canvas' });
graph.mount(containerElement);
```

## 📄 License

MIT
