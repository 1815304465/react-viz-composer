import { useShapeElement } from '../register';
/**
 * RadialGradient —— 径向渐变定义（纯代理）
 *
 * 经 useShapeElement 注册到 SceneTree；其他形状通过 fill="url(#id)" 引用。
 */
function RadialGradient(props) {
    const { id, cx = 0.5, cy = 0.5, r = 0.5, fx, fy, gradientUnits = 'objectBoundingBox', stops, } = props;
    const data = {
        id,
        cx,
        cy,
        r,
        fx,
        fy,
        gradientUnits,
        stops: stops.map((s) => ({
            offset: s.offset,
            color: s.color,
            opacity: s.opacity,
        })),
    };
    useShapeElement('radialGradient', id, data, {});
    return null;
}
export default RadialGradient;
export { RadialGradient };
