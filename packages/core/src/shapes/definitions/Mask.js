import { useRegisterNode } from '../../context';
/**
 * Mask —— 遮罩定义
 *
 * 定义一个可被其他形状引用的遮罩区域：
 * ```tsx
 * <Mask id="circle-mask" shapeType="ellipse" shapeData={{ cx: 100, cy: 100, rx: 50, ry: 50 }} />
 * <Rect fill="blue" x={50} y={50} width={200} height={200} mask="url(#circle-mask)" />
 * ```
 *
 * 与 ClipPath 的区别：
 * - ClipPath 是硬裁剪（超出区域的部分完全不可见）
 * - Mask 是软遮罩（通过透明度/亮度控制各像素的可见程度）
 *
 * Canvas 模式：通过离屏 Canvas + globalCompositeOperation 实现
 * SVG 模式：创建 <mask> 元素
 */
function Mask({ id, shapeType, shapeData, maskMode = 'alpha' }) {
    useRegisterNode(id, () => ({
        id,
        type: 'mask',
        data: {
            id,
            shapeType: shapeType,
            shapeData: shapeData,
            maskMode,
        },
        dirty: true,
        subtreeDirty: true,
    }), [id, shapeType, shapeData, maskMode]);
    return null;
}
export default Mask;
export { Mask };
