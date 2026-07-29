import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ChordChart —— 弦图
 *
 * 外圈弧表示各分类总量，内部贝塞尔曲线带连接源→目标。
 * 简化实现：用 Path 弧线绘外圈 + 二次贝塞尔曲线近似弦带。
 */
import { Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverOpacity, CATEGORY_12, TEXT_COLOR } from '@react-viz-composer/components';
export function ChordChart(props) {
    const { nodes: nodesProp, links: linksProp, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => `${p.type}-${p.name}`);
    const defaultData = defaultChordData();
    const nodes = nodesProp ?? defaultData.nodes;
    const links = linksProp ?? defaultData.links;
    const total = nodes.reduce((s, n) => s + n.value, 0);
    const cx = PLOT_WIDTH / 2;
    const cy = PLOT_HEIGHT / 2;
    const outerR = Math.min(PLOT_WIDTH, PLOT_HEIGHT) / 2 - 30;
    const innerR = outerR * 0.55;
    return (_jsx(ChartFrame, { children: (progress) => {
            // 计算外圈弧
            const arcProgress = progress;
            let startAngle = -Math.PI / 2;
            const arcs = nodes.map((node) => {
                const angle = (node.value / total) * Math.PI * 2 * arcProgress;
                const endAngle = startAngle + angle;
                const arc = { ...node, startAngle, endAngle, midAngle: startAngle + angle / 2 };
                startAngle = endAngle;
                return arc;
            });
            return (_jsxs(_Fragment, { children: [arcs.map((arc, i) => {
                        if (arc.endAngle <= arc.startAngle)
                            return null;
                        const color = CATEGORY_12[i % CATEGORY_12.length];
                        const x0 = cx + outerR * Math.cos(arc.startAngle);
                        const y0 = cy + outerR * Math.sin(arc.startAngle);
                        const x1 = cx + outerR * Math.cos(arc.endAngle);
                        const y1 = cy + outerR * Math.sin(arc.endAngle);
                        const largeArc = arc.endAngle - arc.startAngle > Math.PI ? 1 : 0;
                        const d = `M ${x0} ${y0} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x1} ${y1}`;
                        const hovered = isHovering(`node-${arc.name}`);
                        const payload = { name: arc.name, value: arc.value, type: 'node' };
                        return (_jsx(Path, { d: d, fill: "none", stroke: color, strokeWidth: animSize(innerR - 8, progress) + 2, opacity: hoverOpacity(0.88, hovered), ...bindHover(payload) }, `arc-${arc.name}`));
                    }), links.map((link, i) => {
                        if (progress < 0.3)
                            return null;
                        const src = arcs[link.source];
                        const tgt = arcs[link.target];
                        if (!src || !tgt)
                            return null;
                        if (src.endAngle <= src.startAngle || tgt.endAngle <= tgt.startAngle)
                            return null;
                        const color = CATEGORY_12[(link.source + link.target * 2) % CATEGORY_12.length];
                        const srcAngle = src.midAngle;
                        const tgtAngle = tgt.midAngle;
                        const sx = cx + outerR * 0.82 * Math.cos(srcAngle);
                        const sy = cy + outerR * 0.82 * Math.sin(srcAngle);
                        const tx = cx + outerR * 0.82 * Math.cos(tgtAngle);
                        const ty = cy + outerR * 0.82 * Math.sin(tgtAngle);
                        // 二次贝塞尔控制点：偏向圆心
                        const midAngle = (srcAngle + tgtAngle) / 2;
                        const dist = Math.abs(srcAngle - tgtAngle) > Math.PI
                            ? outerR * 0.35
                            : outerR * 0.15;
                        const cpx = cx + dist * Math.cos(midAngle);
                        const cpy = cy + dist * Math.sin(midAngle);
                        const d = `M ${sx} ${sy} Q ${cpx} ${cpy} ${tx} ${ty}`;
                        const hovered = isHovering(`link-${src.name}-${tgt.name}`);
                        const payload = {
                            name: `${src.name} → ${tgt.name}`,
                            value: link.value,
                            type: 'link',
                        };
                        return (_jsx(Path, { d: d, fill: "none", stroke: color, strokeWidth: animSize(Math.max(1, link.value * 0.5), progress), opacity: hoverOpacity(0.5, hovered), ...bindHover(payload) }, `ribbon-${i}`));
                    }), arcs.map((arc, i) => {
                        if (progress < 0.5 || arc.endAngle <= arc.startAngle)
                            return null;
                        const labelR = (outerR + innerR) / 2;
                        const lx = cx + labelR * Math.cos(arc.midAngle);
                        const ly = cy + labelR * Math.sin(arc.midAngle);
                        return (_jsx(Text, { x: lx, y: ly + 4, text: arc.name, fontSize: 10, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle" }, `label-${arc.name}`));
                    })] }));
        } }));
}
function defaultChordData() {
    return {
        nodes: [
            { name: '北京', value: 28 },
            { name: '上海', value: 32 },
            { name: '广州', value: 20 },
            { name: '深圳', value: 18 },
            { name: '杭州', value: 14 },
        ],
        links: [
            { source: 0, target: 1, value: 12 },
            { source: 0, target: 2, value: 8 },
            { source: 1, target: 3, value: 10 },
            { source: 2, target: 3, value: 6 },
            { source: 1, target: 4, value: 5 },
            { source: 3, target: 4, value: 4 },
        ],
    };
}
export default ChordChart;
