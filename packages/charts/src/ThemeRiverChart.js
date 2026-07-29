import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ThemeRiverChart —— 主题河流图
 *
 * 堆叠平滑面积图，随时间流动。
 * 每个"河流"用三次贝塞尔曲线 Path 绘制填充区域。
 */
import { useMemo } from 'react';
import { Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, useChartItemHover, hoverOpacity, scaleBand, scaleLinear, Axis, Grid, CATEGORY_12, animValue } from '@react-viz-composer/components';
export function ThemeRiverChart(props) {
    const { categories, series, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (p) => p.name);
    const cats = categories ?? ['1月', '2月', '3月', '4月', '5月', '6月', '7月'];
    const sers = series ?? [
        { name: '产品A', values: [30, 50, 35, 45, 60, 40, 55] },
        { name: '产品B', values: [20, 30, 25, 40, 35, 30, 45] },
        { name: '产品C', values: [15, 25, 20, 30, 25, 20, 35] },
    ];
    const n = cats.length;
    // 堆叠计算
    const stacked = useMemo(() => {
        const result = sers.map(() => new Array(n).fill(0));
        for (let j = 0; j < n; j++) {
            let running = 0;
            for (let i = 0; i < sers.length; i++) {
                running += sers[i].values[j];
                result[i][j] = running;
            }
        }
        return result;
    }, [sers, n]);
    const maxTotal = Math.max(...stacked[stacked.length - 1]);
    const xScale = useMemo(() => scaleBand(cats, [0, PLOT_WIDTH], 0.3), [cats]);
    const yScale = useMemo(() => scaleLinear([0, maxTotal * 1.1], [PLOT_HEIGHT, 0]), [maxTotal]);
    /** 获取某个索引对应的 x 位置（band 中心） */
    function xAt(i) {
        return xScale(cats[i]) + xScale.bandwidth / 2;
    }
    return (_jsx(ChartFrame, { background: "#fff", entryDuration: 900, children: (progress) => (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: yScale, orient: "y" }), _jsx(Axis, { scale: xScale, orient: "bottom" }), _jsx(Axis, { scale: yScale, orient: "left" }), sers.map((ser, i) => {
                    const top = stacked[i];
                    const bottom = i > 0 ? stacked[i - 1] : new Array(n).fill(0);
                    const color = CATEGORY_12[i % CATEGORY_12.length];
                    // 构建 top/bottom 点坐标
                    const topPts = top.map((v, j) => ({
                        x: xAt(j),
                        y: yScale(v),
                    }));
                    const bottomPts = bottom.map((v, j) => ({
                        x: xAt(j),
                        y: yScale(v),
                    }));
                    const hovered = isHovering(ser.name);
                    const payload = { name: ser.name };
                    // 动画：y 轴从底部展开
                    const baseline = PLOT_HEIGHT;
                    const animatedTopPts = topPts.map((p) => ({
                        x: p.x,
                        y: baseline + animValue(p.y - baseline, progress),
                    }));
                    const animatedBottomPts = bottomPts.map((p) => ({
                        x: p.x,
                        y: baseline + animValue(p.y - baseline, progress),
                    }));
                    let animD = `M ${animatedTopPts[0].x} ${animatedTopPts[0].y}`;
                    for (let j = 0; j < animatedTopPts.length - 1; j++) {
                        const cp1x = animatedTopPts[j].x + (animatedTopPts[j + 1].x - animatedTopPts[j].x) / 3;
                        const cp2x = animatedTopPts[j + 1].x - (animatedTopPts[j + 1].x - animatedTopPts[j].x) / 3;
                        animD += ` C ${cp1x} ${animatedTopPts[j].y}, ${cp2x} ${animatedTopPts[j + 1].y}, ${animatedTopPts[j + 1].x} ${animatedTopPts[j + 1].y}`;
                    }
                    for (let j = animatedBottomPts.length - 1; j >= 0; j--) {
                        if (j === animatedBottomPts.length - 1) {
                            animD += ` L ${animatedBottomPts[j].x} ${animatedBottomPts[j].y}`;
                        }
                        else {
                            const cp1x = animatedBottomPts[j + 1].x + (animatedBottomPts[j].x - animatedBottomPts[j + 1].x) / 3;
                            const cp2x = animatedBottomPts[j].x - (animatedBottomPts[j].x - animatedBottomPts[j + 1].x) / 3;
                            animD += ` C ${cp1x} ${animatedBottomPts[j + 1].y}, ${cp2x} ${animatedBottomPts[j].y}, ${animatedBottomPts[j].x} ${animatedBottomPts[j].y}`;
                        }
                    }
                    animD += ' Z';
                    if (progress < 0.01)
                        return null;
                    return (_jsx(Path, { d: animD, fill: color, opacity: hoverOpacity(0.65, hovered), stroke: color, strokeWidth: 0.5, ...bindHover(payload) }, ser.name));
                }), progress > 0.3 && sers.map((ser, i) => (_jsx(Text, { x: PLOT_WIDTH - 80, y: 14 + i * 18, text: ser.name, fontSize: 11, fontFamily: "sans-serif", fill: CATEGORY_12[i % CATEGORY_12.length] }, `leg-${ser.name}`)))] })) }));
}
export default ThemeRiverChart;
