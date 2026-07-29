import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * LiquidFillChart —— 水球图 / 液态填充图
 *
 * 圆形内带波浪水面填充。中心显示百分比文字。
 * 入场后波浪持续循环流动，振幅呼吸式变化。
 */
import { useState, useEffect, useRef } from 'react';
import { Path, Ellipse, Text, ClipPath } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, SEMANTIC_6, TEXT_COLOR, animValue } from '@react-viz-composer/components';
import { useVizFrame } from '@react-viz-composer/core';
import { useEntryProgress } from '@react-viz-composer/components';
/** 持续动画 hook：管理入场后的持续计时。必须在 EntryProgressProvider 内部调用。 */
function useSustainT() {
    const progress = useEntryProgress();
    const isIdle = progress >= 1;
    const [t, setT] = useState(0);
    const { requestFrame } = useVizFrame();
    const startRef = useRef(0);
    useEffect(() => {
        if (!isIdle) {
            startRef.current = 0;
            setT(0);
            return;
        }
        if (startRef.current === 0)
            startRef.current = performance.now();
        const tick = () => {
            setT((performance.now() - startRef.current) / 1000);
        };
        const unsub = requestFrame(tick);
        return () => { unsub(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isIdle]);
    return t;
}
export function LiquidFillChart(props) {
    const max = props.max ?? 100;
    const value = props.value ?? 72;
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const cx = PLOT_WIDTH / 2;
    const cy = PLOT_HEIGHT / 2;
    const r = Math.min(cx, cy) - 20;
    return (_jsx(ChartFrame, { background: "#fff", entryDuration: 1200, children: (progress) => (_jsx(WaterBallInner, { cx: cx, cy: cy, r: r, pct: pct, progress: progress })) }));
}
/** 内部组件：持有持续动画状态 */
function WaterBallInner({ cx, cy, r, pct, progress, }) {
    const sustainT = useSustainT();
    const isIdle = progress >= 1;
    // 水面高度：入场时从 0 → 目标，空闲时轻微呼吸式振荡
    const targetWaterH = (pct / 100) * 2 * r;
    const waterLevelOffset = isIdle
        ? Math.sin(sustainT * 0.3) * r * 0.015
        : 0;
    const waterLevel = cy + r - animValue(targetWaterH, progress) + waterLevelOffset;
    // 波浪相位：入场时随 progress 推进，空闲时缓慢持续流动
    const waveSpeed = 0.7;
    const wavePhase = isIdle
        ? sustainT * waveSpeed * Math.PI
        : progress * Math.PI * 6;
    const startX = cx - r;
    const endX = cx + r;
    const bottomY = cy + r;
    const steps = 60;
    // 振幅呼吸：空闲时在 0.6x ~ 1.4x 之间缓慢变化（周期约 15 秒）
    const breatheFactor = isIdle
        ? 1 + Math.sin(sustainT * 0.4) * 0.4
        : 1;
    const amplitude = 10 * breatheFactor;
    const frequency = 0.04;
    // 波浪上边界（waveOffset 是相对偏移，waterLevel 是绝对水面基准）
    let waveSurfaceD = '';
    for (let i = 0; i <= steps; i++) {
        const sx = startX + (endX - startX) * (i / steps);
        const waveOffset = amplitude * Math.sin(sx * frequency + wavePhase) +
            amplitude * 0.6 * Math.sin(sx * frequency * 2.3 - wavePhase * 0.7);
        const sy = waterLevel + waveOffset;
        if (i === 0)
            waveSurfaceD = `M ${sx} ${sy}`;
        else
            waveSurfaceD += ` L ${sx} ${sy}`;
    }
    const fullWaterD = `${waveSurfaceD} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
    // 第二层波浪
    const wavePhase2 = wavePhase + Math.PI / 2;
    const amp2Base = 6 * breatheFactor;
    let d2 = '';
    for (let i = 0; i <= steps; i++) {
        const sx = startX + (endX - startX) * (i / steps);
        const waveOffset2 = amp2Base * Math.sin(sx * frequency + wavePhase2) +
            amp2Base * 0.5 * Math.sin(sx * frequency * 2.5 - wavePhase2 * 0.6);
        const sy = waterLevel + 4 + waveOffset2;
        if (i === 0)
            d2 = `M ${sx} ${sy}`;
        else
            d2 += ` L ${sx} ${sy}`;
    }
    const displayValue = isIdle ? pct : Math.round(pct * progress);
    return (_jsxs(_Fragment, { children: [_jsx(ClipPath, { id: "water-clip", shapeType: "ellipse", shapeData: { cx, cy, rx: r, ry: r } }), _jsx(Ellipse, { cx: cx, cy: cy, rx: r, ry: r, fill: "#e8f4fd", stroke: SEMANTIC_6[0], strokeWidth: 2 }), progress > 0.02 && (_jsx(Path, { d: fullWaterD, fill: SEMANTIC_6[0], opacity: 0.6, clipPath: "url(#water-clip)" })), progress > 0.05 && (_jsx(Path, { d: `${d2} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`, fill: SEMANTIC_6[0], opacity: 0.35, clipPath: "url(#water-clip)" })), _jsx(Ellipse, { cx: cx, cy: cy, rx: r, ry: r, fill: "none", stroke: SEMANTIC_6[0], strokeWidth: 3 }), progress > 0.15 && (_jsxs(_Fragment, { children: [_jsx(Text, { x: cx, y: cy - 8, text: `${displayValue}%`, fontSize: 32, fontWeight: "bold", fontFamily: "sans-serif", fill: SEMANTIC_6[0], opacity: 0.9, textAlign: "middle" }), _jsx(Text, { x: cx, y: cy + 22, text: "\u5B8C\u6210\u7387", fontSize: 13, fontFamily: "sans-serif", fill: TEXT_COLOR, textAlign: "middle" })] }))] }));
}
export default LiquidFillChart;
