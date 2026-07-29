import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * BubbleChart —— 气泡图
 *
 * 体现：Ellipse 半径映射、opacity 分层、RadialGradient、多系列配色
 */
import { useMemo } from 'react';
import { Ellipse, Text, RadialGradient } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverOpacity, hoverStrokeWidth, scaleLinear, Axis, Grid, CATEGORY_12, TEXT_COLOR } from '@react-viz-composer/components';
/** 气泡图 */
function BubbleChart(props) {
    const { data, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (d) => d.name);
    const items = data ?? [
        { name: '华北', x: 22, y: 68, size: 42, group: 0 },
        { name: '华东', x: 58, y: 72, size: 58, group: 0 },
    ];
    const xScale = useMemo(() => scaleLinear([0, 100], [0, PLOT_WIDTH]), []);
    const yScale = useMemo(() => scaleLinear([0, 100], [PLOT_HEIGHT, 0]), []);
    const maxSize = useMemo(() => Math.max(...items.map((d) => d.size)), [items]);
    return (_jsx(ChartFrame, { entryDuration: 900, children: (progress) => (_jsxs(_Fragment, { children: [CATEGORY_12.slice(0, 4).map((color, i) => (_jsx(RadialGradient, { id: `bubble-grad-${i}`, cx: 0.35, cy: 0.35, r: 0.65, stops: [
                        { offset: 0, color: color, opacity: 0.95 },
                        { offset: 1, color: color, opacity: 0.35 },
                    ] }, `bubble-grad-${i}`))), _jsx(Grid, { scale: xScale, orient: "x" }), _jsx(Grid, { scale: yScale, orient: "y" }), items.map((d) => {
                    const cx = xScale(d.x);
                    const cy = yScale(d.y);
                    const r = animSize((d.size / maxSize) * 28 + 6, progress);
                    const colorIdx = d.group % 4;
                    const hovered = isHovering(d.name);
                    return (_jsx(Ellipse, { cx: cx, cy: cy, rx: r, ry: r, fill: `url(#bubble-grad-${colorIdx})`, stroke: CATEGORY_12[colorIdx], strokeWidth: hoverStrokeWidth(1, hovered), opacity: hoverOpacity(0.92, hovered), zIndex: Math.round(d.size) + (hovered ? 100 : 0), ...bindHover(d) }, d.name));
                }), items.map((d) => {
                    if (progress < 0.4)
                        return null;
                    return (_jsx(Text, { x: xScale(d.x), y: yScale(d.y) + 4, text: d.name, fontSize: 10, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle", zIndex: 100 }, `label-${d.name}`));
                }), _jsx(Axis, { scale: xScale, orient: "bottom", tickFormat: (v) => `${v}%` }), _jsx(Axis, { scale: yScale, orient: "left", tickFormat: (v) => `${v}%` })] })) }));
}
export default BubbleChart;
export { BubbleChart };
