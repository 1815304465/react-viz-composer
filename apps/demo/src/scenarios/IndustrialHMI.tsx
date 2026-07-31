/**
 * IndustrialHMI —— 工业产线监控（动态数据版）
 *
 * 设备值以不同相位/速度在基线附近缓慢波动，传送带物料各自独立推进。
 * 故障事件间隔拉长（6~14 秒），避免频繁闪烁。
 * 展示数值按 decimals 截断，避免插值产生的超长浮点溢出卡片。
 */

import { useMemo } from 'react';
import {
  ReactVizComposer,
  Rect,
  Ellipse,
  Path,
  Text,
  Group,
} from 'react-viz-composer';
import { useSimulation, randomWalk } from './useSimulation';

/* ==================== 类型 ==================== */

interface Equipment {
  id: string; name: string;
  type: 'furnace' | 'press' | 'cnc' | 'conveyor' | 'qc';
  status: 'running' | 'idle' | 'alarm' | 'maintenance';
  x: number; y: number;
  baseline: number;
  amp: number;
  unit: string;
  decimals: number;
}

interface HmiState {
  equipments: Equipment[];
  values: number[];
  beltPhases: number[];
  beltSpeeds: number[];
  time: number;
  faultTimer: number;
}

/* ==================== 常量 ==================== */

const STATUS_COLORS: Record<Equipment['status'], string> = {
  running: '#52c41a', idle: '#d9d9d9', alarm: '#ff4d4f', maintenance: '#faad14',
};

const STATUS_LABELS: Record<Equipment['status'], string> = {
  running: '运行', idle: '待机', alarm: '告警', maintenance: '维保',
};

const TYPE_COLORS: Record<Equipment['type'], string> = {
  furnace: '#ff7a45', press: '#1677ff', cnc: '#722ed1', conveyor: '#13c2c2', qc: '#eb2f96',
};

/** 设计坐标系（随后按画布宽高缩放） */
const DESIGN_W = 720;
const DESIGN_H = 340;

const EQUIPMENTS: Equipment[] = [
  { id: 'F1', name: '熔炉 A', type: 'furnace', status: 'running', x: 70, y: 90, baseline: 1420, amp: 12, unit: '°C', decimals: 0 },
  { id: 'F2', name: '熔炉 B', type: 'furnace', status: 'running', x: 70, y: 200, baseline: 1380, amp: 10, unit: '°C', decimals: 0 },
  { id: 'P1', name: '冲压机', type: 'press', status: 'running', x: 210, y: 90, baseline: 60, amp: 3, unit: '次/min', decimals: 0 },
  { id: 'C1', name: 'CNC-01', type: 'cnc', status: 'running', x: 350, y: 50, baseline: 850, amp: 20, unit: 'rpm', decimals: 0 },
  { id: 'C2', name: 'CNC-02', type: 'cnc', status: 'running', x: 350, y: 145, baseline: 820, amp: 16, unit: 'rpm', decimals: 0 },
  { id: 'C3', name: 'CNC-03', type: 'cnc', status: 'running', x: 350, y: 240, baseline: 800, amp: 18, unit: 'rpm', decimals: 0 },
  { id: 'CV1', name: '传送带', type: 'conveyor', status: 'running', x: 490, y: 145, baseline: 3.2, amp: 0.1, unit: 'm/s', decimals: 1 },
  { id: 'QC1', name: '质检站', type: 'qc', status: 'running', x: 640, y: 145, baseline: 98.5, amp: 0.6, unit: '%', decimals: 1 },
];

const FLOW_LINES: Array<{ from: string; to: string }> = [
  { from: 'F1', to: 'P1' }, { from: 'F2', to: 'P1' },
  { from: 'P1', to: 'C1' }, { from: 'P1', to: 'C2' }, { from: 'P1', to: 'C3' },
  { from: 'C1', to: 'CV1' }, { from: 'C2', to: 'CV1' }, { from: 'C3', to: 'CV1' },
  { from: 'CV1', to: 'QC1' },
];

