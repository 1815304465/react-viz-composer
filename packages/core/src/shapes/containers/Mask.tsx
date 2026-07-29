import type { ReactElement, ReactNode } from 'react';
import { ParentIdContext } from '../../context';
import type { MaskData, MaskMode } from '../../engine/types';
import { useShapeElement } from '../register';
import { resolveClipShapeElement } from './resolveClipShape';

interface Props {
  /**
   * 遮罩形状（声明式几何组件）
   * @example mask={<Ellipse cx={100} cy={100} rx={50} ry={50} />}
   */
  mask: ReactElement;
  /**
   * 遮罩模式：
   * - 'alpha'：使用形状的透明度作为遮罩（默认）
   * - 'luminance'：使用形状颜色的亮度值作为遮罩
   */
  maskMode?: MaskMode;
  /** 被遮罩的子节点 */
  children?: ReactNode;
}

/**
 * Mask —— 声明式遮罩容器
 *
 * 作用范围为其全部子节点，无需手动指定 id / url(#id)：
 * ```tsx
 * <Mask mask={<Ellipse cx={100} cy={100} rx={50} ry={50} />} maskMode="alpha">
 *   <Rect x={50} y={50} width={200} height={200} fill="blue" />
 * </Mask>
 * ```
 *
 * 与 ClipPath 的区别：ClipPath 是硬裁剪；Mask 是软遮罩（透明度/亮度）。
 */
function Mask(props: Props) {
  const { mask, maskMode = 'alpha', children } = props;
  const resolved = resolveClipShapeElement(mask);
  const data: MaskData = {
    shapeType: resolved.shapeType,
    shapeData: resolved.shapeData,
    maskMode,
  };
  const id = useShapeElement('mask', undefined, data, {});

  return (
    <ParentIdContext.Provider value={id}>
      {children}
    </ParentIdContext.Provider>
  );
}

export default Mask;
export { Mask };
