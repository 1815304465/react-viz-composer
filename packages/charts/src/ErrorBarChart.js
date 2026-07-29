import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * ErrorBarChart —— 误差条形图
 *
 * 在柱状图基础上叠加 T 形误差线（上误差 + 下误差各一支）。
 */
import { useMemo } from 'react';
import { Rect, Line, Text, Group } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, animValue, useChartItemHover, hoverStrokeWidth, scaleBand, scaleLinear, Axis, Grid, SEMANTIC_6, AXIS_COLOR, TEXT_COLOR } from '@react-viz-composer/components';
export function ErrorBarChart(props) {
    const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (d) => d.category);
    const dataset = data ?? [
        { category: 'A', value: 45, error: 8 },
        { category: 'B', value: 62, error: 12 },
        { category: 'C', value: 38, error: 5 },
        { category: 'D', value: 70, error: 15 },
        { category: 'E', value: 55, error: 7 },
        { category: 'F', value: 48, error: 10 },
    ];
    const categories = useMemo(() => dataset.map((d) => d.category), [dataset]);
    const xScale = useMemo(() => scaleBand(categories, [0, PLOT_WIDTH], 0.3), [categories]);
    const yScale = useMemo(() => {
        const yMax = Math.max(...dataset.map((d) => d.value + d.error)) * 1.15;
        return scaleLinear([0, yMax], [PLOT_HEIGHT, 0]);
    }, [dataset]);
    const capW = 6; // 误差线横杠宽度
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: yScale, orient: "y" }), dataset.map((d) => {
                    const x = xScale(d.category);
                    const cx = x + xScale.bandwidth / 2;
                    const valY = yScale(animValue(d.value, progress));
                    const errTop = yScale(animValue(d.value + d.error, progress));
                    const errBot = yScale(animValue(d.value - d.error, progress));
                    const fullHeight = PLOT_HEIGHT - valY;
                    const h = animSize(fullHeight, progress);
                    const barY = PLOT_HEIGHT - h;
                    return (_jsxs(Group, { children: [_jsx(Rect, { x: x, y: barY, width: xScale.bandwidth, height: h, fill: color, stroke: color, strokeWidth: hoverStrokeWidth(1, isHovering(d.category)), ...bindHover(d) }), _jsx(Line, { points: [
                                    { x: cx, y: errTop },
                                    { x: cx, y: errBot },
                                ], stroke: AXIS_COLOR, strokeWidth: 1.5 }), _jsx(Line, { points: [
                                    { x: cx - capW, y: errTop },
                                    { x: cx + capW, y: errTop },
                                ], stroke: AXIS_COLOR, strokeWidth: 1.5 }), _jsx(Line, { points: [
                                    { x: cx - capW, y: errBot },
                                    { x: cx + capW, y: errBot },
                                ], stroke: AXIS_COLOR, strokeWidth: 1.5 })] }, d.category));
                }), dataset.map((d) => {
                    const x = xScale(d.category);
                    const fullHeight = PLOT_HEIGHT - yScale(animValue(d.value, progress));
                    if (progress < 0.3)
                        return null;
                    return (_jsx(Text, { x: x + xScale.bandwidth / 2, y: PLOT_HEIGHT - fullHeight - 6, text: `${d.value}±${d.error}`, fontSize: 10, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle" }, `t-${d.category}`));
                }), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" })] })) }));
}
export default ErrorBarChart;
