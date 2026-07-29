# ⚡ ReactVizComposer

Declarative SVG/Canvas hybrid rendering engine for React. Compose visualizations from low-level primitives — `Rect`, `Ellipse`, `Line`, `Path`, `Text`, `Image`, `Group`, `Animation`. The repo also ships 48 reference chart implementations under `apps/charts` (not published to npm).

[![npm version](https://img.shields.io/npm/v/react-viz-composer)](https://www.npmjs.com/package/react-viz-composer)
[![license](https://img.shields.io/npm/l/react-viz-composer)](./LICENSE)

## ✨ Features

- **Declarative Data-Driven** — Write JSX shapes, the engine handles rendering
- **Hybrid SVG/Canvas** — Choose `engine="svg"` for incremental DOM or `engine="canvas"` for full redraw + viewport culling
- **Chart Building Kit** — `ChartFrame`, `Axis`, scales, palette via `@react-viz-composer/kit` (also re-exported from `react-viz-composer`)
- **Zero-DOM Shapes** — Shape components are pure proxies that `return null`; all rendering happens in the engine layer
- **Synthetic Event System** — `onClick`, `onMouseEnter`, `onDrag`, etc. with `stopPropagation()` support
- **Animation System** — Declarative tween playbooks with grouping, looping, and watch triggers
- **Viewport Culling** — Automatic culling of off-screen elements in canvas mode
- **TypeScript First** — Full type definitions included

## 📦 Installation

```bash
npm install react-viz-composer
# or install packages separately:
# npm install @react-viz-composer/core @react-viz-composer/kit
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

### Building a Chart with the Kit

```tsx
import { Animation, Rect } from 'react-viz-composer';
import {
  ChartFrame, PLOT_WIDTH, PLOT_HEIGHT,
  scaleBand, scaleLinear, Axis, Grid, SEMANTIC_6,
} from 'react-viz-composer';
// or: from '@react-viz-composer/kit'

function SimpleBarChart({ data }) {
  const categories = data.map((d) => d.month);
  const xScale = scaleBand(categories, [0, PLOT_WIDTH], 0.3);
  const yScale = scaleLinear([0, 300], [PLOT_HEIGHT, 0]);

  return (
    <ChartFrame>
      <Grid scale={yScale} orient="y" />
      <Animation playbook={[
        { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children' },
      ]}>
        {data.map((d) => (
          <Rect
            key={d.month}
            x={xScale(d.month)}
            y={yScale(d.value)}
            width={xScale.bandwidth}
            height={PLOT_HEIGHT - yScale(d.value)}
            fill={SEMANTIC_6[0]}
          />
        ))}
      </Animation>
      <Axis scale={xScale} orient="bottom" />
      <Axis scale={yScale} orient="left" />
    </ChartFrame>
  );
}
```

Reference chart implementations (Bar, Line, Pie, Sankey, …) live in the monorepo at `apps/charts` and power the demo app — they are **not** part of the published npm package.
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
| `<Rect>` | `x, y, width, height, rx, ry, fill, stroke, strokeWidth, opacity` |
| `<Ellipse>` | `cx, cy, rx, ry, fill, stroke, strokeWidth, opacity` |
| `<Line>` | `points: {x,y}[], stroke, strokeWidth, closed` |
| `<Path>` | `d: string, fill, stroke` |
| `<Text>` | `text, x, y, fontSize, fontFamily, fontWeight, fill, textAlign, textBaseline` |
| `<Image>` | `src, x, y, width, height` |
| `<Points>` | `cx: number[], cy: number[], rx?, ry?, fill?, stroke?` |
| `<Group>` | `x, y, rotation, scaleX, scaleY, opacity, children` |
| `<Animation>` | `playbook: AnimStep[], autoPlay, children` |
| `<LinearGradient>` | `id` (required for `fill="url(#id)"`), `x1, y1, x2, y2, stops` |
| `<RadialGradient>` | `id` (required for `fill="url(#id)"`), `cx, cy, r, stops` |
| `<ClipPath>` | `clip: ReactElement, children` |
| `<Filter>` | `effects: FilterEffect[], children` |
| `<Mask>` | `mask: ReactElement, maskMode?, children` |

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

### ClipPath / Filter / Mask (containers)

Clip, filter, and mask apply to their **children** — no `url(#id)` props on geometries.

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

Filter effects: `blur`, `brightness`, `contrast`, `dropShadow`, `grayscale`, `opacity`, `saturate`, `sepia`, `hueRotate`.

### Animation

Children use **final visual props**; `from` is the entry start. `targets: 'children'` pierces ClipPath / Filter / Mask; named `id` targets also work.

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

## 📦 Packages

| Package | Role |
|---------|------|
| `react-viz-composer` / `@react-viz-composer/core` | Engine + shape primitives |
| `@react-viz-composer/kit` | Chart building blocks (Frame, Axis, scales, palette) |
| `apps/charts` (repo only) | 48 reference chart implementations for demos |

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
