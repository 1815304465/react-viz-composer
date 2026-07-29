import { resolveShapeProps, RECT_DATA_KEYS, useShapeElement } from '../register';
/**
 * Rect —— 矩形形状组件（纯代理）
 * 不渲染任何 DOM，只将 props 拆解为 JSON 投递到 SceneTree
 */
function Rect(props) {
    const { id, data, eventProps } = resolveShapeProps(props, RECT_DATA_KEYS);
    useShapeElement('rect', id, data, eventProps);
    return null;
}
export default Rect;
export { Rect };
