import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ExplorableScatterChart —— 可探索的大规模散点
 *
 * 体现：interactiveViewport 平移缩放、Canvas 命中、VizEvent onClick 选中聚类
 */
import { useMemo, useState } from 'react';
import { Ellipse, Line, Text, Rect } from '@react-viz-composer/core';
import { ExplorableChartFrame, animSize, CATEGORY_12, GRID_COLOR, TEXT_COLOR } from '@react-viz-composer/components';
const GROUP_LABELS = ['集群 A', '集群 B', '集群 C', '集群 D'];
/** 可探索散点图 */
function ExplorableScatterChart(props) {
    const { data } = props;
    const [activeGroup, setActiveGroup] = useState(null);
    const points = useMemo(() => data ?? [], [data]);
    const worldW = 900;
    const worldH = 700;
    return (_jsx(ExplorableChartFrame, { entryDuration: 700, children: (progress) => (_jsxs(_Fragment, { children: [Array.from({ length: 10 }).map((_, i) => {
                    const x = (worldW / 10) * i;
                    return (_jsx(Line, { points: [{ x, y: 0 }, { x, y: worldH }], stroke: GRID_COLOR, strokeWidth: 1, pointerEvents: "none" }, `vg-${i}`));
                }), Array.from({ length: 8 }).map((_, i) => {
                    const y = (worldH / 8) * i;
                    return (_jsx(Line, { points: [{ x: 0, y }, { x: worldW, y }], stroke: GRID_COLOR, strokeWidth: 1, pointerEvents: "none" }, `hg-${i}`));
                }), _jsx(Rect, { x: 0, y: 0, width: worldW, height: worldH, fill: "transparent", onClick: () => setActiveGroup(null) }), points.map((p, i) => {
                    const color = CATEGORY_12[p.group % CATEGORY_12.length];
                    const dimmed = activeGroup !== null && activeGroup !== p.group;
                    const r = animSize(dimmed ? 3 : 5, progress);
                    return (_jsx(Ellipse, { cx: p.x, cy: p.y, rx: r, ry: r, fill: color, opacity: dimmed ? 0.25 : 0.85, stroke: activeGroup === p.group ? '#000' : color, strokeWidth: activeGroup === p.group ? 1.5 : 0, zIndex: activeGroup === p.group ? 10 : p.group, onClick: (evt) => {
                            evt.stopPropagation();
                            setActiveGroup(p.group);
                        } }, `pt-${i}`));
                }), GROUP_LABELS.map((label, g) => {
                    const sample = points.find((p) => p.group === g);
                    if (!sample || progress < 0.5)
                        return null;
                    return (_jsx(Text, { x: sample.x + 12, y: sample.y - 12, text: label, fontSize: 12, fontFamily: "sans-serif", fill: activeGroup === g ? TEXT_COLOR : '#bfbfbf', fontWeight: activeGroup === g ? 'bold' : 'normal' }, `lbl-${g}`));
                }), activeGroup !== null && progress > 0.6 && (_jsx(Rect, { x: worldW - 160, y: 12, width: 148, height: 32, fill: "rgba(255,255,255,0.9)", stroke: GRID_COLOR, strokeWidth: 1, rx: 4, ry: 4, zIndex: 20 })), activeGroup !== null && progress > 0.6 && (_jsx(Text, { x: worldW - 86, y: 32, text: `已选 ${GROUP_LABELS[activeGroup]}`, fontSize: 11, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle", zIndex: 21 }))] })) }));
}
export default ExplorableScatterChart;
export { ExplorableScatterChart };
