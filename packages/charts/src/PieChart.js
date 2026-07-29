import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PieChart —— 饼图
 */
import { Path, Text, Rect } from '@react-viz-composer/core';
import { ChartFrame, CHART_WIDTH, CHART_HEIGHT, useChartItemHover, hoverStrokeWidth, CATEGORY_12, TEXT_COLOR, AXIS_COLOR } from '@react-viz-composer/components';
export function PieChart(props) {
    const { data, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (item) => item.name);
    const slices = data ?? [
        { name: '直接访问', value: 335 },
        { name: '搜索引擎', value: 310 },
        { name: '推荐链接', value: 234 },
        { name: '社交媒体', value: 135 },
    ];
    const total = slices.reduce((s, x) => s + x.value, 0);
    const cx = CHART_WIDTH / 2 - 80;
    const cy = CHART_HEIGHT / 2;
    const r = Math.min(cx, cy) - 20;
    return (_jsx(ChartFrame, { background: "#fff", entryDuration: 900, children: (progress) => {
            let startAngle = -Math.PI / 2;
            const arcs = slices.map((s) => {
                const angle = (s.value / total) * Math.PI * 2 * progress;
                const endAngle = startAngle + angle;
                const arc = { ...s, startAngle, endAngle, midAngle: startAngle + angle / 2 };
                startAngle = endAngle;
                return arc;
            });
            return (_jsxs(_Fragment, { children: [arcs.map((a, i) => {
                        if (a.endAngle <= a.startAngle)
                            return null;
                        const color = CATEGORY_12[i % CATEGORY_12.length];
                        const x0 = cx + r * Math.cos(a.startAngle);
                        const y0 = cy + r * Math.sin(a.startAngle);
                        const x1 = cx + r * Math.cos(a.endAngle);
                        const y1 = cy + r * Math.sin(a.endAngle);
                        const largeArc = a.endAngle - a.startAngle > Math.PI ? 1 : 0;
                        const d = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
                        const pct = ((a.value / total) * 100).toFixed(0);
                        const hovered = isHovering(a.name);
                        const payload = { ...a, percent: pct };
                        return (_jsx(Path, { d: d, fill: color, stroke: "#fff", strokeWidth: hoverStrokeWidth(2, hovered), ...bindHover(payload) }, a.name));
                    }), arcs.map((a) => {
                        if (progress < 0.6 || a.endAngle <= a.startAngle)
                            return null;
                        const labelR = r * 0.6;
                        const lx = cx + labelR * Math.cos(a.midAngle);
                        const ly = cy + labelR * Math.sin(a.midAngle);
                        const pct = ((a.value / total) * 100).toFixed(0);
                        return (_jsx(Text, { x: lx, y: ly + 4, text: `${pct}%`, fontSize: 12, fontWeight: "bold", fontFamily: "sans-serif", fill: "#fff", textAlign: "middle" }, `pct-${a.name}`));
                    }), slices.map((s, i) => {
                        const color = CATEGORY_12[i % CATEGORY_12.length];
                        const lx = CHART_WIDTH - 140;
                        const ly = 30 + i * 24;
                        const hovered = isHovering(s.name);
                        const payload = { ...s, percent: ((s.value / total) * 100).toFixed(0) };
                        return (_jsx(Rect, { x: lx, y: ly - 8, width: 12, height: 12, fill: color, stroke: AXIS_COLOR, strokeWidth: hoverStrokeWidth(1, hovered), ...bindHover(payload) }, `leg-${s.name}`));
                    }), slices.map((s, i) => (_jsx(Text, { x: CHART_WIDTH - 140 + 18, y: 30 + i * 24 + 2, text: s.name, fontSize: 12, fontFamily: "sans-serif", fill: TEXT_COLOR }, `leg-t-${s.name}`)))] }));
        } }));
}
export default PieChart;
