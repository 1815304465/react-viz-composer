/**
 * react-viz-composer —— 声明式 SVG/Canvas 混合渲染引擎
 *
 * 入口：根组件、形状、引擎、Context hooks，以及半成品工具组件（components/）
 */

// 根组件
export { default as ReactVizComposer } from './ReactVizComposer';
export { default } from './ReactVizComposer';

// 形状组件
export { Rect } from './shapes/geometries/Rect';
export { Ellipse } from './shapes/geometries/Ellipse';
export { Line } from './shapes/geometries/Line';
export { Path } from './shapes/geometries/Path';
export { Text } from './shapes/geometries/Text';
export { Image } from './shapes/geometries/Image';
export { Points } from './shapes/geometries/Points';

// 定义类组件
export { LinearGradient } from './shapes/definitions/LinearGradient';
export { RadialGradient } from './shapes/definitions/RadialGradient';
export { ClipPath } from './shapes/containers/ClipPath';
export { Filter } from './shapes/containers/Filter';
export { Mask } from './shapes/containers/Mask';

// 容器组件
export { Group } from './shapes/containers/Group';
export { Animation } from './shapes/containers/Animation';

// 半成品工具组件（原 kit）
export {
  Axis,
  Grid,
  Tooltip,
  Legend,
  MarkLine,
  MarkPoint,
  MarkArea,
  Crosshair,
  Brush,
} from './components';
export type {
  AxisProps,
  AxisScale,
  BandScaleLike,
  LinearScaleLike,
  GridProps,
  TooltipProps,
  LegendProps,
  LegendItem,
  MarkLineProps,
  MarkPointProps,
  MarkAreaProps,
  CrosshairProps,
  BrushProps,
} from './components';

// 通用类型
export type {
  AnimStep, AnimAttribute, AnimEasing, AnimTarget, AnimComputeContext, AnimationHandle,
  ViewportCullMargin, Viewport,
  RectData, EllipseData, LineData, PathData, TextData, ImageData, PointsData,
  GroupData, AnimationData, ElementData, ElementType,
  Transform, Point, EngineType,
  GradientStop, LinearGradientData, RadialGradientData,
  ClipPathData, FilterData, FilterEffect, MaskData, MaskMode,
  GraphOptions, ElementRecord,
} from './engine/types';

export { VizEvent } from './engine/types';
export type { VizEventType, VizEventHandler, VizDragEvent, VizDragEventHandler } from './engine/types';

// 事件类型
export type { ShapeEventProps } from './shapes/events';

// 引擎（高级用户）
export { Model, Graph, SceneTree, EventSystem } from './engine';
export type { SceneNode, SceneListener, SceneChangeReason } from './engine';
export { CanvasRenderer, SVGRenderer, Renderer } from './engine';

// Context hooks
export {
  useViz,
  useVizFrame,
  useParentId,
  useSceneTree,
} from './context';
export type { IVizContext, IVizFrameContext } from './context';