const EQ_W = 78;
const EQ_H = 52;
const W = 680;
const H = 440;
/** 降低刷新频率，避免数值闪烁过快 */
const SIM_INTERVAL_MS = 1200;
const BELT_COUNT = 5;

/* ==================== 工具 ==================== */

/**
 * 将设备数值格式化为适合卡片宽度的短文本
 * @param value 原始数值（可能含插值小数）
 * @param decimals 保留小数位
 * @param unit 单位
 */
function formatEquipValue(value: number, decimals: number, unit: string): string {
  return `${value.toFixed(decimals)} ${unit}`;
}

/* ==================== 种子 ==================== */

function createSeed(): HmiState {
  const values = EQUIPMENTS.map((e) => e.baseline);
  const beltPhases = Array.from({ length: BELT_COUNT }, () => Math.random());
  const beltSpeeds = Array.from({ length: BELT_COUNT }, () => 0.012 + Math.random() * 0.018);
  return { equipments: [...EQUIPMENTS], values, beltPhases, beltSpeeds, time: 0, faultTimer: 8 };
}

function simulateStep(state: HmiState, dt: number): HmiState {
  const newValues = state.values.map((v, i) => {
    const eq = state.equipments[i];
    if (eq.status !== 'running') {
      return eq.status === 'alarm' ? 0 : +(v * 0.7 + eq.baseline * 0.3).toFixed(eq.decimals);
    }
    const next = randomWalk(v, eq.baseline, eq.amp, eq.baseline * 0.5, eq.baseline * 1.3, 0.25);
    return +next.toFixed(eq.decimals);
  });

  const beltPhases = state.beltPhases.map((p, i) => (p + state.beltSpeeds[i] * dt) % 1);

  let equipments = state.equipments;
  let fTimer = state.faultTimer - dt;
  if (fTimer <= 0) {
    fTimer = 6 + Math.random() * 8;
    const targetable = equipments.filter((e) => e.type !== 'qc');
    const pick = targetable[Math.floor(Math.random() * targetable.length)];
    if (pick) {
      const nextStatus: Equipment['status'] =
        pick.status === 'running' ? (Math.random() < 0.4 ? 'alarm' : 'maintenance') : 'running';
      equipments = equipments.map((e) =>
        e.id === pick.id ? { ...e, status: nextStatus } : e,
      );
    }
  }

  return { ...state, equipments, values: newValues, beltPhases, time: state.time + dt, faultTimer: fTimer };
}

/* ==================== 组件 ==================== */

interface Props { width?: number; height?: number; }

/**
 * 工业产线 HMI：设备拓扑 + 实时数值 + 传送带物料
 * @param props.width 画布宽
 * @param props.height 画布高
 */
