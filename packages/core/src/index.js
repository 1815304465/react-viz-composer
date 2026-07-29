/**
 * react-viz-composer —— 声明式 SVG/Canvas 混合渲染引擎
 *
 * 入口文件：导出根组件、所有形状组件、类型、引擎和 Context hooks
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
// 定义类组件
export { LinearGradient } from './shapes/definitions/LinearGradient';
export { RadialGradient } from './shapes/definitions/RadialGradient';
export { ClipPath } from './shapes/definitions/ClipPath';
export { Filter } from './shapes/definitions/Filter';
export { Mask } from './shapes/definitions/Mask';
// 容器组件
export { Group } from './shapes/containers/Group';
export { Animation } from './shapes/containers/Animation';
export { VizEvent } from './engine/types';
// 引擎（高级用户）
export { Model, Graph, SceneTree, EventSystem } from './engine';
export { CanvasRenderer, SVGRenderer, Renderer } from './engine';
// Context hooks
export { useViz, useVizFrame, useParentId, useSceneTree, useRegisterNode, useAnimAttrs, applyAnimAttrs, } from './context';
