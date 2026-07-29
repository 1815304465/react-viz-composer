/**
 * 读取形状不透明度（clamp 到 0~1）
 * @param data 形状 data
 * @returns 不透明度值（0~1）
 */
function getShapeOpacity(data) {
    if (data.opacity === undefined)
        return 1;
    return Math.max(0, Math.min(1, data.opacity));
}
/**
 * 在 Canvas 2D 上应用不透明度（opacity < 1 时 save + globalAlpha）
 * @param ctx 2D 上下文
 * @param opacity 不透明度
 * @returns 是否已 save，需配对 popCanvasOpacity 恢复
 */
function pushCanvasOpacity(ctx, opacity) {
    if (opacity >= 1)
        return false;
    ctx.save();
    ctx.globalAlpha = opacity;
    return true;
}
/**
 * 恢复 pushCanvasOpacity 的 save 状态
 * @param ctx 2D 上下文
 * @param saved pushCanvasOpacity 的返回值（true 表示需要 restore）
 */
function popCanvasOpacity(ctx, saved) {
    if (saved)
        ctx.restore();
}
export { getShapeOpacity, pushCanvasOpacity, popCanvasOpacity };
