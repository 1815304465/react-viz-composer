import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * NetworkGraphChart —— 网络图
 *
 * 接收带位置的节点和边数据，渲染为 Ellipse + Line。
 * 布局（力模拟）由上层的示例代码负责，图表本身不内置布局算法。
 */
import { useMemo } from 'react';
import { Ellipse, Line, Text } from '@react-viz-composer/core';
import { ChartFrame, useChartItemHover, hoverStrokeWidth, hoverOpacity, CATEGORY_12, TEXT_COLOR, animValue } from '@react-viz-composer/components';
const NODE_R = 14;
export function NetworkGraphChart(props) {
    const { nodes, edges, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => p.id);
    const rawNodes = nodes ?? [
        { id: 'React', label: 'React', x: 150, y: 100 },
        { id: 'Vue', label: 'Vue', x: 350, y: 80 },
        { id: 'Angular', label: 'Angular', x: 100, y: 280 },
        { id: 'Svelte', label: 'Svelte', x: 400, y: 300 },
        { id: 'Solid', label: 'SolidJS', x: 250, y: 200 },
        { id: 'Preact', label: 'Preact', x: 500, y: 180 },
        { id: 'Lit', label: 'Lit', x: 520, y: 320 },
        { id: 'Qwik', label: 'Qwik', x: 300, y: 360 },
    ];
    const rawEdges = edges ?? [
        { source: 'React', target: 'Vue' },
        { source: 'React', target: 'Angular' },
        { source: 'React', target: 'Svelte' },
        { source: 'React', target: 'Preact' },
        { source: 'Vue', target: 'Angular' },
        { source: 'Vue', target: 'Solid' },
        { source: 'Angular', target: 'Svelte' },
        { source: 'Svelte', target: 'Solid' },
        { source: 'Solid', target: 'Preact' },
        { source: 'Preact', target: 'Qwik' },
        { source: 'Lit', target: 'Qwik' },
        { source: 'Lit', target: 'Svelte' },
    ];
    // 将节点数组转为 id → 位置的 Map
    const positions = useMemo(() => {
        const map = new Map();
        rawNodes.forEach((n) => map.set(n.id, { x: n.x, y: n.y }));
        return map;
    }, [rawNodes]);
    // 计算每个节点的 degree
    const degree = useMemo(() => {
        const map = new Map();
        rawNodes.forEach((n, i) => map.set(n.id, 0));
        rawEdges.forEach((e) => {
            map.set(e.source, (map.get(e.source) ?? 0) + 1);
            map.set(e.target, (map.get(e.target) ?? 0) + 1);
        });
        return map;
    }, [rawNodes, rawEdges]);
    return (_jsx(ChartFrame, { background: "#fff", entryDuration: 900, children: (progress) => (_jsxs(_Fragment, { children: [rawEdges.map((e, i) => {
                    const sp = positions.get(e.source);
                    const tp = positions.get(e.target);
                    if (!sp || !tp)
                        return null;
                    return (_jsx(Line, { points: [
                            { x: sp.x, y: sp.y },
                            { x: sp.x + animValue(tp.x - sp.x, progress), y: sp.y + animValue(tp.y - sp.y, progress) },
                        ], stroke: '#cccccc', strokeWidth: 1, opacity: animValue(0.6, progress) }, `edge-${i}`));
                }), rawNodes.map((n, i) => {
                    const pos = positions.get(n.id);
                    if (!pos)
                        return null;
                    const color = CATEGORY_12[i % CATEGORY_12.length];
                    const r = animValue(NODE_R, progress);
                    const hovered = isHovering(n.id);
                    const label = n.label ?? n.id;
                    const payload = {
                        id: n.id,
                        label,
                        degree: degree.get(n.id) ?? 0,
                    };
                    return (_jsx(Ellipse, { cx: pos.x, cy: pos.y, rx: r, ry: r, fill: color, opacity: hoverOpacity(0.85, hovered), stroke: color, strokeWidth: hoverStrokeWidth(1.5, hovered), ...bindHover(payload) }, n.id));
                }), progress > 0.3 &&
                    rawNodes.map((n, i) => {
                        const pos = positions.get(n.id);
                        if (!pos)
                            return null;
                        const label = n.label ?? n.id;
                        return (_jsx(Text, { x: pos.x, y: pos.y + NODE_R + 14, text: label, fontSize: 11, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle", opacity: animValue(1, progress) }, `lab-${n.id}`));
                    })] })) }));
}
export default NetworkGraphChart;
