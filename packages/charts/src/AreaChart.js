import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AreaChart —— 面积图
 */
import { Path, Ellipse, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, useChartItemHover, hoverStrokeWidth, scaleBand, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';
export function AreaChart(props) {
    const { data, categories, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => `${p.series}-${p.category}`);
    const series = data ?? [
        { name: '产品A', values: [120, 200, 150, 80, 70, 110, 130] },
        { name: '产品B', values: [80, 130, 90, 50, 40, 70, 90] },
    ];
    const cats = categories ?? ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'];
    const xScale = scaleBand(cats, [0, PLOT_WIDTH], 0.05);
    const maxV = Math.max(...series.flatMap((s) => s.values)) * 1.1;
    const yScale = scaleLinear([0, maxV], [PLOT_HEIGHT, 0]);
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: yScale, orient: "y" }), series.map((s, idx) => {
                    const color = SEMANTIC_6[idx % SEMANTIC_6.length];
                    const points = s.values.map((v, i) => ({
                        x: xScale(cats[i]) + xScale.bandwidth / 2,
                        y: yScale(animValue(v, progress)),
                    }));
                    const areaD = `M ${points[0].x} ${PLOT_HEIGHT} ` +
                        points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
                        ` L ${points[points.length - 1].x} ${PLOT_HEIGHT} Z`;
                    return (_jsx(Path, { d: areaD, fill: color + '40', stroke: "none" }, `area-${s.name}`));
                }), series.map((s, idx) => {
                    const color = SEMANTIC_6[idx % SEMANTIC_6.length];
                    const points = s.values.map((v, i) => ({
                        x: xScale(cats[i]) + xScale.bandwidth / 2,
                        y: yScale(animValue(v, progress)),
                    }));
                    const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    return (_jsx(Path, { d: lineD, fill: "none", stroke: color, strokeWidth: 2 }, `line-${s.name}`));
                }), series.map((s, idx) => {
                    const color = SEMANTIC_6[idx % SEMANTIC_6.length];
                    return s.values.map((v, i) => {
                        const payload = {
                            series: s.name,
                            category: cats[i],
                            value: v,
                        };
                        const pointKey = `${s.name}-${cats[i]}`;
                        const hovered = isHovering(pointKey);
                        return (_jsx(Ellipse, { cx: xScale(cats[i]) + xScale.bandwidth / 2, cy: yScale(animValue(v, progress)), rx: hovered ? 6 : 4, ry: hovered ? 6 : 4, fill: "#fff", stroke: color, strokeWidth: hoverStrokeWidth(2, hovered), ...bindHover(payload) }, `${s.name}-${i}`));
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
export default AreaChart;
