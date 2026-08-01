/**
 * SmartCampus —— 智慧园区（动态数据版）
 *
 * 楼宇能耗/入驻率缓慢波动，停车位动态变化，环境传感器持续更新。
 * 布局随画布宽高自适应：传感器列固定靠右，楼宇/停车铺满左侧。
 */

import { useMemo } from 'react';
import {
  ReactVizComposer,
  Rect,
  Ellipse,
  Text,
  Group,
} from 'react-viz-composer';
import { useSimulation, randomWalk } from './useSimulation';

/* ==================== 类型 ==================== */

interface BldDef {
  id: string;
  name: string;
  type: string;
  color: string;
  occBase: number;
  enBase: number;
  enAmp: number;
  /** 所在行 0/1 */
  row: number;
  /** 行内列序 */
  col: number;
  /** 行内跨列数（默认 1） */
  colSpan?: number;
}

interface ParkDef {
  id: string;
  name: string;
  total: number;
  usedBase: number;
  usedAmp: number;
}

interface SensorDef {
  id: string;
  name: string;
  base: number;
  amp: number;
  unit: string;
  decimals: number;
}

interface CampusState {
  energies: number[];
  occupancies: number[];
  parkingUsed: number[];
  sensorValues: number[];
  time: number;
}

/* ==================== 数据 ==================== */

const DEFAULT_W = 800;
const DEFAULT_H = 400;
const SIM_INTERVAL_MS = 300;

const BLDS: BldDef[] = [
  { id: 'A', name: '研发A', type: '办公', color: '#1677ff', occBase: 92, enBase: 380, enAmp: 12, row: 0, col: 0 },
  { id: 'B', name: '研发B', type: '办公', color: '#52c41a', occBase: 85, enBase: 310, enAmp: 10, row: 0, col: 1 },
  { id: 'C', name: '数据中心', type: '机房', color: '#fa8c16', occBase: 100, enBase: 1250, enAmp: 30, row: 0, col: 2 },
  { id: 'D', name: '综合楼', type: '综合', color: '#722ed1', occBase: 78, enBase: 220, enAmp: 8, row: 0, col: 3 },
  { id: 'E', name: '车间', type: '生产', color: '#13c2c2', occBase: 95, enBase: 890, enAmp: 25, row: 1, col: 0 },
  { id: 'F', name: '仓储', type: '仓储', color: '#eb2f96', occBase: 60, enBase: 150, enAmp: 5, row: 1, col: 1 },
  { id: 'G', name: '公寓', type: '住宿', color: '#2f54eb', occBase: 88, enBase: 420, enAmp: 14, row: 1, col: 2 },
];

const PARKS: ParkDef[] = [
  { id: 'P1', name: '车库A', total: 300, usedBase: 247, usedAmp: 5 },
  { id: 'P2', name: '车库B', total: 200, usedBase: 89, usedAmp: 3 },
  { id: 'P3', name: '地面', total: 150, usedBase: 138, usedAmp: 3 },
  { id: 'P4', name: '货车区', total: 40, usedBase: 22, usedAmp: 2 },
];

const SENSORS: SensorDef[] = [
  { id: 's1', name: '温度', base: 23.5, amp: 0.3, unit: '°C', decimals: 1 },
  { id: 's2', name: '湿度', base: 55, amp: 2, unit: '%', decimals: 0 },
  { id: 's3', name: 'PM2.5', base: 35, amp: 3, unit: 'μg', decimals: 0 },
  { id: 's4', name: '噪声', base: 62, amp: 2, unit: 'dB', decimals: 0 },
];

const ROW0_COLS = 4;
const ROW1_COLS = 3;

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

/**
 * 按画布尺寸计算自适应布局
 */
