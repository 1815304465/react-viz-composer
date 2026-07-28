import type { ElementType } from '../../types';

/** 不参与绘制顺序的 defs 类元素 */
const NON_DRAWABLE_TYPES = new Set<ElementType>([
  'linearGradient', 'radialGradient', 'clipPath', 'filter', 'mask',
]);

export { NON_DRAWABLE_TYPES };
