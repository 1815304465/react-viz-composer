import { resolveShapeProps, IMAGE_DATA_KEYS, useShapeElement } from '../register';
/**
 * Image —— 图片形状组件（纯代理）
 * 不渲染任何 DOM，只将 props 拆解为 JSON 投递到 SceneTree
 */
function Image(props) {
    const { id, data, eventProps } = resolveShapeProps(props, IMAGE_DATA_KEYS);
    useShapeElement('image', id, data, eventProps);
    return null;
}
export default Image;
export { Image };
