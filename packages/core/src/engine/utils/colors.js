/**
 * 解析 CSS 颜色字符串为 RGBA 分量数组
 * 支持 hex (#RGB/#RGBA/#RRGGBB/#RRGGBBAA) 和 rgb/rgba 格式
 * @param color CSS 颜色字符串
 * @returns RGBA 分量（0~1），无法解析时返回 [0, 0, 0, 1]
 */
function parseColor(color) {
    if (!color || color === 'none' || color === 'transparent')
        return [0, 0, 0, 0];
    const hex = color.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
        let h = hex[1];
        if (h.length === 3)
            h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + 'ff';
        if (h.length === 6)
            h += 'ff';
        return [
            parseInt(h.slice(0, 2), 16) / 255,
            parseInt(h.slice(2, 4), 16) / 255,
            parseInt(h.slice(4, 6), 16) / 255,
            parseInt(h.slice(6, 8), 16) / 255,
        ];
    }
    const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgb) {
        return [
            parseInt(rgb[1], 10) / 255,
            parseInt(rgb[2], 10) / 255,
            parseInt(rgb[3], 10) / 255,
            rgb[4] ? parseFloat(rgb[4]) : 1,
        ];
    }
    return [0, 0, 0, 1];
}
/**
 * 将 RGBA 分量数组转为 CSS 颜色字符串
 * @param c RGBA 分量（0~1）
 * @returns CSS rgb/rgba 字符串
 */
function rgbaToCss(c) {
    const r = Math.round(c[0] * 255);
    const g = Math.round(c[1] * 255);
    const b = Math.round(c[2] * 255);
    const a = Math.round(c[3] * 1000) / 1000;
    return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
}
/**
 * 在两个 CSS 颜色之间进行线性插值
 * @param from 起始色（CSS 颜色字符串）
 * @param to 结束色（CSS 颜色字符串）
 * @param t 插值因子（0~1）
 * @returns 插值后的 CSS 颜色字符串
 */
function lerpColor(from, to, t) {
    const a = parseColor(from);
    const b = parseColor(to);
    return rgbaToCss([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
        a[3] + (b[3] - a[3]) * t,
    ]);
}
/**
 * 判断填充类型：0=solid, 1=gradient, 2=texture
 * @param fill 填充值
 * @returns 颜色模式编号
 */
function getColorMode(fill) {
    if (!fill)
        return 0;
    if (fill.startsWith('url(#'))
        return 1;
    return 0;
}
/**
 * 从 "url(#grad-id)" 格式中提取渐变 id
 * @param fill 填充引用字符串
 * @returns 渐变 id，解析失败返回 null
 */
function extractGradientId(fill) {
    if (!fill || !fill.startsWith('url(#'))
        return null;
    return fill.slice(5, -1);
}
/**
 * 将渐变 stop 的颜色与其 stop-opacity 合并为 CSS 颜色字符串
 * @param stop 渐变断点定义
 * @returns 合并 opacity 后的 CSS 颜色
 */
function gradientStopColor(stop) {
    if (stop.opacity === undefined || stop.opacity >= 1)
        return stop.color;
    const m = stop.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) {
        const a = (m[4] ? parseFloat(m[4]) : 1) * stop.opacity;
        return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})`;
    }
    const hex = stop.color.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
        let h = hex[1];
        if (h.length === 3)
            h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        if (h.length === 6) {
            const r = parseInt(h.slice(0, 2), 16);
            const g = parseInt(h.slice(2, 4), 16);
            const b = parseInt(h.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${stop.opacity})`;
        }
    }
    return stop.color;
}
export { parseColor, rgbaToCss, lerpColor, getColorMode, extractGradientId, gradientStopColor, };
