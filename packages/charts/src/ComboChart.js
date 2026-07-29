import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ComboChart —— 柱线混合图
 *
 * 体现：LinearGradient 填充、zIndex 分层、VizEvent onClick 选中、入场动画
 */
import { useMemo, useState } from 'react';
import { Rect, Path, Ellipse, Text, LinearGradient } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, animValue, useChartItemHover, hoverStrokeWidth, scaleBand, scaleLinear, Axis, Grid, SEMANTIC_6, TEXT_COLOR } from '@react-viz-composer/components';
/** 柱线混合图 */
function ComboChart(props) {
    const { data, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (d) => d.month);
    const [activeMonth, setActiveMonth] = useState(null);
    const dataset = data ?? [
        { month: '1月', sales: 320, rate: 12 },
        { month: '2月', sales: 280, rate: -8 },
        { month: '3月', sales: 410, rate: 18 },
    ];
    const categories = useMemo(() => dataset.map((d) => d.month), [dataset]);
    const xScale = useMemo(() => scaleBand(categories, [0, PLOT_WIDTH], 0.25), [categories]);
    const yScale = useMemo(() => {
        const max = Math.max(...dataset.map((d) => d.sales)) * 1.15;
        return scaleLinear([0, max], [PLOT_HEIGHT, 0]);
    }, [dataset]);
    const rateScale = useMemo(() => scaleLinear([-20, 30], [PLOT_HEIGHT, 0]), []);
    return (_jsx(ChartFrame, { entryDuration: 900, children: (progress) => (_jsxs(_Fragment, { children: [_jsx(LinearGradient, { id: "combo-bar-grad", x1: 0, y1: 1, x2: 0, y2: 0, gradientUnits: "objectBoundingBox", stops: [
                        { offset: 0, color: '#1677ff' },
                        { offset: 1, color: '#69b1ff' },
                    ] }), _jsx(Grid, { scale: yScale, orient: "y" }), dataset.map((d) => {
                    const x = xScale(d.month);
                    const fullH = PLOT_HEIGHT - yScale(d.sales);
                    const h = animSize(fullH, progress);
                    const y = PLOT_HEIGHT - h;
                    const selected = activeMonth === d.month;
                    const hovered = isHovering(d.month);
                    return (_jsx(Rect, { x: x, y: y, width: xScale.bandwidth, height: h, fill: selected ? '#fa8c16' : 'url(#combo-bar-grad)', stroke: selected ? '#d46b08' : hovered ? '#0958d9' : '#1677ff', strokeWidth: selected ? 2 : hoverStrokeWidth(1, hovered), zIndex: selected ? 2 : hovered ? 1 : 0, onClick: () => setActiveMonth(d.month), ...bindHover(d) }, `bar-${d.month}`));
                }), (() => {
                    const points = dataset.map((d) => ({
                        x: xScale(d.month) + xScale.bandwidth / 2,
                        y: rateScale(animValue(d.rate, progress)),
                    }));
                    const lineD = points
                        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                        .join(' ');
                    return (_jsx(Path, { d: lineD, fill: "none", stroke: SEMANTIC_6[3], strokeWidth: 2, zIndex: 3 }, "rate-line"));
                })(), dataset.map((d) => {
                    const px = xScale(d.month) + xScale.bandwidth / 2;
                    const py = rateScale(animValue(d.rate, progress));
                    return (_jsx(Ellipse, { cx: px, cy: py, rx: 5, ry: 5, fill: "#fff", stroke: SEMANTIC_6[3], strokeWidth: hoverStrokeWidth(2, isHovering(d.month)), zIndex: 4, ...bindHover(d) }, `rate-${d.month}`));
                }), activeMonth && progress > 0.6 && (_jsx(Text, { x: PLOT_WIDTH - 8, y: 16, text: `选中: ${activeMonth}`, fontSize: 11, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "end" })), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" })] })) }));
}
export default ComboChart;
export { ComboChart };
