import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ContourChart —— 等值线图
 *
 * 对二维标量场通过 Marching Squares 算法提取等值线。
 */
import { Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, CATEGORY_12, TEXT_COLOR } from '@react-viz-composer/components';
/** Marching Squares 线段查找表：从 4 位 corner 码到边索引对 */
const MS_LINES = {
    // 每个值对应 0 对或多对边：(edgeA, edgeB)，4 条边：0=top, 1=right, 2=bottom, 3=left
    0: [],
    1: [0, 3],
    2: [1, 0],
    3: [1, 3],
    4: [2, 1],
    5: [0, 1, 2, 3], // saddle: 按常规连接对边
    6: [0, 2],
    7: [2, 3],
    8: [3, 2],
    9: [0, 2],
    10: [0, 1, 3, 2], // saddle
    11: [1, 3],
    12: [3, 1],
    13: [1, 0],
    14: [3, 0],
    15: [],
};
/** 边索引 → 插值端点坐标 */
function edgePoints(_ri, _ci, side, cell, level) {
    const { tl, tr, br, bl, x, y, w, h } = cell;
    const interp = (v1, v2) => Math.abs(v1 - v2) < 1e-10 ? 0.5 : (level - v1) / (v2 - v1);
    switch (side) {
        case 0: { // top edge: tl → tr
            const t = interp(tl, tr);
            return { x: x + t * w, y };
        }
        case 1: { // right edge: tr → br
            const t = interp(tr, br);
            return { x: x + w, y: y + t * h };
        }
        case 2: { // bottom edge: bl → br
            const t = interp(bl, br);
            return { x: x + t * w, y: y + h };
        }
        case 3: { // left edge: tl → bl
            const t = interp(tl, bl);
            return { x, y: y + t * h };
        }
        default:
            return { x, y };
    }
}
export function ContourChart(props) {
    const { data, levels, rows, cols } = props;
    const grid = data ?? defaultContourData();
    const nr = grid.length;
    const nc = grid[0]?.length ?? 0;
    // 自动计算等值线层级
    const flat = grid.flat();
    const minV = Math.min(...flat);
    const maxV = Math.max(...flat);
    const contourLevels = levels ??
        Array.from({ length: 6 }, (_, i) => minV + ((maxV - minV) * (i + 1)) / 7);
    const cellW = PLOT_WIDTH / nc;
    const cellH = PLOT_HEIGHT / nr;
    // 行/列标签
    const rowLabels = rows ?? Array.from({ length: nr }, (_, i) => `R${i + 1}`);
    const colLabels = cols ?? Array.from({ length: nc }, (_, i) => `C${i + 1}`);
    return (_jsx(ChartFrame, { children: (progress) => (_jsxs(_Fragment, { children: [contourLevels.map((level, li) => {
                    const color = CATEGORY_12[li % CATEGORY_12.length];
                    const segments = [];
                    for (let ri = 0; ri < nr - 1; ri++) {
                        for (let ci = 0; ci < nc - 1; ci++) {
                            const tl = grid[ri][ci];
                            const tr = grid[ri][ci + 1];
                            const br = grid[ri + 1][ci + 1];
                            const bl = grid[ri + 1][ci];
                            // 4 位 corner code：bit 0=tl, 1=tr, 2=br, 3=bl（>= level 则为 1）
                            const code = (tl >= level ? 1 : 0) |
                                (tr >= level ? 1 : 0) << 1 |
                                (br >= level ? 1 : 0) << 2 |
                                (bl >= level ? 1 : 0) << 3;
                            const pairs = MS_LINES[code] ?? [];
                            const cell = {
                                tl,
                                tr,
                                br,
                                bl,
                                x: ci * cellW,
                                y: ri * cellH,
                                w: cellW,
                                h: cellH,
                            };
                            for (let pi = 0; pi < pairs.length; pi += 2) {
                                const p1 = edgePoints(ri, ci, pairs[pi], cell, level);
                                const p2 = edgePoints(ri, ci, pairs[pi + 1], cell, level);
                                segments.push(`M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
                            }
                        }
                    }
                    if (segments.length === 0)
                        return null;
                    return (_jsx(Path, { d: segments.join(' '), fill: "none", stroke: color, strokeWidth: animValue(1.5, progress) }, `cl-${li}`));
                }), colLabels.map((label, ci) => (_jsx(Text, { x: ci * cellW + cellW / 2, y: PLOT_HEIGHT + 16, text: label, fontSize: 10, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle" }, `x-${ci}`))), rowLabels.map((label, ri) => (_jsx(Text, { x: -8, y: ri * cellH + cellH / 2 + 4, text: label, fontSize: 10, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "end" }, `y-${ri}`)))] })) }));
}
function defaultContourData() {
    const rows = 15;
    const cols = 15;
    const out = [];
    for (let ri = 0; ri < rows; ri++) {
        const row = [];
        for (let ci = 0; ci < cols; ci++) {
            // 几个高斯峰叠加
            const cx1 = cols * 0.3;
            const cy1 = rows * 0.4;
            const cx2 = cols * 0.7;
            const cy2 = rows * 0.6;
            const d1 = Math.sqrt((ci - cx1) ** 2 + (ri - cy1) ** 2);
            const d2 = Math.sqrt((ci - cx2) ** 2 + (ri - cy2) ** 2);
            const v = Math.exp(-(d1 * d1) / 20) * 1.0 +
                Math.exp(-(d2 * d2) / 15) * 0.7 +
                Math.random() * 0.05;
            row.push(+v.toFixed(3));
        }
        out.push(row);
    }
    return out;
}
export default ContourChart;
