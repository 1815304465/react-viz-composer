/**
 * RealtimeDashboard —— 实时数据大屏（动态数据版）
 *
 * 模拟生产环境监控。所有 KPI/柱状图/趋势线/环形进度均通过
 * useSimulation 持续更新。布局按传入 width/height 自适应，避免右侧裁切。
 */

import { useMemo } from 'react';
import {
  ReactVizComposer,
  Rect,
  Line,
  Path,
  Text,
  Group,
} from 'react-viz-composer';
import { useSimulation, randomWalk } from './useSimulation';

/* ==================== 类型 ==================== */

interface KpiDef {
  title: string; unit: string;
  baseline: number; amp: number;
  format: (v: number) => string;
  color: string;
}

interface BarDef {
  label: string;
  baseline: number; amp: number; max: number;
}

interface DashState {
  kpis: number[];
  bars: number[];
  trend1: number[];
  trend2: number[];
  disk: number;
  mem: number;
  time: number;
}

/** 根据画布尺寸计算各面板几何 */
interface Layout {
  pad: number;
  gap: number;
  headerH: number;
  kpiY: number;
  kpiH: number;
  kpiW: number;
  kpiGap: number;
  contentY: number;
  contentH: number;
  leftW: number;
  rightW: number;
  rightX: number;
  trendH: number;
  ringH: number;
  ringY: number;
  ringW: number;
}

/* ==================== 数据 ==================== */

const KPI_DEFS: KpiDef[] = [
  { title: 'QPS', unit: 'req/s', baseline: 12800, amp: 200, format: (v) => Math.round(v).toLocaleString(), color: '#1677ff' },
  { title: 'P99 延迟', unit: 'ms', baseline: 23, amp: 1.5, format: (v) => Math.round(v).toString(), color: '#52c41a' },
  { title: 'CPU', unit: '%', baseline: 67, amp: 2, format: (v) => Math.round(v).toString(), color: '#fa8c16' },
  { title: '错误率', unit: '%', baseline: 0.12, amp: 0.02, format: (v) => (+v).toFixed(2), color: '#eb2f96' },
];

const BAR_DEFS: BarDef[] = [
  { label: '网关', baseline: 85, amp: 4, max: 100 },
  { label: '用户', baseline: 62, amp: 3, max: 100 },
  { label: '订单', baseline: 78, amp: 3.5, max: 100 },
  { label: '支付', baseline: 45, amp: 3, max: 100 },
  { label: '通知', baseline: 33, amp: 2.5, max: 100 },
  { label: '分析', baseline: 91, amp: 2, max: 100 },
];

const W = 680;
const H = 440;
/** 采样间隔；略慢于原先 300ms，减轻闪烁感 */
const SIM_INTERVAL_MS = 1200;
const TREND_LEN = 25;

/* ==================== 布局 ==================== */

/**
 * 按画布宽高计算面板位置，保证右侧面板落在可视区内
 * @param width 画布宽度
 * @param height 画布高度
 */
function computeLayout(width: number, height: number): Layout {
  const pad = 16;
  const gap = 12;
  const headerH = 28;
  const kpiY = headerH + 6;
  const kpiH = 68;
  const kpiGap = 10;
  const kpiW = (width - pad * 2 - kpiGap * 3) / 4;
  const contentY = kpiY + kpiH + gap;
  const contentH = height - contentY - pad;
  const leftW = Math.floor((width - pad * 2 - gap) * 0.5);
  const rightW = width - pad * 2 - gap - leftW;
  const rightX = pad + leftW + gap;
  const trendH = Math.floor(contentH * 0.48);
  const ringH = contentH - trendH - gap;
  const ringY = contentY + trendH + gap;
  const ringW = (rightW - gap) / 2;

  return {
    pad, gap, headerH, kpiY, kpiH, kpiW, kpiGap,
    contentY, contentH, leftW, rightW, rightX, trendH, ringH, ringY, ringW,
  };
}

/* ==================== 种子 / 突变 ==================== */

function createSeed(): DashState {
  return {
    kpis: KPI_DEFS.map((k) => k.baseline),
    bars: BAR_DEFS.map((b) => b.baseline),
    trend1: Array.from({ length: TREND_LEN }, () => 0.5),
    trend2: Array.from({ length: TREND_LEN }, () => 0.7),
    disk: 64,
    mem: 78,
    time: 0,
  };
}

