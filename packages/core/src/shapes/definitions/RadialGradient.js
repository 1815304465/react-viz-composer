import { useRegisterNode } from '../../context';
/**
 * RadialGradient —— 径向渐变定义组件（纯代理）
 * 开发者声明渐变参数，渲染引擎负责实现 CanvasGradient 或 SVG <radialGradient>
 */
function RadialGradient({ id, cx = 0.5, cy = 0.5, r = 0.5, fx, fy, gradientUnits = 'objectBoundingBox', stops, }) {
    useRegisterNode(id, () => ({
        id,
        type: 'radialGradient',
        data: {
            id,
            cx, cy, r, fx, fy,
            gradientUnits,
            stops: stops.map((s) => ({
                offset: s.offset,
                color: s.color,
                opacity: s.opacity,
            })),
        },
        dirty: true,
        subtreeDirty: true,
    }), [id, cx, cy, r, fx, fy, gradientUnits, stops]);
    return null;
}
export default RadialGradient;
export { RadialGradient };
