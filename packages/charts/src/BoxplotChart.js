import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * BoxplotChart —— 箱线图（盒须图）
 *
 * 每个类别绘制一个垂直箱体（Q1→Q3）、中位数线、须线（min→max）。
 */
import { useMemo } from 'react';
import { Rect, Line, Text, Group } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, animSize, useChartItemHover, hoverStrokeWidth, scaleLinear, scaleBand, Axis, Grid, SEMANTIC_6, AXIS_COLOR, TEXT_COLOR } from '@react-viz-composer/components';
export function BoxplotChart(props) {
    const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (d) => d.category);
    const dataset = data ?? [
        { category: 'A组', min: 10, q1: 25, median: 42, q3: 58, max: 80 },
        { category: 'B组', min: 20, q1: 35, median: 50, q3: 65, max: 90 },
        { category: 'C组', min: 5, q1: 18, median: 30, q3: 48, max: 70 },
        { category: 'D组', min: 15, q1: 28, median: 45, q3: 60, max: 85 },
        { category: 'E组', min: 8, q1: 22, median: 38, q3: 52, max: 75 },
    ];
    const categories = useMemo(() => dataset.map((d) => d.category), [dataset]);
    const xScale = useMemo(() => scaleBand(categories, [0, PLOT_WIDTH], 0.3), [categories]);
    const yScale = useMemo(() => {
        const allVals = dataset.flatMap((d) => [d.min, d.max]);
        const yMin = Math.min(...allVals) * 0.9;
        const yMax = Math.max(...allVals) * 1.1;
        return scaleLinear([yMin, yMax], [PLOT_HEIGHT, 0]);
    }, [dataset]);
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: yScale, orient: "y" }), dataset.map((d) => {
                    const cx = xScale(d.category) + xScale.bandwidth / 2;
                    const minY = yScale(animValue(d.min, progress));
                    const maxY = yScale(animValue(d.max, progress));
                    const q1Y = yScale(animValue(d.q1, progress));
                    const q3Y = yScale(animValue(d.q3, progress));
                    const medY = yScale(animValue(d.median, progress));
                    const boxW = xScale.bandwidth * 0.6;
                    const whiskerW = boxW * 0.5;
                    const hovered = isHovering(d.category);
                    return (_jsxs(Group, { children: [_jsx(Line, { points: [
                                    { x: cx, y: minY },
                                    { x: cx, y: q1Y },
                                ], stroke: AXIS_COLOR, strokeWidth: 1 }), _jsx(Line, { points: [
                                    { x: cx - whiskerW / 2, y: minY },
                                    { x: cx + whiskerW / 2, y: minY },
                                ], stroke: AXIS_COLOR, strokeWidth: 1 }), _jsx(Line, { points: [
                                    { x: cx, y: q3Y },
                                    { x: cx, y: maxY },
                                ], stroke: AXIS_COLOR, strokeWidth: 1 }), _jsx(Line, { points: [
                                    { x: cx - whiskerW / 2, y: maxY },
                                    { x: cx + whiskerW / 2, y: maxY },
                                ], stroke: AXIS_COLOR, strokeWidth: 1 }), (() => {
                                const boxH = Math.abs(q3Y - q1Y);
                                return (_jsx(Rect, { x: cx - boxW / 2, y: q3Y, width: boxW, height: animSize(boxH, progress) > 0 ? boxH : 0, fill: color, stroke: color, strokeWidth: hoverStrokeWidth(1, hovered), ...bindHover(d) }));
                            })(), _jsx(Line, { points: [
                                    { x: cx - boxW / 2, y: medY },
                                    { x: cx + boxW / 2, y: medY },
                                ], stroke: "#fff", strokeWidth: 2 })] }, d.category));
                }), dataset.map((d) => {
                    const cx = xScale(d.category) + xScale.bandwidth / 2;
                    const maxY = yScale(animValue(d.max, progress));
                    if (progress < 0.4)
                        return null;
                    return (_jsx(Text, { x: cx, y: maxY - 6, text: `${d.median}`, fontSize: 10, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle" }, `t-${d.category}`));
                }), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" })] })) }));
}
export default BoxplotChart;