function simulateStep(state: DashState, _dt: number): DashState {
  const kpis = state.kpis.map((v, i) =>
    randomWalk(v, KPI_DEFS[i].baseline, KPI_DEFS[i].amp, 0, KPI_DEFS[i].baseline * 2, 0.2),
  );

  const bars = state.bars.map((v, i) =>
    randomWalk(v, BAR_DEFS[i].baseline, BAR_DEFS[i].amp, 2, BAR_DEFS[i].max, 0.25),
  );

  const t1Last = state.trend1[state.trend1.length - 1];
  const t2Last = state.trend2[state.trend2.length - 1];
  const t1Next = +randomWalk(t1Last, 0.5, 0.03, 0.1, 0.9, 0.3).toFixed(3);
  const t2Next = +randomWalk(t2Last, 0.7, 0.025, 0.2, 0.9, 0.3).toFixed(3);

  const trend1 = [...state.trend1.slice(1), t1Next];
  const trend2 = [...state.trend2.slice(1), t2Next];

  const disk = randomWalk(state.disk, 64, 1, 30, 92, 0.3);
  const mem = randomWalk(state.mem, 78, 1.2, 25, 94, 0.3);

  return { ...state, kpis, bars, trend1, trend2, disk, mem, time: state.time + _dt };
}

/* ==================== 组件 ==================== */

interface Props { width?: number; height?: number; }

/**
 * 实时监控大屏：KPI / 服务负载 / 趋势 / 磁盘内存环形图
 * @param props.width 画布宽
 * @param props.height 画布高
 */
export function RealtimeDashboard(props: Props) {
  const { width = W, height = H } = props;

  const seed = useMemo(() => createSeed(), []);
  const state = useSimulation(seed, simulateStep, SIM_INTERVAL_MS);
  const layout = useMemo(() => computeLayout(width, height), [width, height]);

  const {
    pad, gap, headerH, kpiY, kpiH, kpiW, kpiGap,
    contentY, contentH, leftW, rightX, rightW, trendH, ringH, ringY, ringW,
  } = layout;

  return (
    <ReactVizComposer engine="canvas" width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill="#f5f7fa" />

      <Rect x={0} y={0} width={width} height={headerH} fill="#001529" />
      <Text x={16} y={17} text="实时监控 · PROD" fontSize={11} fontWeight="bold" fill="#fff" textBaseline="middle" />
      <Text x={width - 16} y={17} text="实时仿真中" fontSize={9} fill="rgba(255,255,255,0.4)" textAlign="end" textBaseline="middle" />

      {/* KPI 卡片 */}
      {KPI_DEFS.map((kpi, i) => {
        const v = state.kpis[i];
        const cx = pad + i * (kpiW + kpiGap);
        const sparkW = Math.min(38, kpiW * 0.22);
        return (
          <Group key={kpi.title}>
            <Rect x={cx} y={kpiY} width={kpiW} height={kpiH} rx={6} fill="#fff" stroke="#f0f0f0" strokeWidth={1} />
            <Rect x={cx + 8} y={kpiY + 6} width={kpiW - 16} height={2} rx={1} fill={kpi.color} />
            <Text x={cx + 12} y={kpiY + 22} text={kpi.title} fontSize={10} fill="#8c8c8c" />
            <Text x={cx + 12} y={kpiY + 42} text={kpi.format(v)} fontSize={18} fontWeight="bold" fill="#141414" />
            <Text x={cx + 12} y={kpiY + 58} text={kpi.unit} fontSize={9} fill="#8c8c8c" />
            <MiniTrend
              x={cx + kpiW - sparkW - 12}
              y={kpiY + 14}
              w={sparkW}
              h={36}
              values={i % 2 === 0 ? state.trend1 : state.trend2}
              color={kpi.color}
              n={15}
            />
          </Group>
        );
      })}

      {/* 柱状图 */}
      <Rect x={pad} y={contentY} width={leftW} height={contentH} rx={6} fill="#fff" stroke="#f0f0f0" strokeWidth={1} />
      <Text x={pad + 16} y={contentY + 18} text="服务负载" fontSize={11} fontWeight="bold" fill="#262626" />
      <BarsPanel bars={state.bars} defs={BAR_DEFS} px={pad} py={contentY} w={leftW} h={contentH} />

      {/* 趋势线 */}
      <Rect x={rightX} y={contentY} width={rightW} height={trendH} rx={6} fill="#fff" stroke="#f0f0f0" strokeWidth={1} />
      <Text x={rightX + 16} y={contentY + 18} text="请求趋势" fontSize={11} fontWeight="bold" fill="#262626" />
      <TrendPanel series={[state.trend1, state.trend2]} px={rightX} py={contentY} w={rightW} h={trendH} />

      {/* 环形 */}
      <Rect x={rightX} y={ringY} width={ringW} height={ringH} rx={6} fill="#fff" stroke="#f0f0f0" strokeWidth={1} />
      <Text x={rightX + 16} y={ringY + 18} text="磁盘" fontSize={10} fontWeight="bold" fill="#262626" />
      <Ring cx={rightX + ringW / 2} cy={ringY + ringH * 0.62} r={Math.min(28, ringH * 0.28)} value={state.disk} color="#fa8c16" />

      <Rect x={rightX + ringW + gap} y={ringY} width={ringW} height={ringH} rx={6} fill="#fff" stroke="#f0f0f0" strokeWidth={1} />
      <Text x={rightX + ringW + gap + 16} y={ringY + 18} text="内存" fontSize={10} fontWeight="bold" fill="#262626" />
      <Ring
        cx={rightX + ringW + gap + ringW / 2}
        cy={ringY + ringH * 0.62}
        r={Math.min(28, ringH * 0.28)}
        value={state.mem}
        color="#1677ff"
      />
    </ReactVizComposer>
  );
}

