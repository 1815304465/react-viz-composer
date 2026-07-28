# ⚡ ReactVizComposer

Declarative SVG/Canvas hybrid rendering engine for React. Compose visualizations from low-level primitives — `Rect`, `Ellipse`, `Line`, `Path`, `Text`, `Image`, `Group`, `Animation` — with 48 built-in chart types, covering the full ECharts catalog.

[![npm version](https://img.shields.io/npm/v/react-viz-composer)](https://www.npmjs.com/package/react-viz-composer)
[![license](https://img.shields.io/npm/l/react-viz-composer)](./LICENSE)

## ✨ Features

- **Declarative Data-Driven** — Write JSX shapes, the engine handles rendering
- **Hybrid SVG/Canvas** — Choose `engine="svg"` for incremental DOM or `engine="canvas"` for full redraw + viewport culling
- **48 Built-in Charts** — Bar, Line, Scatter, Pie, Radar, Candlestick, Heatmap, Sankey, Treemap, Sunburst, and more
- **Zero-DOM Shapes** — Shape components are pure proxies that `return null`; all rendering happens in the engine layer
- **Synthetic Event System** — `onClick`, `onMouseEnter`, `onDrag`, etc. with `stopPropagation()` support
- **Animation System** — Declarative tween playbooks with grouping, looping, and watch triggers
- **Viewport Culling** — Automatic culling of off-screen elements in canvas mode
- **TypeScript First** — Full type definitions included

## 📦 Installation

```bash
npm install react-viz-composer
```

Requires `react` and `react-dom` as peer dependencies (>=18.0.0).

## 🚀 Quick Start

```tsx
import ReactVizComposer, { Rect, Text, Group } from 'react-viz-composer';

function MyFirstChart() {
  return (
    <ReactVizComposer engine="canvas" width={600} height={400}>
      <Rect x={50} y={50} width={100} height={200} fill="#1677ff" rx={4} />
      <Text x={100} y={270} text="Hello Viz!" fontSize={14} fill="#333" textAlign="middle" />
    </ReactVizComposer>
  );
}
```

### Using Built-in Charts

```tsx
import { BarChart } from 'react-viz-composer/charts';

function App() {
  return (
    <BarChart
      data={[
        { month: 'Jan', value: 120 },
        { month: 'Feb', value: 200 },
        { month: 'Mar', value: 150 },
      ]}
      onItemEnter={(d, evt) => console.log(d.month)}
      onItemLeave={() => {}}
    />
  );
}
```

## 📚 API

### `<ReactVizComposer>` Root Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `engine` | `'svg' \| 'canvas'` | `'svg'` | Rendering engine |
| `width` | `number \| string` | `'100%'` | Canvas width |
| `height` | `number \| string` | `'100%'` | Canvas height |
| `viewport` | `{ x, y, scale }` | — | Controlled viewport (pan/zoom) |
| `interactiveViewport` | `boolean` | `false` | Enable scroll-zoom + drag-pan |
| `onViewportChange` | `(v: Viewport) => void` | — | Viewport change callback |
| `autoSize` | `boolean` | `true` | ResizeObserver auto-resize |
| `debounceWait` | `number` | `120` | Resize debounce (ms) |
| `cullMargin` | `ViewportCullMargin` | `20%` | Culling margin |
| `canvasEventProps` | `ShapeEventProps` | — | Canvas blank-area events |

### Shape Components

| Component | Key Props |
|-----------|-----------|
| `<Rect>` | `x, y, width, height, rx, ry, fill, stroke, strokeWidth, opacity, clipPath, filter, mask` |
| `<Ellipse>` | `cx, cy, rx, ry, fill, stroke, strokeWidth, opacity, clipPath, filter, mask` |
| `<Line>` | `points: {x,y}[], stroke, strokeWidth, closed, clipPath, filter, mask` |
| `<Path>` | `d: string, fill, stroke, clipPath, filter, mask` |
| `<Text>` | `text, x, y, fontSize, fontFamily, fontWeight, fill, textAlign, textBaseline, filter, mask` |
| `<Image>` | `src, x, y, width, height, clipPath, filter, mask` |
| `<Group>` | `x, y, rotation, scaleX, scaleY, opacity, children, filter, mask` |
| `<Animation>` | `playbook: AnimStep[], autoPlay, children` |
| `<LinearGradient>` | `id, x1, y1, x2, y2, stops` |
| `<RadialGradient>` | `id, cx, cy, r, stops` |
| `<ClipPath>` | `id, shapeType, shapeData` |
| `<Filter>` | `id, effects: FilterEffect[]` |
| `<Mask>` | `id, shapeType, shapeData, maskMode` |

### Events

All shapes support React-style event props:

`onClick`, `onDoubleClick`, `onContextMenu`, `onMouseDown`, `onMouseUp`, `onMouseMove`, `onMouseEnter`, `onMouseLeave`, `onPointerDown`, `onPointerUp`, `onPointerMove`, `onPointerEnter`, `onPointerLeave`, `onTouchStart`, `onTouchEnd`, `onTouchMove`, `onWheel`, `onDragStart`, `onDrag`, `onDragEnd`

```tsx
<Rect
  x={10} y={10} width={100} height={50} fill="blue"
  onClick={(evt) => console.log('clicked at', evt.offsetX, evt.offsetY)}
  onMouseEnter={(evt) => evt.preventDefault()}
/>
```

### Filter Effects

```tsx
<Filter id="blur-3" effects={[{ type: 'blur', value: 3 }]} />
<Rect x={50} y={50} width={200} height={200} fill="blue" filter="url(#blur-3)" />
```

Supported: `blur`, `brightness`, `contrast`, `dropShadow`, `grayscale`, `opacity`, `saturate`, `sepia`, `hueRotate`.

### Mask

```tsx
<Mask id="circle-mask" shapeType="ellipse"
  shapeData={{ cx: 100, cy: 100, rx: 50, ry: 50 }} />
<Rect x={50} y={50} width={200} height={200} fill="blue" mask="url(#circle-mask)" />
```

### Animation

```tsx
<Animation
  playbook={[
    { attribute: 'height', from: 0, to: 200, duration: 600, easing: 'easeOut' },
    { attribute: 'opacity', from: 0, to: 1, duration: 400, group: 1 },
  ]}
  autoPlay
>
  <Rect x={50} y={50} width={100} height={0} fill="blue" />
</Animation>
```

## 📊 Built-in Charts

Import from `react-viz-composer/charts`:

| Category | Charts |
|----------|--------|
| **Basic** | BarChart, LineChart, ScatterChart, PieChart, DoughnutChart, AreaChart, StackedAreaChart, RadarChart, FunnelChart, HistogramChart, RoseChart, PolarBarChart, GaugeChart, LiquidFillChart, SingleAxisScatterChart |
| **Statistical** | BoxplotChart, ErrorBarChart, WaterfallChart, CandlestickChart, HeatmapChart, CalendarHeatmapChart, GanttChart, TimelineChart, ParallelCoordinatesChart, ThemeRiverChart, PictorialBarChart, DensityCloudChart, ContourChart, HorizontalBarChart, StackedBarChart, BidirectionalBarChart |
| **Hierarchy** | TreemapChart, SunburstChart, TreeChart, SankeyChart, ChordChart, VennChart, CircularGraphChart, NetworkGraphChart, WordCloudChart |
| **Composite** | ComboChart, BubbleChart, ExplorableScatterChart, CurvatureCombChart, StepLineChart, SmoothLineChart, EffectScatterChart |

All charts follow a unified API pattern with `data`, `onItemEnter`, `onItemLeave` props and support entry animations.

## 🏗️ Architecture

```
React JSX (Rect, Group, Line, ...)
    │  Components serialize props → JSON via VizContext
    ▼
SceneTree (nested JSON tree, dirty tracking)
    │  subscribe → syncFromSceneTree
    ▼
Model (flat index, worldMatrix cache, dirty flags)
    │  getTopLevelElements()
    ▼
Renderer (CanvasRenderer / SVGRenderer)
```

- **React Layer** — Shape components are pure proxies (`return null`), all rendering delegated to engine
- **Engine Layer** — Pure TypeScript, zero React dependency, independently testable
- **EventSystem** — Unified hit testing + bubbling on both SVG and Canvas

## 🔧 Advanced: Engine API

```tsx
import { Model, Graph, SceneTree, EventSystem, CanvasRenderer, SVGRenderer } from 'react-viz-composer';

// Direct engine access for custom integrations
const graph = new Graph({ engine: 'canvas' });
graph.mount(containerElement);
```

## 📄 License

MIT
