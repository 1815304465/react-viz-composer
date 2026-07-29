import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PictorialBarChart —— 象形柱图
 *
 * 每个柱体用一系列图标（Image）堆叠表示，代替传统矩形柱。
 * 类似 ECharts 的 pictorialBar：重复的 SVG 图标按数值堆叠或拉伸。
 * 这里采用"重复等大图标堆叠"方式，每个图标代表一个固定单位量。
 */
import { Fragment } from 'react';
import { Rect, Text, Image } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, animSize, useChartItemHover, hoverStrokeWidth, scaleLinear, scaleBand, Axis, Grid, SEMANTIC_6, TEXT_COLOR } from '@react-viz-composer/components';
/** 内置简单圆形图标（SVG data URI） */
const DEFAULT_ICON = 'data:image/svg+xml,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
        '<circle cx="12" cy="12" r="10" fill="#1677ff" opacity="0.85"/>' +
        '<circle cx="12" cy="12" r="6" fill="white" opacity="0.3"/>' +
        '</svg>');
export function PictorialBarChart(props) {
    const { data, unitSize = 5, iconUrl = DEFAULT_ICON, iconW = 20, iconH = 20, onItemEnter, onItemLeave, } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (d) => d.name);
    const dataset = data ?? [
        { name: 'Q1', value: 35 },
        { name: 'Q2', value: 52 },
        { name: 'Q3', value: 28 },
        { name: 'Q4', value: 46 },
    ];
    const iconCount = Math.ceil(Math.max(...dataset.map((d) => d.value)) / unitSize) + 1;
    const maxY = iconCount * unitSize * 1.15;
    const xScale = scaleBand(dataset.map((d) => d.name), [0, PLOT_WIDTH], 0.25);
    const yScale = scaleLinear([0, maxY], [PLOT_HEIGHT, 0]);
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: yScale, orient: "y" }), dataset.map((item) => {
                    const x = xScale(item.name);
                    const count = Math.ceil(item.value / unitSize);
                    const icons = [];
                    for (let i = 0; i < count; i++) {
                        const iconTopY = yScale(unitSize * (i + 1));
                        const animY = // 从底部弹入
                         PLOT_HEIGHT - animValue(PLOT_HEIGHT - iconTopY, progress);
                        icons.push(_jsx(Image, { x: x + (xScale.bandwidth - iconW) / 2, y: animY, width: iconW, height: iconH, src: iconUrl }, `icon-${item.name}-${i}`));
                    }
                    const hovered = isHovering(item.name);
                    const labelVal = Math.round(animValue(item.value, progress));
                    return (_jsxs(Fragment, { children: [icons, progress > 0.3 && (_jsxs(_Fragment, { children: [_jsx(Rect, { x: x + 2, y: PLOT_HEIGHT - 4, width: animSize(xScale.bandwidth - 4, progress) > 0 ? xScale.bandwidth - 4 : 0, height: 4, fill: SEMANTIC_6[0], rx: 2, ry: 2, stroke: SEMANTIC_6[0], strokeWidth: hoverStrokeWidth(0, hovered), ...bindHover(item) }), _jsx(Text, { x: x + xScale.bandwidth / 2, y: PLOT_HEIGHT - 10, text: String(labelVal), fontSize: 11, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle" })] }))] }, item.name));
                }), _jsx(Axis, { scale: xScale, orient: "bottom" })] })) }));
}
export default PictorialBarChart;
