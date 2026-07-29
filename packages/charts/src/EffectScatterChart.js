import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * EffectScatterChart —— 涟漪散点图
 *
 * 类似 ScatterChart，但每个点带有多个同心半透明环（涟漪效果）。
 */
import { Fragment } from 'react';
import { Ellipse } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverStrokeWidth, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';
/** 涟漪环配置：缩放因子 + 透明度 */
const rippleRings = [
    { scale: 2.2, opacity: 0.12 },
    { scale: 3.4, opacity: 0.07 },
    { scale: 4.6, opacity: 0.04 },
];
export function EffectScatterChart(props) {
    const { data, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => `${p.x}-${p.y}-${p.group}`);
    const points = data ?? defaultEffectScatterData();
    const xScale = scaleLinear([0, 100], [0, PLOT_WIDTH]);
    const yScale = scaleLinear([0, 100], [PLOT_HEIGHT, 0]);
    const originX = PLOT_WIDTH / 2;
    const originY = PLOT_HEIGHT;
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: xScale, orient: "x" }), _jsx(Grid, { scale: yScale, orient: "y" }), points.map((p, i) => {
                    const tx = xScale(p.x);
                    const ty = yScale(p.y);
                    const cx = originX + (tx - originX) * progress;
                    const cy = originY + (ty - originY) * progress;
                    const baseR = animSize(4, progress);
                    const color = SEMANTIC_6[p.group % SEMANTIC_6.length];
                    const hovered = isHovering(`${p.x}-${p.y}-${p.group}`);
                    return (_jsxs(Fragment, { children: [rippleRings.map((ring, ri) => (_jsx(Ellipse, { cx: cx, cy: cy, rx: hovered ? baseR * ring.scale + 3 : baseR * ring.scale, ry: hovered ? baseR * ring.scale + 3 : baseR * ring.scale, fill: color, opacity: ring.opacity, stroke: "none", strokeWidth: 0 }, `ripple-${ri}`))), _jsx(Ellipse, { cx: cx, cy: cy, rx: hovered ? baseR + 2 : baseR, ry: hovered ? baseR + 2 : baseR, fill: color + 'E6', stroke: color, strokeWidth: hoverStrokeWidth(1, hovered), zIndex: hovered ? 10 : 0, ...bindHover(p) })] }, i));
                }), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" })] })) }));
}
function defaultEffectScatterData() {
    const out = [];
    for (let i = 0; i < 15; i++)
        out.push({ x: 20 + Math.random() * 15, y: 30 + Math.random() * 20, group: 0 });
    for (let i = 0; i < 15; i++)
        out.push({ x: 55 + Math.random() * 20, y: 60 + Math.random() * 20, group: 1 });
    for (let i = 0; i < 12; i++)
        out.push({ x: 35 + Math.random() * 25, y: 75 + Math.random() * 15, group: 2 });
    return out;
}
export default EffectScatterChart;
