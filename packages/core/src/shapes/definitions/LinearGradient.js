import { useShapeElement } from '../register';
/**
 * LinearGradient —— 线性渐变定义（纯代理）
 *
 * 经 useShapeElement 注册到 SceneTree；其他形状通过 fill="url(#id)" 引用。
 */
function LinearGradient(props) {
    const { id, x1 = 0, y1 = 0, x2 = 1, y2 = 0, gradientUnits = 'objectBoundingBox', stops, } = props;
    const data = {
        id,
        x1,
        y1,
        x2,
        y2,
        gradientUnits,
        stops: stops.map((s) => ({
            offset: s.offset,
            color: s.color,
            opacity: s.opacity,
        })),
    };
    useShapeElement('linearGradient', id, data, {});
    return null;
}
export default LinearGradient;
export { LinearGradient };