function computeLayout(width: number, height: number) {
  const pad = 16;
  const headerH = 36;
  const footerH = 44;
  const sensorW = 72;
  const sensorGap = 12;
  const gap = 10;

  const sensorColX = width - pad - sensorW;
  const mainRight = sensorColX - sensorGap;
  const mainLeft = pad;
  const mainW = Math.max(200, mainRight - mainLeft);

  const bodyTop = headerH;
  const bodyBottom = height - footerH - pad;
  const bodyH = Math.max(160, bodyBottom - bodyTop);

  const parkH = 52;
  const parkGap = 10;
  const bldAreaH = bodyH - parkH - parkGap;
  const rowGap = 10;
  const rowH = (bldAreaH - rowGap) / 2;

  const row0CellW = (mainW - gap * (ROW0_COLS - 1)) / ROW0_COLS;
  const row1CellW = (mainW - gap * (ROW1_COLS - 1)) / ROW1_COLS;

  const parkY = bodyTop + bldAreaH + parkGap;
  const parkCellW = (mainW - gap * (PARKS.length - 1)) / PARKS.length;

  const sensorTop = bodyTop + 8;
  const sensorBottom = parkY - 8;
  const sensorSlotH = (sensorBottom - sensorTop) / SENSORS.length;

  return {
    pad,
    headerH,
    footerH,
    sensorW,
    sensorColX,
    mainLeft,
    mainW,
    bodyTop,
    rowH,
    rowGap,
    row0CellW,
    row1CellW,
    gap,
    parkY,
    parkH,
    parkCellW,
    sensorTop,
    sensorSlotH,
    footerY: height - footerH,
  };
}

/* ==================== 组件 ==================== */

interface Props {
  width?: number;
  height?: number;
}

/**
 * 智慧园区综合管理大屏
 */
