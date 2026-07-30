import type { ReactElement, ReactNode } from 'react';
import { ParentIdContext } from '../../context';
import type { ClipPathData } from '../../engine/types';
import { useShapeElement } from '../register';
import { resolveClipShapeElement } from './resolveClipShape';

interface Props {
  /**
   * 裁剪形状（声明式几何组件）
   * @example clip={<Ellipse cx={100} cy={100} rx={50} ry={50} />}
   */
  clip: ReactElement;
  /** 被裁剪的子节点 */
  children?: ReactNode;
}

/**
 * ClipPath —— 声明式裁剪容器
 *
 * 作用范围为其全部子节点，无需手动指定 id / url(#id)：
 * ```tsx
 * <ClipPath clip={<Ellipse cx={100} cy={100} rx={50} ry={50} />}>
 *   <Rect x={50} y={50} width={100} height={100} fill="blue" />
 * </ClipPath>
 * ```
 */
function ClipPath(props: Props) {
  const { clip, children } = props;
  const resolved = resolveClipShapeElement(clip);
  const data: ClipPathData = {
    shapeType: resolved.shapeType,
    shapeData: resolved.shapeData,
  };
  const id = useShapeElement('clipPath', undefined, data, {});

  return (
    <ParentIdContext.Provider value={id}>
      {children}
    </ParentIdContext.Provider>
  );
}

export default ClipPath;
export { ClipPath };
