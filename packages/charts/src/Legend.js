import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Legend —— 图例组件
 *
 * 在图表固定位置渲染色块 + 文本标签。
 */
import { Fragment } from 'react';
import { Rect, Text } from '@react-viz-composer/core';
import { PLOT_WIDTH, PLOT_HEIGHT, TEXT_COLOR } from '@react-viz-composer/components';
const POSITION_MAP = {
    'top-right': { anchor: 'end', xBase: () => PLOT_WIDTH - 10, yBase: () => 8, direction: 1 },
    'top-left': { anchor: 'start', xBase: () => 10, yBase: () => 8, direction: 1 },
    'bottom-right': { anchor: 'end', xBase: () => PLOT_WIDTH - 10, yBase: () => PLOT_HEIGHT - 8, direction: -1 },
    'bottom-left': { anchor: 'start', xBase: () => 10, yBase: () => PLOT_HEIGHT - 8, direction: -1 },
};
export function Legend({ items, position = 'top-right', swatchSize = 10, gap = 20, }) {
    const cfg = POSITION_MAP[position] ?? POSITION_MAP['top-right'];
    const xBase = cfg.xBase();
    const yBase = cfg.yBase();
    const dir = cfg.direction;
    return (_jsx(_Fragment, { children: items.map((item, i) => {
            const offset = i * gap * dir;
            const rowY = yBase + offset;
            const textX = position.includes('left')
                ? xBase + swatchSize + 6
                : xBase - swatchSize - 6;
            const textAlign = position.includes('left') ? 'start' : 'end';
            const swatchX = position.includes('left')
                ? xBase
                : xBase - swatchSize;
            return (_jsxs(Fragment, { children: [_jsx(Rect, { x: swatchX, y: rowY, width: swatchSize, height: swatchSize, fill: item.color, rx: 2, ry: 2 }), _jsx(Text, { x: textX, y: rowY + swatchSize - 1, text: item.name, fontSize: 11, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: textAlign })] }, item.name));
        }) }));
}
export default Legend;