export function IndustrialHMI(props: Props) {
  const { width = W, height = H } = props;

  const seed = useMemo(() => createSeed(), []);
  const state = useSimulation(seed, simulateStep, SIM_INTERVAL_MS);

  /** 设计坐标 → 画布坐标的缩放（留出页眉/图例边距） */
  const sx = width / DESIGN_W;
  const sy = (height - 54) / DESIGN_H;
  const oy = 28;

  const nodeMap = useMemo(() => new Map(state.equipments.map((e) => [e.id, e])), [state.equipments]);
  const alarmCount = state.equipments.filter((e) => e.status === 'alarm').length;

  /**
   * 将设计坐标映射到当前画布
   * @param x 设计 x
   * @param y 设计 y
   */
  function mapPos(x: number, y: number) {
    return { x: x * sx, y: oy + y * sy };
  }

  const eqW = EQ_W * Math.min(1, sx);
  const eqH = EQ_H;

  return (
    <ReactVizComposer engine="canvas" width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill="#fafbfc" />

      <Rect x={0} y={0} width={width} height={28} fill={alarmCount > 0 ? '#fff2f0' : '#f0f5ff'} />
      <Text x={14} y={17} text="产线监控 · 一车间" fontSize={12} fontWeight="bold" fill="#1a1a2e" textBaseline="middle" />
      {alarmCount > 0 && (
        <Text x={width - 14} y={17} text={`⚠ ${alarmCount} 告警`} fontSize={11} fontWeight="bold" fill="#ff4d4f" textAlign="end" textBaseline="middle" />
      )}

      {/* 物料流线 */}
      {FLOW_LINES.map(({ from, to }, i) => {
        const a = nodeMap.get(from);
        const b = nodeMap.get(to);
        if (!a || !b) return null;
        const ap = mapPos(a.x, a.y);
        const bp = mapPos(b.x, b.y);
        const startX = ap.x + eqW / 2;
        const endX = bp.x - eqW / 2;
        const mx = (startX + endX) / 2;
        return (
          <Path
            key={`flow-${i}`}
            d={`M ${startX} ${ap.y} C ${mx} ${ap.y} ${mx} ${bp.y} ${endX} ${bp.y}`}
            fill="none" stroke="#e0e4e8" strokeWidth={2} strokeDasharray="6 3"
          />
        );
      })}

      {/* 设备 */}
      {state.equipments.map((eq, i) => {
        const val = state.values[i];
        const isAlarm = eq.status === 'alarm';
        const isOff = eq.status === 'idle' || eq.status === 'maintenance';
        const p = mapPos(eq.x, eq.y);
        return (
          <Group key={eq.id}>
            <Rect x={p.x - eqW / 2} y={p.y - eqH / 2} width={eqW} height={eqH} rx={6}
              fill={isAlarm ? '#fff2f0' : isOff ? '#fafafa' : '#fff'}
              stroke={isAlarm ? '#ffccc7' : '#e8e8e8'} strokeWidth={isAlarm ? 2 : 1}
            />
            <Rect x={p.x - eqW / 2 + 6} y={p.y - eqH / 2 + 6} width={eqW - 12} height={3} rx={1.5}
              fill={TYPE_COLORS[eq.type]} opacity={isOff ? 0.3 : 1}
            />
            <Ellipse cx={p.x} cy={p.y - 4} rx={5} ry={5} fill={STATUS_COLORS[eq.status]} />
            <Text x={p.x} y={p.y + 10} text={eq.name} fontSize={10} fill="#595959" textAlign="middle" />
            <Text x={p.x} y={p.y + eqH / 2 - 6}
              text={isAlarm ? '--' : formatEquipValue(val, eq.decimals, eq.unit)}
              fontSize={9} fontWeight="bold"
              fill={isAlarm ? '#ff4d4f' : '#262626'} textAlign="middle"
            />
          </Group>
        );
      })}

      {/* 传送带物料 */}
      {state.beltPhases.map((phase, i) => {
        const cv = nodeMap.get('CV1')!;
        const cp = mapPos(cv.x, cv.y);
        const l = cp.x - eqW / 2 + 8;
        const r = cp.x + eqW / 2 - 8;
        const bx = +(l + (r - l) * phase).toFixed(1);
        return <Ellipse key={`blt-${i}`} cx={bx} cy={cp.y} rx={4} ry={4} fill="#13c2c2" opacity={0.5} />;
      })}

      {/* 图例 */}
      <Group x={14} y={height - 26}>
        {(['running', 'idle', 'alarm', 'maintenance'] as const).map((s, idx) => (
          <Group key={s} x={idx * 68}>
            <Ellipse cx={0} cy={5} rx={4} ry={4} fill={STATUS_COLORS[s]} />
            <Text x={8} y={8} text={STATUS_LABELS[s]} fontSize={9} fill="#8c8c8c" />
          </Group>
        ))}
      </Group>
    </ReactVizComposer>
  );
}

export default IndustrialHMI;
