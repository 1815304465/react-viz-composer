/**
 * react-viz-composer —— 声明式 SVG/Canvas 混合渲染引擎
 *
 * 入口文件：统一 re-export @react-viz-composer/core + utilities + charts
 * 这是向后兼容的 umbrella 包，推荐直接使用
 *   - @react-viz-composer/core → 渲染引擎 + 基础形状
 *   - @react-viz-composer/utilities → 纯函数工具（scales, palette, easings）
 *   - @react-viz-composer/components → 半成品图表构件
 *   - @react-viz-composer/charts → 48 个完整图表
 */

// Re-export everything from core
export {
  default as ReactVizComposer,
  default,
  Rect,
  Ellipse,
  Line,
  Path,
  Text,
  Image,
  LinearGradient,
  RadialGradient,
  ClipPath,
  Filter,
  Mask,
  Group,
  Animation,
  useViz,
  useVizFrame,
  useParentId,
  useSceneTree,
  useRegisterNode,
  useAnimAttrs,
  applyAnimAttrs,
  VizEvent,
  Model,
  Graph,
  SceneTree,
  EventSystem,
  CanvasRenderer,
  SVGRenderer,
  Renderer,
} from '@react-viz-composer/core';

export type {
  AnimStep,
  AnimAttribute,
  AnimEasing,
  AnimationHandle,
  ViewportCullMargin,
  Viewport,
  RectData,
  EllipseData,
  LineData,
  PathData,
  TextData,
  ImageData,
  GroupData,
  AnimationData,
  ElementData,
  ElementType,
  Transform,
  Point,
  EngineType,
  GradientStop,
  LinearGradientData,
  RadialGradientData,
  ClipPathData,
  FilterData,
  FilterEffect,
  MaskData,
  MaskMode,
  GraphOptions,
  ElementRecord,
  VizEventType,
  VizEventHandler,
  VizDragEvent,
  VizDragEventHandler,
  ShapeEventProps,
  SceneNode,
  SceneListener,
  SceneChangeReason,
  IVizContext,
  IVizFrameContext,
} from '@react-viz-composer/core';

// Re-export pure utilities
export {
  scaleLinear,
  scaleBand,
  CATEGORY_12,
  SEMANTIC_6,
  KLINE_UP,
  KLINE_DOWN,
  AXIS_COLOR,
  GRID_COLOR,
  TEXT_COLOR,
  TEXT_LIGHT,
  colorAt,
  easeOutCubic,
  animValue,
  animSize,
  hoverStrokeWidth,
  hoverOpacity,
} from '@react-viz-composer/utilities';
export type { LinearScale, BandScale } from '@react-viz-composer/utilities';
