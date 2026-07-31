/**
 * SmartCampus —— 智慧园区（动态数据版）
 *
 * 楼宇能耗/入驻率缓慢波动，停车位动态变化，环境传感器持续更新。
 * 各项以不同 baseline/amp 独立变化，使用 randomWalk 防止漂移。
 */

import { useMemo } from 'react';
import {
  ReactVizComposer,
  Rect,
  Ellipse,
  Line,
  Text,
  Group,
} from 'react-viz-composer';
import { useSimulation, randomWalk } from './useSimulation';

/* ==================== 类型 ==================== */

interface BldDef { id: string; name: string; type: string; x: number; y: number; w: number; h: number; color: string; occBase: number; enBase: number; enAmp: number; }
interface ParkDef { id: string; name: string; x: number; y: number; total: number; usedBase: number; usedAmp: number; }
interface SensorDef { id: string; name: string; x: number; y: number; base: number; amp: number; unit: string; decimals: number; }

interface CampusState {
  energies: number[];
  occupancies: number[];
  parkingUsed: number[];
  sensorValues: number[];
  time: number;
}

/* ==================== 数据 ==================== */

const W = 800; const H = 400;
const SIM_INTERVAL_MS = 300;

const BLDS: BldDef[] = [
  { id: 'A', name: '研发A', type: '办公', x: 60, y: 54, w: 135, h: 78, color: '#1677ff', occBase: 92, enBase: 380, enAmp: 12 },
  { id: 'B', name: '研发B', type: '办公', x: 230, y: 54, w: 115, h: 78, color: '#52c41a', occBase: 85, enBase: 310, enAmp: 10 },
  { id: 'C', name: '数据中心', type: '机房', x: 380, y: 54, w: 105, h: 78, color: '#fa8c16', occBase: 100, enBase: 1250, enAmp: 30 },
  { id: 'D', name: '综合楼', type: '综合', x: 520, y: 54, w: 125, h: 78, color: '#722ed1', occBase: 78, enBase: 220, enAmp: 8 },
  { id: 'E', name: '车间', type: '生产', x: 60, y: 168, w: 190, h: 68, color: '#13c2c2', occBase: 95, enBase: 890, enAmp: 25 },
  { id: 'F', name: '仓储', type: '仓储', x: 280, y: 168, w: 155, h: 68, color: '#eb2f96', occBase: 60, enBase: 150, enAmp: 5 },
  { id: 'G', name: '公寓', type: '住宿', x: 465, y: 168, w: 170, h: 68, color: '#2f54eb', occBase: 88, enBase: 420, enAmp: 14 },
];

const PARKS: ParkDef[] = [
  { id: 'P1', name: '车库A', x: 30, y: 282, total: 300, usedBase: 247, usedAmp: 5 },
  { id: 'P2', name: '车库B', x: 215, y: 282, total: 200, usedBase: 89, usedAmp: 3 },
  { id: 'P3', name: '地面', x: 400, y: 282, total: 150, usedBase: 138, usedAmp: 3 },
  { id: 'P4', name: '货车区', x: 585, y: 282, total: 40, usedBase: 22, usedAmp: 2 },
];

const SENSORS: SensorDef[] = [
  { id: 's1', name: '温度', x: 660, y: 80, base: 23.5, amp: 0.3, unit: '°C', decimals: 1 },
  { id: 's2', name: '湿度', x: 660, y: 130, base: 55, amp: 2, unit: '%', decimals: 0 },
  { id: 's3', name: 'PM2.5', x: 660, y: 180, base: 35, amp: 3, unit: 'μg', decimals: 0 },
  { id: 's4', name: '噪声', x: 660, y: 230, base: 62, amp: 2, unit: 'dB', decimals: 0 },
];

/* ==================== 种子 / 突变 ==================== */

function createSeed(): CampusState {
  return {
    energies: BLDS.map((b) => b.enBase),
    occupancies: BLDS.map((b) => b.occBase),
    parkingUsed: PARKS.map((p) => p.usedBase),
    sensorValues: SENSORS.map((s) => s.base),
    time: 0,
  };
}

function simulateStep(state: CampusState, _dt: number): CampusState {
  const energies = state.energies.map((v, i) =>
    randomWalk(v, BLDS[i].enBase, BLDS[i].enAmp, 20, BLDS[i].enBase * 1.8, 0.2),
  );
  const occupancies = state.occupancies.map((v, i) =>
    randomWalk(v, BLDS[i].occBase, 1, 30, 100, 0.3),
  );
  const parkingUsed = state.parkingUsed.map((v, i) =>
    randomWalk(v, PARKS[i].usedBase, PARKS[i].usedAmp, 0, PARKS[i].total, 0.35),
  );
  const sensorValues = state.sensorValues.map((v, i) =>
    randomWalk(v, SENSORS[i].base, SENSORS[i].amp, SENSORS[i].base * 0.5, SENSORS[i].base * 1.5, 0.25),
  );

  return { ...state, energies, occupancies, parkingUsed, sensorValues, time: state.time + _dt };
}

/* ==================== 组件 ==================== */

interface Props { width?: number; height?: number; }

