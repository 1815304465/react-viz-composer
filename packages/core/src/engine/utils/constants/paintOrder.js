/** 不参与叶子绘制排序：渐变 defs + 效果/结构容器自身不画 */
const NON_DRAWABLE_TYPES = new Set([
    'linearGradient', 'radialGradient', 'clipPath', 'filter', 'mask',
]);
export { NON_DRAWABLE_TYPES };
