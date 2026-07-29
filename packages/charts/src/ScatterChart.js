import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ScatterChart —— 散点图
 */
import { Ellipse } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverStrokeWidth, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';
export function ScatterChart(props) {
    const { data, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => `${p.x}-${p.y}-${p.group}`);
    const points = data ?? defaultScatterData();
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
                    const hovered = isHovering(`${p.x}-${p.y}-${p.group}`);
                    return (_jsx(Ellipse, { cx: cx, cy: cy, rx: hovered ? baseR + 2 : baseR, ry: hovered ? baseR + 2 : baseR, fill: SEMANTIC_6[p.group % SEMANTIC_6.length] + 'B3', stroke: SEMANTIC_6[p.group % SEMANTIC_6.length], strokeWidth: hoverStrokeWidth(1, hovered), ...bindHover(p) }, i));
                }), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" })] })) }));
}
function defaultScatterData() {
    const out = [];
    for (let i = 0; i < 18; i++)
        out.push({ x: 30 + Math.random() * 20, y: 30 + Math.random() * 20, group: 0 });
    for (let i = 0; i < 18; i++)
        out.push({ x: 60 + Math.random() * 20, y: 60 + Math.random() * 20, group: 1 });
    for (let i = 0; i < 14; i++)
        out.push({ x: 40 + Math.random() * 30, y: 70 + Math.random() * 20, group: 2 });
    return out;
}
export default ScatterChart;
