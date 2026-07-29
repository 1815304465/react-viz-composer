import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * StackedBarChart —— 堆叠柱状图
 */
import { Rect, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverStrokeWidth, scaleBand, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';
export function StackedBarChart(props) {
    const { data, categories, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => `${p.series}-${p.category}`);
    const series = data ?? [
        { name: '搜索引擎', values: [104, 56, 136, 86, 70] },
        { name: '直接访问', values: [42, 55, 26, 60, 48] },
        { name: '推荐来源', values: [51, 36, 45, 20, 38] },
    ];
    const cats = categories ?? ['周一', '周二', '周三', '周四', '周五'];
    const xScale = scaleBand(cats, [0, PLOT_WIDTH], 0.3);
    const maxStacked = Math.max(...cats.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0))) * 1.1;
    const yScale = scaleLinear([0, maxStacked], [PLOT_HEIGHT, 0]);
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: yScale, orient: "y" }), cats.map((cat, ci) => {
                    const x = xScale(cat);
                    let accY = PLOT_HEIGHT;
                    return series.map((s, si) => {
                        const val = s.values[ci];
                        const fullH = PLOT_HEIGHT - yScale(val);
                        const h = animSize(fullH, progress);
                        const y = accY - h;
                        accY = accY - h;
                        const color = SEMANTIC_6[si % SEMANTIC_6.length];
                        const payload = {
                            series: s.name,
                            category: cat,
                            value: val,
                        };
                        return (_jsx(Rect, { x: x, y: y, width: xScale.bandwidth, height: h, fill: color, stroke: color, strokeWidth: hoverStrokeWidth(1, isHovering(`${s.name}-${cat}`)), ...bindHover(payload) }, `${cat}-${s.name}`));
                    });
                }), cats.map((cat, ci) => {
                    const x = xScale(cat);
                    let accY = PLOT_HEIGHT;
                    return series.map((s, si) => {
                        const val = s.values[ci];
                        const fullH = PLOT_HEIGHT - yScale(val);
                        const h = animSize(fullH, progress);
                        const midY = accY - h / 2;
                        accY = accY - h;
                        const labelValue = Math.round(val * progress);
                        if (progress < 0.4 || h < 12)
                            return null;
                        return (_jsx(Text, { x: x + xScale.bandwidth / 2, y: midY + 4, text: String(labelValue), fontSize: 10, fontFamily: "sans-serif", fill: "#fff", textAlign: "middle" }, `t-${cat}-${s.name}`));
                    });
                }), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" })] })) }));
}
export default StackedBarChart;
