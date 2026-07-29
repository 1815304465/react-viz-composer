/**
 * 解析 SVG stroke-dasharray 字符串为 Canvas setLineDash 数组
 * @param dash stroke-dasharray 字符串（如 "5,3"）
 * @returns 数值数组，解析失败返回 undefined
 */
function parseDashArray(dash) {
    if (!dash)
        return undefined;
    const parts = dash.split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n));
    return parts.length > 0 ? parts : undefined;
}
/**
 * 根据 preserveAspectRatio 策略计算 Canvas drawImage 的目标矩形
 * 默认按 xMidYMid meet 居中等比缩放
 * @param data 图片 data
 * @param imgW 图片原始宽度
 * @param imgH 图片原始高度
 * @returns drawImage 目标矩形
 */
function computeImageDrawRect(data, imgW, imgH) {
    const par = data.preserveAspectRatio ?? 'xMidYMid meet';
    if (par === 'none' || imgW <= 0 || imgH <= 0) {
        return { dx: data.x, dy: data.y, dw: data.width, dh: data.height };
    }
    const parts = par.split(/\s+/);
    const align = parts[0] ?? 'xMidYMid';
    const meetOrSlice = parts[1] ?? 'meet';
    const imgAspect = imgW / imgH;
    const boxAspect = data.width / Math.max(data.height, 1);
    let dw = data.width;
    let dh = data.height;
    if (meetOrSlice === 'meet') {
        if (boxAspect > imgAspect)
            dw = data.height * imgAspect;
        else
            dh = data.width / imgAspect;
    }
    else {
        if (boxAspect > imgAspect)
            dh = data.width / imgAspect;
        else
            dw = data.height * imgAspect;
    }
    let dx = data.x;
    let dy = data.y;
    if (align.includes('Mid') && !align.startsWith('x')) {
        // xMid / xMidYMid
    }
    if (align.includes('Mid')) {
        if (align.startsWith('x') || align === 'xMidYMid' || align.includes('YMid')) {
            dx += (data.width - dw) / 2;
        }
    }
    if (align.includes('Max')) {
        if (align.startsWith('x') || align.includes('YMax'))
            dx += data.width - dw;
    }
    if (align.includes('YMid'))
        dy += (data.height - dh) / 2;
    else if (align.includes('YMax'))
        dy += data.height - dh;
    return { dx, dy, dw, dh };
}
export { parseDashArray, computeImageDrawRect };
