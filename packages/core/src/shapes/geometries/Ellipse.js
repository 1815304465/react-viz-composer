import { resolveShapeProps, ELLIPSE_DATA_KEYS, useShapeElement } from '../register';
/**
 * Ellipse —— 椭圆形状组件（纯代理）
 * 不渲染任何 DOM，只将 props 拆解为 JSON 投递到 SceneTree
 */
function Ellipse(props) {
    const { id, data, eventProps } = resolveShapeProps(props, ELLIPSE_DATA_KEYS);
    useShapeElement('ellipse', id, data, eventProps);
    return null;
}
export default Ellipse;
export { Ellipse };
