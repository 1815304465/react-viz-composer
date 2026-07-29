/**
 * 形状组件支持的事件 prop 名列表
 *
 * 规则：此列表仅包含引擎实际能分发的 VizEventType 对应的 React 风格事件。
 * 未被 EventSystem 覆盖的类型（如 onCopy、onKeyDown、onFocus 等）不应在此声明——
 * 引擎不负责这些 DOM 级事件的分发。
 */
const VIZ_SHAPE_EVENT_PROP_NAMES = [
    /* ---- 鼠标 / 指针（由引擎统一代理） ---- */
    'onClick',
    'onDoubleClick',
    'onContextMenu',
    'onMouseDown',
    'onMouseUp',
    'onMouseMove',
    'onMouseEnter',
    'onMouseLeave',
    /* ---- Pointer 事件（兼容映射到 mouse*） ---- */
    'onPointerDown',
    'onPointerUp',
    'onPointerMove',
    'onPointerEnter',
    'onPointerLeave',
    /* ---- Touch 事件（兼容映射到 mouse*） ---- */
    'onTouchStart',
    'onTouchEnd',
    'onTouchMove',
    /* ---- 滚轮 ---- */
    'onWheel',
    /* ---- Viz 拖拽（自定义合成事件） ---- */
    'onDragStart',
    'onDrag',
    'onDragEnd',
];
/** React 事件 prop → EventSystem 内部 VizEventType 映射 */
const REACT_EVENT_TO_VIZ_TYPE = {
    onClick: 'click',
    onDoubleClick: 'dblclick',
    onContextMenu: 'contextmenu',
    onMouseDown: 'mousedown',
    onMouseUp: 'mouseup',
    onMouseMove: 'mousemove',
    onMouseEnter: 'mouseenter',
    onMouseLeave: 'mouseleave',
    onPointerDown: 'mousedown',
    onPointerUp: 'mouseup',
    onPointerMove: 'mousemove',
    onPointerEnter: 'mouseenter',
    onPointerLeave: 'mouseleave',
    onTouchStart: 'mousedown',
    onTouchEnd: 'mouseup',
    onTouchMove: 'mousemove',
    onWheel: 'wheel',
    onDragStart: 'dragstart',
    onDrag: 'drag',
    onDragEnd: 'dragend',
};
/** 合并映射到 mousedown 的 prop */
const MOUSE_DOWN_EVENT_PROPS = [
    'onMouseDown', 'onPointerDown', 'onTouchStart',
];
/* ========== 事件处理函数 ========== */
import { pick } from 'lodash-es';
const NOOP = () => { };
/** 合并多个 VizEventHandler 为单一回调 */
function combineHandlers(...handlers) {
    const active = handlers.filter(Boolean);
    if (active.length === 0)
        return undefined;
    if (active.length === 1)
        return active[0];
    return (evt) => { active.forEach((fn) => fn(evt)); };
}
/** 判断事件 props 中是否注册了 Viz 拖拽 */
function hasVizDragHandlers(eventProps) {
    return !!(eventProps.onDrag || eventProps.onDragEnd || eventProps.onDragStart);
}
/** 判断是否需要绑定 mousedown 入口 */
function needsMouseDownBinding(eventProps) {
    return hasVizDragHandlers(eventProps)
        || MOUSE_DOWN_EVENT_PROPS.some((key) => eventProps[key]);
}
/** 从 props 中提取事件 handler */
function pickShapeEventProps(props) {
    return pick(props, VIZ_SHAPE_EVENT_PROP_NAMES);
}
/** 将 React 风格事件 props 转为 EventSystem 标准事件表 */
function buildShapeEvents(eventProps, handleMouseDown) {
    const events = {};
    const buckets = new Map();
    for (const reactName of VIZ_SHAPE_EVENT_PROP_NAMES) {
        const vizType = REACT_EVENT_TO_VIZ_TYPE[reactName];
        if (!vizType)
            continue;
        const handler = eventProps[reactName];
        if (handler) {
            const list = buckets.get(vizType) ?? [];
            list.push(handler);
            buckets.set(vizType, list);
        }
    }
    for (const [vizType, handlers] of buckets) {
        events[vizType] = combineHandlers(...handlers);
    }
    if (handleMouseDown && needsMouseDownBinding(eventProps)) {
        events.mousedown = handleMouseDown;
    }
    return events;
}
export { VIZ_SHAPE_EVENT_PROP_NAMES, REACT_EVENT_TO_VIZ_TYPE, MOUSE_DOWN_EVENT_PROPS, hasVizDragHandlers, needsMouseDownBinding, pickShapeEventProps, buildShapeEvents, NOOP as SHAPE_EVENT_NOOP, };
