import type { ReactNode } from 'react';
import { ParentIdContext } from '../../context';
import type { FilterData, FilterEffect } from '../../engine/types';
import { useShapeElement } from '../register';

interface FilterEffectProps {
  type: FilterEffect['type'];
  value: number;
  offsetX?: number;
  offsetY?: number;
  color?: string;
}

interface Props {
  /** 滤镜效果列表 */
  effects: FilterEffectProps[];
  /** 应用滤镜的子节点 */
  children?: ReactNode;
}

/**
 * Filter —— 声明式滤镜容器
 *
 * 作用范围为其全部子节点，无需手动指定 id / url(#id)：
 * ```tsx
 * <Filter effects={[{ type: 'blur', value: 3 }]}>
 *   <Rect x={50} y={50} width={100} height={100} fill="blue" />
 * </Filter>
 * ```
 *
 * 支持的滤镜效果对标 Canvas 2D ctx.filter（CSS filter 字符串）。
 */
function Filter(props: Props) {
  const { effects, children } = props;
  const data: FilterData = {
    effects: effects.map((e): FilterEffect => ({
      type: e.type,
      value: e.value,
      offsetX: e.offsetX,
      offsetY: e.offsetY,
      color: e.color,
    })),
  };
  const id = useShapeElement('filter', undefined, data, {});

  return (
    <ParentIdContext.Provider value={id}>
      {children}
    </ParentIdContext.Provider>
  );
}

export default Filter;
export { Filter };
