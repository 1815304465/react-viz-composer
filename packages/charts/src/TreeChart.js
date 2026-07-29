import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TreeChart —— 树图（横向 tidy-tree）
 */
import { Rect, Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_HEIGHT, animValue, animSize, useChartItemHover, hoverStrokeWidth, CATEGORY_12 } from '@react-viz-composer/components';
const NODE_W = 100;
const NODE_H = 28;
const LEVEL_GAP = 130;
const MARGIN_TOP = 12;
export function TreeChart(props) {
    const { data, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => `${p.name}-${p.depth}`);
    const root = data ?? {
        name: '根节点',
        children: [
            {
                name: '子节点 A',
                children: [{ name: '叶子 A1' }, { name: '叶子 A2' }, { name: '叶子 A3' }],
            },
            {
                name: '子节点 B',
                children: [{ name: '叶子 B1' }, { name: '叶子 B2' }],
            },
            {
                name: '子节点 C',
                children: [
                    {
                        name: '子节点 C1',
                        children: [{ name: '叶子 C1-1' }, { name: '叶子 C1-2' }],
                    },
                    { name: '叶子 C2' },
                ],
            },
        ],
    };
    const layout = computeTreeLayout(root, PLOT_HEIGHT);
    return (_jsx(ChartFrame, { entryDuration: 900, children: (progress) => {
            const rootNode = layout[0];
            const linkProgress = Math.min(1, progress * 1.1);
            return (_jsxs(_Fragment, { children: [layout.map((n) => {
                        if (!n.parent)
                            return null;
                        const sx = n.parent.x + NODE_W;
                        const sy = n.parent.y;
                        const tx = rootNode.x + animValue(n.x - rootNode.x, linkProgress);
                        const ty = rootNode.y + animValue(n.y - rootNode.y, linkProgress);
                        const mx = (sx + tx) / 2;
                        return (_jsx(Path, { d: `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`, fill: "none", stroke: "#bfbfbf", strokeWidth: 1 }, `link-${n.depth}-${n.name}`));
                    }), layout.map((n, i) => {
                        const color = CATEGORY_12[n.depth % CATEGORY_12.length];
                        const x = rootNode.x + animValue(n.x - rootNode.x, progress);
                        const y = rootNode.y + animValue(n.y - rootNode.y, progress);
                        const payload = {
                            name: n.name,
                            depth: n.depth,
                            childCount: n.childCount,
                            leafCount: n.leafCount,
                        };
                        const nodeKey = `${n.name}-${n.depth}`;
                        const hovered = isHovering(nodeKey);
                        return (_jsx(Rect, { x: x, y: y - NODE_H / 2, width: animSize(NODE_W, progress), height: animSize(NODE_H, progress), fill: color, stroke: color, strokeWidth: hoverStrokeWidth(1, hovered), ...bindHover(payload) }, `node-${i}`));
                    }), layout.map((n, i) => {
                        const x = rootNode.x + animValue(n.x - rootNode.x, progress);
                        const y = rootNode.y + animValue(n.y - rootNode.y, progress);
                        if (progress < 0.15)
                            return null;
                        return (_jsx(Text, { x: x + NODE_W / 2, y: y + 4, text: n.name, fontSize: 11, fontFamily: "sans-serif", fill: "#fff", textAlign: "middle" }, `label-${i}`));
                    })] }));
        } }));
}
/** 统计叶子节点数量 */
function countLeaves(node) {
    if (!node.children?.length)
        return 1;
    return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}
/**
 * tidy-tree 布局：根在左，叶子纵向均匀分布
 * @param root 树根
 * @param plotHeight 绘图区高度
 */
function computeTreeLayout(root, plotHeight) {
    const leafTotal = countLeaves(root);
    const rowGap = Math.min(36, (plotHeight - MARGIN_TOP * 2) / Math.max(leafTotal, 1));
    const nodes = [];
    let leafIndex = 0;
    function walk(node, depth, parent) {
        const childCount = node.children?.length ?? 0;
        const leafCount = countLeaves(node);
        const ln = {
            name: node.name,
            x: depth * LEVEL_GAP + 16,
            y: 0,
            depth,
            parent,
            childCount,
            leafCount,
        };
        nodes.push(ln);
        if (childCount > 0) {
            const childLayouts = node.children.map((c) => walk(c, depth + 1, ln));
            ln.y = (childLayouts[0].y + childLayouts[childLayouts.length - 1].y) / 2;
        }
        else {
            ln.y = MARGIN_TOP + leafIndex * rowGap + NODE_H / 2;
            leafIndex += 1;
        }
        return ln;
    }
    walk(root, 0);
    return nodes;
}
export default TreeChart;
