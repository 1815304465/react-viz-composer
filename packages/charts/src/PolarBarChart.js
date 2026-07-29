import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PolarBarChart —— 极坐标柱状图
 *
 * 分类沿圆周等间隔排列，柱子的高度（径向长度）表示数值。
 * 柱子用梯形 Path 绘制，从内圈向外辐射。
 */
import { Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverStrokeWidth, hoverOpacity, CATEGORY_12, TEXT_COLOR } from '@react-viz-composer/components';
export function PolarBarChart(props) {
    const { data, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (d) => d.name);
    const items = data ?? defaultPolarBarData();
    const maxVal = Math.max(...items.map((d) => d.value));
    const cx = PLOT_WIDTH / 2;
    const cy = PLOT_HEIGHT / 2;
    const innerR = 20;
    const maxBarR = Math.min(PLOT_WIDTH, PLOT_HEIGHT) / 2 - 40;
    const angleStep = (Math.PI * 2) / items.length;
    const barAngleWidth = angleStep * 0.7;
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [items.map((item, i) => {
                    const startAngle = -Math.PI / 2 + i * angleStep;
                    const midAngle = startAngle + angleStep / 2;
                    const barR = innerR + animSize((item.value / maxVal) * (maxBarR - innerR), progress);
                    const halfW = barAngleWidth / 2;
                    const a0 = midAngle - halfW;
                    const a1 = midAngle + halfW;
                    const innerX0 = cx + innerR * Math.cos(a0);
                    const innerY0 = cy + innerR * Math.sin(a0);
                    const innerX1 = cx + innerR * Math.cos(a1);
                    const innerY1 = cy + innerR * Math.sin(a1);
                    const outerX0 = cx + barR * Math.cos(a0);
                    const outerY0 = cy + barR * Math.sin(a0);
                    const outerX1 = cx + barR * Math.cos(a1);
                    const outerY1 = cy + barR * Math.sin(a1);
                    const d = `M ${innerX0} ${innerY0} L ${outerX0} ${outerY0} A ${barR} ${barR} 0 0 1 ${outerX1} ${outerY1} L ${innerX1} ${innerY1} A ${innerR} ${innerR} 0 0 0 ${innerX0} ${innerY0} Z`;
                    const color = CATEGORY_12[i % CATEGORY_12.length];
                    const hovered = isHovering(item.name);
                    return (_jsx(Path, { d: d, fill: color, stroke: color, strokeWidth: hoverStrokeWidth(0.5, hovered), opacity: hoverOpacity(0.85, hovered), ...bindHover(item) }, item.name));
                }), items.map((item, i) => {
                    if (progress < 0.4)
                        return null;
                    const midAngle = -Math.PI / 2 + i * angleStep + angleStep / 2;
                    const labelR = maxBarR + 16;
                    const lx = cx + labelR * Math.cos(midAngle);
                    const ly = cy + labelR * Math.sin(midAngle);
                    return (_jsx(Text, { x: lx, y: ly + 4, text: item.name, fontSize: 10, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle" }, `label-${item.name}`));
                })] })) }));
}
function defaultPolarBarData() {
    return [
        { name: '周一', value: 85 },
        { name: '周二', value: 60 },
        { name: '周三', value: 75 },
        { name: '周四', value: 45 },
        { name: '周五', value: 90 },
        { name: '周六', value: 55 },
        { name: '周日', value: 40 },
        { name: '平均', value: 64 },
    ];
}
export default PolarBarChart;
