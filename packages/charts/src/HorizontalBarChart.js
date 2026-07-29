import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * HorizontalBarChart —— 横向柱状图
 */
import { useMemo } from 'react';
import { Rect, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverStrokeWidth, scaleBand, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';
export function HorizontalBarChart(props) {
    const { data, color = SEMANTIC_6[0], onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (d) => d.name);
    const dataset = data ?? [
        { name: '北京', value: 120 },
        { name: '上海', value: 200 },
        { name: '广州', value: 150 },
        { name: '深圳', value: 80 },
        { name: '杭州', value: 170 },
        { name: '成都', value: 240 },
    ];
    const categories = useMemo(() => dataset.map((d) => d.name), [dataset]);
    const yScale = useMemo(() => scaleBand(categories, [0, PLOT_HEIGHT], 0.3), [categories]);
    const xScale = useMemo(() => {
        const xMax = Math.max(...dataset.map((d) => d.value)) * 1.1;
        return scaleLinear([0, xMax], [0, PLOT_WIDTH]);
    }, [dataset]);
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: xScale, orient: "x" }), dataset.map((d) => {
                    const y = yScale(d.name);
                    const fullWidth = xScale(d.value);
                    const w = animSize(fullWidth, progress);
                    return (_jsx(Rect, { x: 0, y: y, width: w, height: yScale.bandwidth, fill: color, stroke: color, strokeWidth: hoverStrokeWidth(1, isHovering(d.name)), ...bindHover(d) }, d.name));
                }), dataset.map((d) => {
                    const fullWidth = xScale(d.value);
                    const w = animSize(fullWidth, progress);
                    const y = yScale(d.name);
                    const labelValue = Math.round(d.value * progress);
                    if (progress < 0.15)
                        return null;
                    return (_jsx(Text, { x: w + 6, y: y + yScale.bandwidth / 2 + 4, text: String(labelValue), fontSize: 11, fontFamily: "sans-serif", fill: "#595959", textAlign: "start" }, `t-${d.name}`));
                }), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" })] })) }));
}
export default HorizontalBarChart;
