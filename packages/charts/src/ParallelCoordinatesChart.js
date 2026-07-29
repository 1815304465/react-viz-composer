import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ParallelCoordinatesChart —— 平行坐标图
 *
 * 绘制 N 条垂直坐标轴，每个数据行用一条折线连接所有轴上的数值。
 */
import { Line, Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, useChartItemHover, hoverStrokeWidth, scaleLinear, SEMANTIC_6, AXIS_COLOR, TEXT_COLOR } from '@react-viz-composer/components';
export function ParallelCoordinatesChart(props) {
    const { data: rowsData, axes: axesData, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => `row-${p.row}`);
    const axes = axesData ?? ['销售额', '利润率', '增长率', '市场份额', '满意度'];
    const rows = rowsData ?? [
        [85, 42, 18, 35, 88],
        [60, 55, 22, 28, 75],
        [72, 38, 12, 45, 80],
        [90, 60, 25, 50, 70],
        [50, 30, 8, 20, 65],
        [78, 48, 20, 40, 85],
    ];
    const xPositions = axes.map((_, i) => {
        if (axes.length === 1)
            return PLOT_WIDTH / 2;
        return (i / (axes.length - 1)) * PLOT_WIDTH;
    });
    const axisScales = axes.map((_, colIdx) => {
        const min = Math.min(...rows.map((r) => r[colIdx]));
        const max = Math.max(...rows.map((r) => r[colIdx]));
        const range = max - min || 1;
        return {
            min,
            max,
            scale: scaleLinear([min - range * 0.1, max + range * 0.1], [PLOT_HEIGHT, 0]),
        };
    });
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [axes.map((axis, i) => (_jsx(Line, { points: [
                        { x: xPositions[i], y: 0 },
                        { x: xPositions[i], y: PLOT_HEIGHT },
                    ], stroke: AXIS_COLOR, strokeWidth: 1 }, `axis-${i}`))), axes.map((axis, i) => (_jsx(Text, { x: xPositions[i], y: PLOT_HEIGHT + 18, text: axis, fontSize: 11, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle" }, `axis-label-${i}`))), rows.map((row, rowIdx) => {
                    const points = row.map((val, colIdx) => ({
                        x: xPositions[colIdx],
                        y: axisScales[colIdx].scale(animValue(val, progress)),
                    }));
                    const d = points
                        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                        .join(' ');
                    const color = SEMANTIC_6[rowIdx % SEMANTIC_6.length];
                    const hoverKey = `row-${rowIdx}`;
                    const hovered = isHovering(hoverKey);
                    const payload = { row: rowIdx, axes, values: row };
                    return (_jsx(Path, { d: d, fill: "none", stroke: color, strokeWidth: hoverStrokeWidth(1.5, hovered), opacity: hovered ? 1 : 0.75, ...bindHover(payload), zIndex: hovered ? 10 : 0 }, hoverKey));
                })] })) }));
}
export default ParallelCoordinatesChart;
