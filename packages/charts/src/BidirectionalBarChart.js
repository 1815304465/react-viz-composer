import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * BidirectionalBarChart —— 双向柱状图
 */
import { Fragment } from 'react';
import { Rect, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverStrokeWidth, scaleBand, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';
export function BidirectionalBarChart(props) {
    const { data, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => `${p.name}-${p.direction}`);
    const dataset = data ?? [
        { name: '18-25', positive: 45, negative: 38 },
        { name: '26-35', positive: 72, negative: 60 },
        { name: '36-45', positive: 55, negative: 48 },
        { name: '46-55', positive: 38, negative: 40 },
        { name: '56-65', positive: 25, negative: 30 },
        { name: '65+', positive: 15, negative: 22 },
    ];
    const categories = dataset.map((d) => d.name);
    const xScale = scaleBand(categories, [0, PLOT_WIDTH], 0.3);
    const maxV = Math.max(...dataset.map((d) => Math.max(d.positive, d.negative))) * 1.1;
    const yScale = scaleLinear([-maxV, maxV], [PLOT_HEIGHT, 0]);
    const zeroY = yScale(0);
    const posColor = SEMANTIC_6[0];
    const negColor = SEMANTIC_6[3];
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: yScale, orient: "y" }), dataset.map((d) => {
                    const x = xScale(d.name);
                    const posFullH = zeroY - yScale(d.positive);
                    const posH = animSize(posFullH, progress);
                    const posY = zeroY - posH;
                    const negFullH = yScale(-d.negative) - zeroY;
                    const negH = animSize(negFullH, progress);
                    return (_jsxs(Fragment, { children: [_jsx(Rect, { x: x, y: posY, width: xScale.bandwidth, height: posH, fill: posColor, stroke: posColor, strokeWidth: hoverStrokeWidth(1, isHovering(`${d.name}-positive`)), ...bindHover({ name: d.name, direction: 'positive', value: d.positive }) }), _jsx(Rect, { x: x, y: zeroY, width: xScale.bandwidth, height: negH, fill: negColor, stroke: negColor, strokeWidth: hoverStrokeWidth(1, isHovering(`${d.name}-negative`)), ...bindHover({ name: d.name, direction: 'negative', value: d.negative }) })] }, d.name));
                }), dataset.map((d) => {
                    const x = xScale(d.name);
                    const posFullH = zeroY - yScale(d.positive);
                    const posH = animSize(posFullH, progress);
                    const posY = zeroY - posH;
                    const posVal = Math.round(d.positive * progress);
                    const negFullH = yScale(-d.negative) - zeroY;
                    const negH = animSize(negFullH, progress);
                    if (progress < 0.15)
                        return null;
                    return (_jsxs(Fragment, { children: [posH > 10 && (_jsx(Text, { x: x + xScale.bandwidth / 2, y: posY - 4, text: String(posVal), fontSize: 10, fontFamily: "sans-serif", fill: posColor, textAlign: "middle" })), negH > 10 && (_jsx(Text, { x: x + xScale.bandwidth / 2, y: zeroY + negH + 12, text: String(Math.round(d.negative * progress)), fontSize: 10, fontFamily: "sans-serif", fill: negColor, textAlign: "middle" }))] }, `label-${d.name}`));
                }), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" })] })) }));
}
export default BidirectionalBarChart;
