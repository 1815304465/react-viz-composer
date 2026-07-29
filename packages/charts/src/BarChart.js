import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * BarChart —— 柱状图
 */
import { useMemo } from 'react';
import { Rect, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverStrokeWidth, scaleBand, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';
export function BarChart(props) {
    const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (d) => d.month);
    const dataset = data ?? [
        { month: '1月', value: 120 },
        { month: '2月', value: 200 },
        { month: '3月', value: 150 },
        { month: '4月', value: 80 },
        { month: '5月', value: 170 },
        { month: '6月', value: 240 },
    ];
    const categories = useMemo(() => dataset.map((d) => d.month), [dataset]);
    const xScale = useMemo(() => scaleBand(categories, [0, PLOT_WIDTH], 0.3), [categories]);
    const yScale = useMemo(() => {
        const yMax = Math.max(...dataset.map((d) => d.value)) * 1.1;
        return scaleLinear([0, yMax], [PLOT_HEIGHT, 0]);
    }, [dataset]);
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: yScale, orient: "y" }), dataset.map((d) => {
                    const x = xScale(d.month);
                    const fullHeight = PLOT_HEIGHT - yScale(d.value);
                    const h = animSize(fullHeight, progress);
                    const y = PLOT_HEIGHT - h;
                    return (_jsx(Rect, { x: x, y: y, width: xScale.bandwidth, height: h, fill: color, stroke: color, strokeWidth: hoverStrokeWidth(1, isHovering(d.month)), ...bindHover(d) }, d.month));
                }), dataset.map((d) => {
                    const fullHeight = PLOT_HEIGHT - yScale(d.value);
                    const h = animSize(fullHeight, progress);
                    const y = PLOT_HEIGHT - h;
                    const x = xScale(d.month);
                    const labelValue = Math.round((d.value * progress));
                    if (progress < 0.15)
                        return null;
                    return (_jsx(Text, { x: x + xScale.bandwidth / 2, y: y - 6, text: String(labelValue), fontSize: 11, fontFamily: "sans-serif", fill: "#595959", textAlign: "middle" }, `t-${d.month}`));
                }), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" })] })) }));
}
export default BarChart;
