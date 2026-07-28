import type { ClipPathData, ElementType, ElementData, RectData, EllipseData, PathData } from '../../engine/types';
import { useRegisterNode } from '../../context';

interface Props {
  id: string;
  /**
   * 裁剪形状，支持直接传入形状数据
   * 也支持传入预配置子元素
   */
  shapeType: 'rect' | 'ellipse' | 'path';
  shapeData: RectData | EllipseData | PathData;
}

/**
 * ClipPath —— 裁剪路径
 *
 * 定义一个可被其他形状引用的裁剪区域：
 * ```tsx
 * <ClipPath id="circle-clip" shapeType="ellipse" shapeData={{ cx: 100, cy: 100, rx: 50, ry: 50 }} />
 * <Rect fill="blue" x={50} y={50} width={100} height={100} clipPath="url(#circle-clip)" />
 * ```
 *
 * 注：Canvas 模式下裁剪的完整管线需要额外实现 hit-test 和独立的 clip 栈，
 * 当前 SVG 模式完全可用。
 */
function ClipPath({ id, shapeType, shapeData }: Props) {
  useRegisterNode(
    id,
    () => ({
      id,
      type: 'clipPath',
      data: {
        id,
        shapeType: shapeType as ElementType,
        shapeData: shapeData as ElementData,
      } as ClipPathData,
      dirty: true,
      subtreeDirty: true,
    }),
    [id, shapeType, shapeData],
  );

  return null;
}

export default ClipPath;
export { ClipPath };
