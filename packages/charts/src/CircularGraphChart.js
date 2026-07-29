import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * CircularGraphChart —— 环形布局关系图
 *
 * 把节点均匀分布在圆周上，用 Line 连接边，有向边带箭头。
 * 不使用 d3-force，纯三角函数布局。
 */
import { Fragment } from 'react';
import { Ellipse, Line, Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animSize, useChartItemHover, hoverStrokeWidth, CATEGORY_12, TEXT_COLOR } from '@react-viz-composer/components';
export function CircularGraphChart(props) {
    const { nodes: nodesProp, edges: edgesProp, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => p.id);
    const ds = defaultCircularGraphData();
    const nodes = nodesProp ?? ds.nodes;
    const edges = edgesProp ?? ds.edges;
    const cx = PLOT_WIDTH / 2;
    const cy = PLOT_HEIGHT / 2;
    const radius = Math.min(PLOT_WIDTH, PLOT_HEIGHT) / 2 - 40;
    const nodeR = 12;
    // 构建节点 ID → 索引映射
    const nodeIndexMap = new Map();
    nodes.forEach((node, i) => nodeIndexMap.set(node.id, i));
    return (_jsx(ChartFrame, { children: (progress) => {
            const r = animSize(radius, progress);
            // 带动画的节点位置
            const animatedPos = new Map();
            nodes.forEach((node, i) => {
                const angle = -Math.PI / 2 + (2 * Math.PI * i) / nodes.length;
                animatedPos.set(node.id, {
                    x: cx + r * Math.cos(angle),
                    y: cy + r * Math.sin(angle),
                });
            });
            return (_jsxs(_Fragment, { children: [edges.map((edge, i) => {
                        const src = animatedPos.get(edge.source);
                        const tgt = animatedPos.get(edge.target);
                        if (!src || !tgt)
                            return null;
                        const dx = tgt.x - src.x;
                        const dy = tgt.y - src.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const trimR = animSize(nodeR, progress) + 2;
                        const endX = tgt.x - (dx / dist) * trimR;
                        const endY = tgt.y - (dy / dist) * trimR;
                        const startX = src.x + (dx / dist) * trimR;
                        const startY = src.y + (dy / dist) * trimR;
                        return (_jsxs(Fragment, { children: [_jsx(Line, { points: [
                                        { x: startX, y: startY },
                                        { x: endX, y: endY },
                                    ], stroke: CATEGORY_12[5], strokeWidth: 1.5, opacity: 0.5 }), drawArrowHead(endX, endY, dx / dist, dy / dist, 6)] }, `edge-${i}`));
                    }), nodes.map((node) => {
                        const pos = animatedPos.get(node.id);
                        if (!pos)
                            return null;
                        const color = CATEGORY_12[nodeIndexMap.get(node.id) % CATEGORY_12.length];
                        const hovered = isHovering(node.id);
                        const payload = { id: node.id, label: node.label, type: 'node' };
                        return (_jsxs(Fragment, { children: [_jsx(Ellipse, { cx: pos.x, cy: pos.y, rx: hovered ? nodeR + 3 : nodeR, ry: hovered ? nodeR + 3 : nodeR, fill: color, stroke: "#fff", strokeWidth: hoverStrokeWidth(2, hovered), zIndex: hovered ? 10 : 0, ...bindHover(payload) }), _jsx(Text, { x: pos.x, y: pos.y + animSize(nodeR + 16, progress), text: node.label, fontSize: 10, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle" })] }, node.id));
                    })] }));
        } }));
}
/** 绘制小箭头：三角形铺在 target 端 */
function drawArrowHead(tipX, tipY, dirX, dirY, size) {
    const perpX = -dirY;
    const perpY = dirX;
    const baseX = tipX - dirX * size;
    const baseY = tipY - dirY * size;
    const leftX = baseX + perpX * size * 0.4;
    const leftY = baseY + perpY * size * 0.4;
    const rightX = baseX - perpX * size * 0.4;
    const rightY = baseY - perpY * size * 0.4;
    const d = `M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
    return _jsx(Path, { d: d, fill: CATEGORY_12[5], opacity: 0.6 });
}
function defaultCircularGraphData() {
    return {
        nodes: [
            { id: 'A', label: '服务器A' },
            { id: 'B', label: '服务器B' },
            { id: 'C', label: '数据库' },
            { id: 'D', label: '缓存' },
            { id: 'E', label: '网关' },
            { id: 'F', label: '前端' },
            { id: 'G', label: '消息队列' },
        ],
        edges: [
            { source: 'F', target: 'E' },
            { source: 'E', target: 'A' },
            { source: 'E', target: 'B' },
            { source: 'A', target: 'C' },
            { source: 'B', target: 'C' },
            { source: 'A', target: 'D' },
            { source: 'B', target: 'D' },
            { source: 'A', target: 'G' },
            { source: 'B', target: 'G' },
        ],
    };
}
export default CircularGraphChart;
