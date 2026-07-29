/**
 * VizEvent —— 自定义合成事件对象
 *
 * 类似 React 的 SyntheticEvent，包含原生事件引用和自定义冒泡控制。
 * 事件在容器上代理执行，不依赖浏览器原生冒泡。
 */
export class VizEvent {
    type;
    originalEvent;
    /** 相对于渲染容器的坐标 */
    offsetX;
    offsetY;
    /** 事件最初触发的元素 id */
    target;
    /** 当前冒泡阶段所在的元素 id */
    currentTarget;
    _propagationStopped = false;
    _defaultPrevented = false;
    constructor(type, nativeEvent, targetId, offsetX, offsetY) {
        this.type = type;
        this.originalEvent = nativeEvent;
        this.target = targetId;
        this.currentTarget = targetId;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }
    /** 停止冒泡，后续父级元素的事件处理器不再执行 */
    stopPropagation() {
        this._propagationStopped = true;
    }
    /** 阻止原生浏览器默认行为 */
    preventDefault() {
        this._defaultPrevented = true;
        this.originalEvent.preventDefault();
    }
    get isPropagationStopped() {
        return this._propagationStopped;
    }
    get isDefaultPrevented() {
        return this._defaultPrevented;
    }
}
/* ---- 上下文暴露给子组件的 API ---- */
// 注：新的 IVizContext（register / unregister / update）见 ../VizContext.tsx
