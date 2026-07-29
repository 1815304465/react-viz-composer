/**
 * 以屏幕坐标点为中心缩放视口
 * 保证鼠标指向的点在世界坐标中位置不变
 * @param prev 当前视口
 * @param factor 缩放倍率乘数（如 1.1 放大，0.9 缩小）
 * @param pointX 屏幕坐标 x（容器内，CSS 像素）
 * @param pointY 屏幕坐标 y（容器内，CSS 像素）
 * @returns 新视口状态
 */
function zoomViewportAtPoint(prev, factor, pointX, pointY) {
    const nextScale = Math.max(0.1, Math.min(10, prev.scale * factor));
    return {
        scale: nextScale,
        x: pointX / nextScale - pointX / prev.scale + prev.x,
        y: pointY / nextScale - pointY / prev.scale + prev.y,
    };
}
/**
 * 按屏幕像素偏移平移视口
 * @param prev 当前视口
 * @param deltaScreenX 屏幕 x 方向偏移（CSS 像素）
 * @param deltaScreenY 屏幕 y 方向偏移（CSS 像素）
 * @returns 新视口状态
 */
function panViewport(prev, deltaScreenX, deltaScreenY) {
    return {
        ...prev,
        x: prev.x + deltaScreenX / prev.scale,
        y: prev.y + deltaScreenY / prev.scale,
    };
}
/**
 * 将滚轮 deltaY 转换为缩放因子
 * 向下滚动缩小，向上滚动放大
 * @param deltaY 滚轮 deltaY
 * @returns 缩放因子乘数（0.9 缩小，1.1 放大）
 */
function wheelDeltaToZoomFactor(deltaY) {
    return deltaY > 0 ? 0.9 : 1.1;
}
export { zoomViewportAtPoint, panViewport, wheelDeltaToZoomFactor };
