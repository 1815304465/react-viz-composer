import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * StepLineChart —— 阶梯线图
 */
import { Path, Ellipse, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, useChartItemHover, hoverStrokeWidth, scaleBand, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';
export function StepLineChart(props) {
    const { data, categories, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => `${p.series}-${p.category}`);
    const series = data ?? [
        { name: '访问量', values: [120, 200, 150, 80, 70, 110, 130] },
        { name: '注册量', values: [80, 130, 90, 50, 40, 70, 90] },
        { name: '订单量', values: [40, 60, 50, 30, 20, 35, 45] },
    ];
    const cats = categories ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const xScale = scaleBand(cats, [0, PLOT_WIDTH], 0.1);
    const maxV = Math.max(...series.flatMap((s) => s.values)) * 1.1;
    const yScale = scaleLinear([0, maxV], [PLOT_HEIGHT, 0]);
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: yScale, orient: "y" }), series.map((s, idx) => {
                    const color = SEMANTIC_6[idx % SEMANTIC_6.length];
                    if (cats.length < 2)
                        return null;
                    let d = '';
                    for (let i = 0; i < cats.length; i++) {
                        const v = s.values[i];
                        const px = xScale(cats[i]) + xScale.bandwidth / 2;
                        const py = yScale(animValue(v, progress));
                        if (i === 0) {
                            d += `M ${px} ${py} `;
                        }
                        else {
                            const nextX = px;
                            const prevV = s.values[i - 1];
                            const prevPy = yScale(animValue(prevV, progress));
                            d += `H ${nextX} V ${py} `;
                        }
                    }
                    return (_jsx(Path, { d: d.trim(), fill: "none", stroke: color, strokeWidth: 2 }, `step-${s.name}`));
                }), series.map((s, idx) => {
                    const color = SEMANTIC_6[idx % SEMANTIC_6.length];
                    return s.values.map((v, i) => {
                        const px = xScale(cats[i]) + xScale.bandwidth / 2;
                        const py = yScale(animValue(v, progress));
                        const payload = {
                            series: s.name,
                            category: cats[i],
                            value: v,
                        };
                        const pointKey = `${s.name}-${cats[i]}`;
                        const hovered = isHovering(pointKey);
                        return (_jsx(Ellipse, { cx: px, cy: py, rx: hovered ? 7 : 5, ry: hovered ? 7 : 5, fill: "#fff", stroke: color, strokeWidth: hoverStrokeWidth(2, hovered), ...bindHover(payload) }, `${s.name}-${i}`));
                    });
                }), series.map((s, idx) => {
                    const color = SEMANTIC_6[idx % SEMANTIC_6.length];
                    const points = s.values.map((v, i) => ({
                        x: xScale(cats[i]) + xScale.bandwidth / 2,
                        y: yScale(animValue(v, progress)),
                    }));
                    if (progress < 0.5)
                        return null;
                    return (_jsx(Text, { x: points[points.length - 1].x + 8, y: points[points.length - 1].y + 4, text: s.name, fontSize: 11, fontFamily: "sans-serif", fill: color }, `label-${s.name}`));
                }), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" })] })) }));
}
export default StepLineChart;