/* ==================== 子面板 ==================== */

function MiniTrend({ x, y, w, h, values, color, n }: { x: number; y: number; w: number; h: number; values: number[]; color: string; n: number }) {
  const s = values.slice(-n);
  if (s.length < 2) return null;
  const min = Math.min(...s);
  const max = Math.max(...s);
  const rng = max - min || 1;
  const d = s.map((v, i) => {
    const px = +(x + (i / (s.length - 1)) * w).toFixed(1);
    const py = +(y + h - ((v - min) / rng) * h).toFixed(1);
    return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
  }).join(' ');
  return <Path d={d} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />;
}

function BarsPanel({ bars, defs, px, py, w, h }: { bars: number[]; defs: BarDef[]; px: number; py: number; w: number; h: number }) {
  const top = py + 30;
  const ch = h - 48;
  const bw = Math.min(30, (w - 60) / defs.length * 0.55);
  const gap = (w - 60) / defs.length;

  return (
    <>
      {defs.map((def, i) => {
        const val = bars[i];
        const ratio = val / def.max;
        const bh = Math.max(4, ratio * ch * 0.5);
        const bx = px + 36 + i * gap;
        const by = top + ch * 0.5 - bh + 4;
        const color = val > 85 ? '#ff4d4f' : val > 65 ? '#fa8c16' : '#52c41a';
        return (
          <Group key={def.label}>
            <Rect x={bx} y={by} width={bw} height={bh} rx={3} fill={color} />
            <Text x={bx + bw / 2} y={top + ch * 0.5 + 16} text={def.label} fontSize={8} fill="#8c8c8c" textAlign="middle" />
            <Text x={bx + bw / 2} y={by - 6} text={`${Math.round(val)}`} fontSize={8} fill="#595959" textAlign="middle" />
          </Group>
        );
      })}
    </>
  );
}

function TrendPanel({ series, px, py, w, h }: { series: number[][]; px: number; py: number; w: number; h: number }) {
  const top = py + 26;
  const bottom = py + h - 8;
  const left = px + 20;
  const right = px + w - 16;
  const ch = bottom - top;
  const cw = right - left;
  const colors = ['#1677ff', '#52c41a'];

  return (
    <>
      {[0, 0.5, 1].map((r) => {
        const gy = +(bottom - r * ch).toFixed(1);
        return <Line key={`g-${r}`} points={[{ x: left, y: gy }, { x: right, y: gy }]} stroke="#f5f5f5" strokeWidth={1} />;
      })}
      {series.map((values, si) => {
        if (values.length < 2) return null;
        const d = values.map((v, i) => {
          const x = +(left + (i / (values.length - 1)) * cw).toFixed(1);
          const y = +(bottom - v * ch).toFixed(1);
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
        return <Path key={`tl-${si}`} d={d} fill="none" stroke={colors[si]} strokeWidth={2} />;
      })}
      {series.map((values, si) => (
        <Text key={`tv-${si}`} x={right - 4} y={top + 6 + si * 14}
          text={`${Math.round(values[values.length - 1] * 100)}%`}
          fontSize={9} fontWeight="bold" fill={colors[si]} textAlign="end"
        />
      ))}
    </>
  );
}

function Ring({ cx, cy, r, value, color }: { cx: number; cy: number; r: number; value: number; color: string }) {
  const ratio = Math.min(1, Math.max(0, value / 100));
  const sa = -Math.PI / 2;
  const ea = sa + ratio * Math.PI * 2;
  const x1 = +(cx + r * Math.cos(sa)).toFixed(1);
  const y1 = +(cy + r * Math.sin(sa)).toFixed(1);
  const x2 = +(cx + r * Math.cos(ea)).toFixed(1);
  const y2 = +(cy + r * Math.sin(ea)).toFixed(1);
  const large = ratio > 0.5 ? 1 : 0;
  const trackEndX = +(cx + r * Math.cos(sa + Math.PI * 1.999)).toFixed(1);
  const trackEndY = +(cy + r * Math.sin(sa + Math.PI * 1.999)).toFixed(1);

  return (
    <Group>
      <Path d={`M ${x1} ${y1} A ${r} ${r} 0 1 1 ${trackEndX} ${trackEndY}`} fill="none" stroke="#f0f0f0" strokeWidth={6} />
      {ratio > 0.001 && (
        <Path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={6} />
      )}
      <Text x={cx} y={cy + 3} text={`${Math.round(value)}%`} fontSize={14} fontWeight="bold" fill={color} textAlign="middle" textBaseline="middle" />
    </Group>
  );
}

export default RealtimeDashboard;
