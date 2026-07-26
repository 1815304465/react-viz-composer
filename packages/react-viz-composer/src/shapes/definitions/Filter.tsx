import type { FilterData, FilterEffect } from '../../engine/types';
import { useRegisterNode } from '../../context';

interface FilterEffectProps {
  type: FilterEffect['type'];
  value: number;
  offsetX?: number;
  offsetY?: number;
  color?: string;
}

interface Props {
  id: string;
  effects: FilterEffectProps[];
}

/**
 * Filter —— 滤镜定义
 *
 * 定义一个可被其他形状引用的滤镜效果：
 * ```tsx
 * <Filter id="my-blur" effects={[{ type: 'blur', value: 3 }]} />
 * <Rect fill="blue" x={50} y={50} width={100} height={100} filter="url(#my-blur)" />
 * ```
 *
 * 支持的滤镜效果对标 Canvas 2D ctx.filter（CSS filter 字符串）：
 * - blur        → 模糊
 * - brightness  → 亮度
 * - contrast    → 对比度
 * - dropShadow  → 投影（支持 offsetX/offsetY/color）
 * - grayscale   → 灰度
 * - opacity     → 透明度（百分比）
 * - saturate    → 饱和度
 * - sepia       → 褐色
 * - hueRotate   → 色相旋转（度）
 *
 * Canvas 模式：将 effects 拼接为 CSS filter 字符串，设置 ctx.filter
 * SVG 模式：创建 <filter> + 对应的 <feXxx> 子元素
 */
function Filter({ id, effects }: Props) {
  useRegisterNode(
    id,
    () => ({
      id,
      type: 'filter',
      data: {
        id,
        effects: effects.map((e): FilterEffect => ({
          type: e.type,
          value: e.value,
          offsetX: e.offsetX,
          offsetY: e.offsetY,
          color: e.color,
        })),
      } as FilterData,
      dirty: true,
      subtreeDirty: true,
    }),
    [id, effects],
  );

  return null;
}

export default Filter;
export { Filter };
