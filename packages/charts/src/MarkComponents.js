import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MarkComponents —— 标注组件
 *
 * 提供 MarkLine、MarkPoint、MarkArea 三个可组合的标注子组件，
 * 用于在图表中叠加阈值线、高亮点和区间阴影。
 *
 * 这些组件本身不包含坐标轴映射，而是接收像素坐标或数据+scale。
 * 可以在 ChartFrame 的 children render prop 内与主图表叠加使用。
 */
import { Line, Ellipse, Rect, Text } from '@react-viz-composer/core';
export function MarkLine({ type, value, scale, pixelValue, length = 530, color = '#f5222d', strokeWidth = 1.5, dashArray = [5, 3], label, labelOffsetX = 4, labelOffsetY = -4, }) {
    const pos = pixelValue ?? (scale && value != null ? scale(value) : 0);
    if (type === 'horizontal') {
        return (_jsxs(_Fragment, { children: [_jsx(Line, { points: [
                        { x: 0, y: pos },
                        { x: length, y: pos },
                    ], stroke: color, strokeWidth: strokeWidth, strokeDasharray: dashArray.join(' ') }), label && (_jsx(Text, { x: length + labelOffsetX, y: pos + 3 + labelOffsetY, text: label, fontSize: 11, fontFamily: "sans-serif", fill: color, textAlign: "start" }))] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(Line, { points: [
                    { x: pos, y: 0 },
                    { x: pos, y: length },
                ], stroke: color, strokeWidth: strokeWidth, strokeDasharray: dashArray.join(' ') }), label && (_jsx(Text, { x: pos + labelOffsetX, y: labelOffsetY + 3, text: label, fontSize: 11, fontFamily: "sans-serif", fill: color, textAlign: "start" }))] }));
}
export function MarkPoint({ cx, cy, color = '#f5222d', r = 6, label, labelPosition = 'top', }) {
    const lx = labelPosition === 'right' ? cx + r + 6 : cx;
    const ly = labelPosition === 'right' ? cy + 4 : cy - r - 6;
    return (_jsxs(_Fragment, { children: [_jsx(Ellipse, { cx: cx, cy: cy, rx: r * 2, ry: r * 2, fill: color, opacity: 0.12, stroke: "none", strokeWidth: 0 }), _jsx(Ellipse, { cx: cx, cy: cy, rx: r * 1.4, ry: r * 1.4, fill: color, opacity: 0.2, stroke: "none", strokeWidth: 0 }), _jsx(Ellipse, { cx: cx, cy: cy, rx: r, ry: r, fill: color, stroke: "#fff", strokeWidth: 2, zIndex: 10 }), label && (_jsx(Text, { x: lx, y: ly + 4, text: label, fontSize: 12, fontFamily: "sans-serif", fill: color, fontWeight: "bold", textAlign: labelPosition === 'right' ? 'start' : 'middle', zIndex: 10 }))] }));
}
export function MarkArea({ yMin, yMax, xMin, xMax, yScale, xScale, pixelYMin, pixelYMax, pixelXMin, pixelXMax, color = '#1677ff', opacity = 0.08, width = 530, label, }) {
    const py0 = pixelYMin ?? (yScale && yMin != null ? yScale(yMin) : 0);
    const py1 = pixelYMax ?? (yScale && yMax != null ? yScale(yMax) : 0);
    const px0 = pixelXMin ?? (xScale && xMin != null ? xScale(xMin) : 0);
    const px1 = pixelXMax ?? (xScale && xMax != null ? xScale(xMax) : width);
    const rectY = Math.min(py0, py1);
    const rectH = Math.abs(py1 - py0);
    const rectX = Math.min(px0, px1);
    const rectW = Math.abs(px1 - px0);
    return (_jsxs(_Fragment, { children: [_jsx(Rect, { x: rectX, y: rectY, width: rectW, height: rectH, fill: color, opacity: opacity }), label && (_jsx(Text, { x: rectX + rectW / 2, y: rectY - 4, text: label, fontSize: 10, fontFamily: "sans-serif", fill: color, textAlign: "middle" }))] }));
}
export default { MarkLine, MarkPoint, MarkArea };