export function SmartCampus(props: Props) {
  const { width = DEFAULT_W, height = DEFAULT_H } = props;

  const seed = useMemo(() => createSeed(), []);
  const state = useSimulation(seed, simulateStep, SIM_INTERVAL_MS);
  const layout = useMemo(() => computeLayout(width, height), [width, height]);

  const totalEnergy = Math.round(state.energies.reduce((s, e) => s + e, 0));
  const totalPark = PARKS.reduce((s, p) => s + p.total, 0);
  const usedPark = state.parkingUsed.reduce((s, u) => s + Math.round(u), 0);
  const avgOcc = Math.round(state.occupancies.reduce((s, o) => s + o, 0) / state.occupancies.length);
  const pm25 = state.sensorValues[2];
  const envIdx = pm25 > 50 ? '差' : pm25 > 35 ? '良' : '优';

  const {
    pad, sensorW, sensorColX, mainLeft, mainW, bodyTop, rowH, rowGap,
    row0CellW, row1CellW, gap, parkY, parkH, parkCellW,
    sensorTop, sensorSlotH, footerY, footerH,
  } = layout;

  return (
    <ReactVizComposer engine="canvas" width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill="#f4f7f4" />

      {/* 道路分隔线 */}
      <Rect x={mainLeft} y={bodyTop + rowH + rowGap / 2 - 3} width={mainW} height={6} fill="#e2e8e2" />
      <Rect x={mainLeft} y={parkY - gap / 2 - 2} width={mainW} height={5} fill="#e2e8e2" />

      <Text
        x={width / 2}
        y={18}
        text="智慧园区 · 综合管理"
        fontSize={15}
        fontWeight="bold"
        fill="#1a1a2e"
        textAlign="middle"
      />

      {/* 建筑 */}
      {BLDS.map((b, i) => {
        const cellW = b.row === 0 ? row0CellW : row1CellW;
        const x = mainLeft + b.col * (cellW + gap);
        const y = bodyTop + b.row * (rowH + rowGap);
        const en = state.energies[i];
        const occ = state.occupancies[i];
        const level = en > 800 ? 'high' : en > 400 ? 'mid' : 'low';
        const enColor = level === 'high' ? '#ff4d4f' : level === 'mid' ? '#fa8c16' : '#52c41a';
        return (
          <Group key={b.id}>
            <Rect x={x} y={y} width={cellW} height={rowH} rx={4} fill={b.color} opacity={0.1} />
            <Rect x={x} y={y} width={cellW} height={rowH} rx={4} fill="none" stroke={b.color} strokeWidth={1.5} />
            <Text x={x + cellW / 2} y={y + rowH / 2 - 8} text={b.name} fontSize={11} fontWeight="bold" fill="#262626" textAlign="middle" />
            <Text x={x + cellW / 2} y={y + rowH / 2 + 8} text={`${b.type} · ${Math.round(occ)}%`} fontSize={8} fill="#8c8c8c" textAlign="middle" />
            <Ellipse cx={x + cellW - 12} cy={y + 12} rx={5} ry={5} fill={enColor} />
            <Text x={x + cellW - 22} y={y + 15} text={`${Math.round(en)}kW`} fontSize={8} fill="#595959" textAlign="end" />
          </Group>
        );
      })}

      {/* 停车场（均分主区宽度，避免与装饰重叠） */}
      {PARKS.map((p, i) => {
        const x = mainLeft + i * (parkCellW + gap);
        const used = Math.round(state.parkingUsed[i]);
        const ratio = used / p.total;
        const color = ratio > 0.85 ? '#ff4d4f' : ratio > 0.6 ? '#fa8c16' : '#52c41a';
        const barW = Math.max(40, parkCellW - 24);
        const fillW = Math.max(4, +(barW * ratio).toFixed(1));

        return (
          <Group key={p.id}>
            <Rect x={x} y={parkY} width={parkCellW} height={parkH} rx={6} fill="#fff" stroke="#e8e8e8" strokeWidth={1} />
            <Text x={x + 12} y={parkY + 18} text="P" fontSize={12} fontWeight="bold" fill="#8c8c8c" />
            <Text x={x + 28} y={parkY + 14} text={p.name} fontSize={9} fontWeight="bold" fill="#262626" />
            <Text x={x + 28} y={parkY + 28} text={`${used} / ${p.total}`} fontSize={9} fill="#8c8c8c" />
            <Rect x={x + 12} y={parkY + parkH - 12} width={barW} height={3} rx={1.5} fill="#f0f0f0" />
            <Rect x={x + 12} y={parkY + parkH - 12} width={fillW} height={3} rx={1.5} fill={color} />
          </Group>
        );
      })}

      {/* 传感器：靠右，与边界留边距 */}
      {SENSORS.map((s, i) => {
        const val = state.sensorValues[i];
        const isAlert = s.id === 's3' && val > 50;
        const cy = sensorTop + sensorSlotH * i + sensorSlotH / 2;
        const cardH = Math.min(36, sensorSlotH - 8);
        return (
          <Group key={s.id}>
            <Rect
              x={sensorColX}
              y={cy - cardH / 2}
              width={sensorW}
              height={cardH}
              rx={4}
              fill={isAlert ? '#fff2f0' : '#fff'}
              stroke={isAlert ? '#ffccc7' : '#e8e8e8'}
              strokeWidth={1}
            />
            <Text x={sensorColX + sensorW / 2} y={cy - 6} text={s.name} fontSize={8} fill="#8c8c8c" textAlign="middle" />
            <Text
              x={sensorColX + sensorW / 2}
              y={cy + 8}
              text={`${s.decimals > 0 ? (+val).toFixed(s.decimals) : Math.round(val)}${s.unit}`}
              fontSize={10}
              fontWeight="bold"
              fill={isAlert ? '#ff4d4f' : '#262626'}
              textAlign="middle"
            />
          </Group>
        );
      })}

      {/* 底栏 */}
      <Rect x={pad} y={footerY} width={width - pad * 2} height={footerH - 4} rx={6} fill="#fff" stroke="#e8e8e8" strokeWidth={1} />
      <StatItem x={pad + 40} y={footerY} label="建筑" val={`${BLDS.length}`} color="#1677ff" />
      <StatItem x={pad + 130} y={footerY} label="总能耗" val={`${totalEnergy} kW`} color="#fa8c16" />
      <StatItem x={pad + 240} y={footerY} label="停车" val={`${Math.round((usedPark / totalPark) * 100)}%`} color="#52c41a" />
      <StatItem x={pad + 350} y={footerY} label="入驻" val={`${avgOcc}%`} color="#722ed1" />
      <StatItem x={pad + 460} y={footerY} label="环境" val={envIdx} color="#13c2c2" />
      <StatItem x={pad + 560} y={footerY} label="安防" val="正常" color="#52c41a" />
    </ReactVizComposer>
  );
}

/**
 * 底栏统计项
 */
function StatItem(props: { x: number; y: number; label: string; val: string; color: string }) {
  const { x, y, label, val, color } = props;
  return (
    <Group x={x} y={y}>
      <Text x={0} y={14} text={label} fontSize={8} fill="#8c8c8c" textAlign="middle" />
      <Text x={0} y={30} text={val} fontSize={12} fontWeight="bold" fill={color} textAlign="middle" />
    </Group>
  );
}

export default SmartCampus;
