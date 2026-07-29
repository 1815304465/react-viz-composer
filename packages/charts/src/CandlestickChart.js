import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CandlestickChart —— K线图
 */
import { Line, Rect, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, useChartItemHover, hoverStrokeWidth, scaleBand, scaleLinear, Axis, Grid, KLINE_UP, KLINE_DOWN, TEXT_COLOR } from '@react-viz-composer/components';
export function CandlestickChart(props) {
    const { data, onItemEnter, onItemLeave } = props;
    const { bindHover, isHovering } = useChartItemHover({ onItemEnter, onItemLeave }, (d) => d.date);
    const items = data ?? defaultKLineData();
    const xScale = scaleBand(items.map((d) => d.date), [0, PLOT_WIDTH], 0.3);
    const allMin = Math.min(...items.map((d) => d.low));
    const allMax = Math.max(...items.map((d) => d.high));
    const pad = (allMax - allMin) * 0.1;
    const yScale = scaleLinear([allMin - pad, allMax + pad], [PLOT_HEIGHT, 0]);
    const base = allMin - pad;
    return (_jsx(ChartFrame, { entryDuration: 900, children: (progress) => {
            const animPrice = (v) => base + animValue(v - base, progress);
            return (_jsxs(_Fragment, { children: [_jsx(Grid, { scale: yScale, orient: "y" }), items.map((d) => {
                        const x = xScale(d.date);
                        const bw = xScale.bandwidth;
                        const cx = x + bw / 2;
                        const isUp = d.close >= d.open;
                        const color = isUp ? KLINE_UP : KLINE_DOWN;
                        const yHigh = yScale(animPrice(d.high));
                        const yLow = yScale(animPrice(d.low));
                        return (_jsx(Line, { points: [
                                { x: cx, y: yHigh },
                                { x: cx, y: yLow },
                            ], stroke: color, strokeWidth: 1 }, `w-${d.date}`));
                    }), items.map((d) => {
                        const x = xScale(d.date);
                        const bw = xScale.bandwidth;
                        const isUp = d.close >= d.open;
                        const color = isUp ? KLINE_UP : KLINE_DOWN;
                        const yOpen = yScale(animPrice(d.open));
                        const yClose = yScale(animPrice(d.close));
                        const bodyTop = Math.min(yOpen, yClose);
                        const bodyH = Math.max(Math.abs(yClose - yOpen), 1);
                        const hovered = isHovering(d.date);
                        return (_jsx(Rect, { x: x + 1, y: bodyTop, width: Math.max(bw - 2, 1), height: bodyH, fill: color, stroke: color, strokeWidth: hoverStrokeWidth(1, hovered), ...bindHover(d) }, d.date));
                    }), _jsx(Axis, { scale: xScale, orient: "bottom", tickFormat: () => '' }), _jsx(Axis, { scale: yScale, orient: "left" }), progress > 0.8 && (_jsx(Text, { x: PLOT_WIDTH - 40, y: 12, text: `最高 ${Math.max(...items.map((item) => item.high)).toFixed(1)}`, fontSize: 10, fontFamily: "sans-serif", fill: TEXT_COLOR }))] }));
        } }));
}
function defaultKLineData() {
    const out = [];
    let prev = 100;
    for (let i = 0; i < 30; i++) {
        const open = prev;
        const close = open + (Math.random() - 0.5) * 8;
        const high = Math.max(open, close) + Math.random() * 4;
        const low = Math.min(open, close) - Math.random() * 4;
        out.push({
            date: `${i + 1}`,
            open: +open.toFixed(2),
            close: +close.toFixed(2),
            high: +high.toFixed(2),
            low: +low.toFixed(2),
        });
        prev = close;
    }
    return out;
}
export default CandlestickChart;
