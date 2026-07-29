import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * FunnelChart —— 漏斗图
 */
import { Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, useChartItemHover, hoverStrokeWidth, CATEGORY_12, TEXT_COLOR } from '@react-viz-composer/components';
export function FunnelChart(props) {
    const { data, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (d) => d.name);
    const items = data ?? [
        { name: '访问', value: 1000 },
        { name: '咨询', value: 700 },
        { name: '订单', value: 400 },
        { name: '点击', value: 200 },
        { name: '购买', value: 80 },
    ];
    const max = Math.max(...items.map((d) => d.value));
    const n = items.length;
    const rowH = PLOT_HEIGHT / n;
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [items.map((d, i) => {
                    const ratio = animValue(d.value, progress) / max;
                    const w = PLOT_WIDTH * ratio;
                    const x = (PLOT_WIDTH - w) / 2;
                    const y = i * rowH + 4;
                    const h = rowH - 8;
                    const nextRatio = i < n - 1
                        ? animValue(items[i + 1].value, progress) / max
                        : ratio * 0.7;
                    const wTop = PLOT_WIDTH * nextRatio;
                    const xTop = (PLOT_WIDTH - wTop) / 2;
                    const dStr = `M ${xTop} ${y} L ${xTop + wTop} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
                    const color = CATEGORY_12[i % CATEGORY_12.length];
                    const hovered = isHovering(d.name);
                    return (_jsx(Path, { d: dStr, fill: color, stroke: "#fff", strokeWidth: hoverStrokeWidth(2, hovered), ...bindHover(d) }, d.name));
                }), items.map((d, i) => {
                    const y = i * rowH + 4;
                    const h = rowH - 8;
                    if (progress < 0.3)
                        return null;
                    return (_jsx(Text, { x: PLOT_WIDTH / 2, y: y + h / 2 + 4, text: `${d.name}  ${Math.round(animValue(d.value, progress))}`, fontSize: 12, fontFamily: "sans-serif", fill: "#fff", textAlign: "middle" }, `t-${d.name}`));
                }), items.map((d, i) => {
                    const ratio = animValue(d.value, progress) / max;
                    const w = PLOT_WIDTH * ratio;
                    const y = i * rowH + 4;
                    const h = rowH - 8;
                    if (progress < 0.5)
                        return null;
                    return (_jsx(Text, { x: (PLOT_WIDTH - w) / 2 + w + 8, y: y + h / 2 + 4, text: `${(ratio * 100).toFixed(0)}%`, fontSize: 11, fontFamily: "sans-serif", fill: TEXT_COLOR }, `p-${d.name}`));
                })] })) }));
}
export default FunnelChart;