export function SmartCampus({ width = W, height = H }: Props) {
  const seed = useMemo(() => createSeed(), []);
  const state = useSimulation(seed, simulateStep, SIM_INTERVAL_MS);

  const totalEnergy = Math.round(state.energies.reduce((s, e) => s + e, 0));
  const totalPark = PARKS.reduce((s, p) => s + p.total, 0);
  const usedPark = state.parkingUsed.reduce((s, u) => s + Math.round(u), 0);
  const avgOcc = Math.round(state.occupancies.reduce((s, o) => s + o, 0) / state.occupancies.length);
  const pm25 = state.sensorValues[2];
  const envIdx = pm25 > 50 ? '差' : pm25 > 35 ? '良' : '优';

  return (
    <ReactVizComposer engine="canvas" width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill="#f4f7f4" />

      {/* 道路 / 绿化 */}
      <Rect x={0} y={148} width={width} height={12} fill="#e2e8e2" />
      <Rect x={0} y={262} width={width} height={10} fill="#e2e8e2" />
      <Rect x={242} y={148} width={10} height={124} fill="#e2e8e2" />
      <Rect x={448} y={148} width={10} height={124} fill="#e2e8e2" />
      <Rect x={730} y={280} width={50} height={50} rx={25} fill="#dcecdc" />

      <Text x={width / 2} y={18} text="智慧园区 · 综合管理" fontSize={15} fontWeight="bold" fill="#1a1a2e" textAlign="middle" />

      {/* 建筑 */}
      {BLDS.map((b, i) => {
        const en = state.energies[i];
        const occ = state.occupancies[i];
        const level = en > 800 ? 'high' : en > 400 ? 'mid' : 'low';
        const enColor = level === 'high' ? '#ff4d4f' : level === 'mid' ? '#fa8c16' : '#52c41a';
        return (
          <Group key={b.id}>
            <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={4} fill={b.color} opacity={0.1} />
            <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={4} fill="none" stroke={b.color} strokeWidth={1.5} />
            <Text x={b.x + b.w / 2} y={b.y + b.h / 2 - 8} text={b.name} fontSize={11} fontWeight="bold" fill="#262626" textAlign="middle" />
            <Text x={b.x + b.w / 2} y={b.y + b.h / 2 + 8} text={`${b.type} · ${Math.round(occ)}%`} fontSize={8} fill="#8c8c8c" textAlign="middle" />
            <Ellipse cx={b.x + b.w - 10} cy={b.y + 10} rx={5} ry={5} fill={enColor} />
            <Text x={b.x + b.w - 20} y={b.y + 13} text={`${Math.round(en)}kW`} fontSize={8} fill="#595959" textAlign="end" />
          </Group>
        );
      })}

      {/* 停车场 */}
      {PARKS.map((p, i) => {
        const used = Math.round(state.parkingUsed[i]);
        const ratio = used / p.total;
        const color = ratio > 0.85 ? '#ff4d4f' : ratio > 0.6 ? '#fa8c16' : '#52c41a';
        const barW = 90;
        const fillW = Math.max(4, +(barW * ratio).toFixed(1));

        return (
          <Group key={p.id}>
            <Rect x={p.x} y={p.y} width={165} height={48} rx={6} fill="#fff" stroke="#e8e8e8" strokeWidth={1} />
            <Text x={p.x + 14} y={p.y + 20} text="🅿" fontSize={14} />
            <Text x={p.x + 32} y={p.y + 16} text={p.name} fontSize={9} fontWeight="bold" fill="#262626" />
            <Text x={p.x + 32} y={p.y + 28} text={`${used} / ${p.total}`} fontSize={9} fill="#8c8c8c" />
            <Rect x={p.x + 10} y={p.y + 36} width={barW} height={3} rx={1.5} fill="#f0f0f0" />
            <Rect x={p.x + 10} y={p.y + 36} width={fillW} height={3} rx={1.5} fill={color} />
          </Group>
        );
      })}

      {/* 传感器 */}
      {SENSORS.map((s, i) => {
        const val = state.sensorValues[i];
        const isAlert = s.id === 's3' && val > 50;
        return (
          <Group key={s.id}>
            <Rect x={s.x - 28} y={s.y - 13} width={56} height={26} rx={4} fill={isAlert ? '#fff2f0' : '#fff'} stroke={isAlert ? '#ffccc7' : '#e8e8e8'} strokeWidth={1} />
            <Text x={s.x} y={s.y - 2} text={s.name} fontSize={7} fill="#8c8c8c" textAlign="middle" />
            <Text x={s.x} y={s.y + 8} text={`${s.decimals > 0 ? (+val).toFixed(s.decimals) : Math.round(val)}${s.unit}`} fontSize={9} fontWeight="bold" fill={isAlert ? '#ff4d4f' : '#262626'} textAlign="middle" />
          </Group>
        );
      })}

      {/* 底栏 */}
      <Rect x={10} y={H - 50} width={W - 20} height={40} rx={6} fill="#fff" stroke="#e8e8e8" strokeWidth={1} />
      <StatItem x={40} y={H - 50} label="建筑" val={`${BLDS.length}`} color="#1677ff" />
      <StatItem x={130} y={H - 50} label="总能耗" val={`${totalEnergy} kW`} color="#fa8c16" />
      <StatItem x={240} y={H - 50} label="停车" val={`${Math.round((usedPark / totalPark) * 100)}%`} color="#52c41a" />
      <StatItem x={350} y={H - 50} label="入驻" val={`${avgOcc}%`} color="#722ed1" />
      <StatItem x={460} y={H - 50} label="环境" val={envIdx} color="#13c2c2" />
      <StatItem x={550} y={H - 50} label="安防" val="正常" color="#52c41a" />
    </ReactVizComposer>
  );
}

function StatItem({ x, y, label, val, color }: { x: number; y: number; label: string; val: string; color: string }) {
  return (
    <Group x={x} y={y}>
      <Text x={0} y={16} text={label} fontSize={8} fill="#8c8c8c" textAlign="middle" />
      <Text x={0} y={30} text={val} fontSize={12} fontWeight="bold" fill={color} textAlign="middle" />
    </Group>
  );
}

export default SmartCampus;
