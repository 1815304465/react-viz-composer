/**
 * NetworkTopology —— 企业网络拓扑（动态数据版）
 *
 * Leaf-Spine 架构实时网络监控。使用 useSimulation 驱动：
 * - 带宽利用率持续波动（均值回归随机游走）
 * - 数据包沿线匀速流动（约 5~8 秒穿越一条链路）
 * - 节点状态间歇切换（模拟故障/恢复）
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

interface TopoNode {
  id: string; label: string;
  role: 'spine' | 'leaf' | 'tor';
  status: 'online' | 'warning' | 'offline';
  x: number; y: number; w: number; h: number;
}

interface Packet {
  linkIdx: number;
  /** 沿线进度 0..1 */
  phase: number;
  /** 每秒推进量（穿越一条链路约 1~3 秒） */
  speed: number;
  /** 1 下行 / -1 上行 */
  dir: 1 | -1;
  /** 相对半径，制造层次感 */
  size: number;
}

interface TopoState {
  nodes: TopoNode[];
  utilizations: number[];
  packets: Packet[];
  time: number;
  faultTimer: number;
}

/* ==================== 数据 ==================== */

const NODE_W = 76;
const NODE_H = 42;

const ROLE_COLORS: Record<TopoNode['role'], string> = {
  spine: '#1677ff', leaf: '#52c41a', tor: '#fa8c16',
};

const STATUS_COLORS: Record<TopoNode['status'], string> = {
  online: '#52c41a', warning: '#faad14', offline: '#ff4d4f',
};

const PACKET_COLORS = ['#1677ff', '#69b1ff', '#36cfc9', '#9254de'];

const INITIAL_NODES: TopoNode[] = [
  { id: 'spine-1', label: 'Spine-1', role: 'spine', status: 'online', x: 200, y: 36, w: NODE_W, h: NODE_H },
  { id: 'spine-2', label: 'Spine-2', role: 'spine', status: 'online', x: 420, y: 36, w: NODE_W, h: NODE_H },
  { id: 'leaf-1', label: 'Leaf-1', role: 'leaf', status: 'online', x: 80, y: 150, w: NODE_W, h: NODE_H },
  { id: 'leaf-2', label: 'Leaf-2', role: 'leaf', status: 'online', x: 290, y: 150, w: NODE_W, h: NODE_H },
  { id: 'leaf-3', label: 'Leaf-3', role: 'leaf', status: 'online', x: 500, y: 150, w: NODE_W, h: NODE_H },
  { id: 'tor-1', label: 'ToR-A1', role: 'tor', status: 'online', x: 60, y: 270, w: NODE_W, h: NODE_H },
  { id: 'tor-2', label: 'ToR-A2', role: 'tor', status: 'online', x: 190, y: 270, w: NODE_W, h: NODE_H },
  { id: 'tor-3', label: 'ToR-B1', role: 'tor', status: 'online', x: 340, y: 270, w: NODE_W, h: NODE_H },
  { id: 'tor-4', label: 'ToR-B2', role: 'tor', status: 'online', x: 490, y: 270, w: NODE_W, h: NODE_H },
];

const LINK_DEFS: Array<{ source: string; target: string; baselineUtil: number; amp: number }> = [
  { source: 'spine-1', target: 'leaf-1', baselineUtil: 45, amp: 15 },
  { source: 'spine-1', target: 'leaf-2', baselineUtil: 62, amp: 18 },
  { source: 'spine-1', target: 'leaf-3', baselineUtil: 38, amp: 12 },
  { source: 'spine-2', target: 'leaf-1', baselineUtil: 55, amp: 16 },
  { source: 'spine-2', target: 'leaf-2', baselineUtil: 70, amp: 20 },
  { source: 'spine-2', target: 'leaf-3', baselineUtil: 28, amp: 10 },
  { source: 'leaf-1', target: 'tor-1', baselineUtil: 35, amp: 10 },
  { source: 'leaf-1', target: 'tor-2', baselineUtil: 50, amp: 14 },
  { source: 'leaf-2', target: 'tor-2', baselineUtil: 42, amp: 12 },
  { source: 'leaf-2', target: 'tor-3', baselineUtil: 58, amp: 16 },
  { source: 'leaf-3', target: 'tor-3', baselineUtil: 20, amp: 8 },
  { source: 'leaf-3', target: 'tor-4', baselineUtil: 15, amp: 6 },
];

const W = 620;
const H = 340;
const SIM_INTERVAL_MS = 200;
/** 数据包数量：约每条链路 1~2 颗，避免拥挤 */
const PACKET_COUNT = 16;

/** 创建一个数据包；按链路均匀分布，速度适中 */
function createPacket(index: number): Packet {
  return {
    linkIdx: index % LINK_DEFS.length,
    phase: (index / PACKET_COUNT + Math.random() * 0.15) % 1,
    // 每秒推进 0.12~0.22 → 穿越约 4.5~8 秒
    speed: 0.12 + Math.random() * 0.1,
    dir: Math.random() < 0.75 ? 1 : -1,
    size: 2.8,
  };
}

/* ==================== 种子 ==================== */

function createSeed(): TopoState {
  const utilizations = LINK_DEFS.map((ld) => ld.baselineUtil);
  const packets = Array.from({ length: PACKET_COUNT }, (_, i) => createPacket(i));
  return { nodes: [...INITIAL_NODES], utilizations, packets, time: 0, faultTimer: 8 };
}

/* ==================== 突变 ==================== */

function simulateStep(state: TopoState, dt: number): TopoState {
  const newUtilizations = state.utilizations.map((u, i) =>
    randomWalk(u, LINK_DEFS[i].baselineUtil, LINK_DEFS[i].amp, 2, 98, 0.25),
  );

  // 数据包适速推进（同链路循环）
  const newPackets = state.packets.map((p) => {
    let phase = p.phase + p.speed * p.dir * dt;
    if (phase >= 1) phase -= Math.floor(phase);
    if (phase < 0) phase = 1 + (phase % 1);
    return { ...p, phase: +phase.toFixed(4) };
  });

  let newNodes = state.nodes;
  let fTimer = state.faultTimer - dt;
  if (fTimer <= 0) {
    fTimer = 8 + Math.random() * 7;
    const idx = Math.floor(Math.random() * newNodes.length);
    const node = newNodes[idx];
    const nextStatus: TopoNode['status'] =
      node.status === 'online'
        ? (Math.random() < 0.6 ? 'warning' : 'offline')
        : 'online';
    newNodes = newNodes.map((n, i) => (i === idx ? { ...n, status: nextStatus } : n));
  }

  return { ...state, nodes: newNodes, utilizations: newUtilizations, packets: newPackets, time: state.time + dt, faultTimer: fTimer };
}

/* ==================== 组件 ==================== */

interface Props { width?: number; height?: number; }

/**
 * Leaf-Spine 网络拓扑可视化
 * @param props.width 画布宽
 * @param props.height 画布高
 */
export function NetworkTopology(props: Props) {
  const { width = W, height = H } = props;

  const seed = useMemo(() => createSeed(), []);
  const state = useSimulation(seed, simulateStep, SIM_INTERVAL_MS);

  const nodeMap = useMemo(
    () => new Map(state.nodes.map((n) => [n.id, n])),
    [state.nodes],
  );

  const onlineCount = state.nodes.filter((n) => n.status === 'online').length;
  const alarmCount = state.nodes.filter((n) => n.status !== 'online').length;
  const avgUtil = Math.round(
    state.utilizations.reduce((s, u) => s + u, 0) / state.utilizations.length,
  );

  return (
    <ReactVizComposer engine="canvas" width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill="#f7f9fc" />
      <Text x={width / 2} y={16} text="网络拓扑 · Leaf-Spine" fontSize={14} fontWeight="bold" fill="#1a1a2e" textAlign="middle" />

      {/* 连线 */}
      {LINK_DEFS.map((ld, i) => {
        const src = nodeMap.get(ld.source);
        const tgt = nodeMap.get(ld.target);
        if (!src || !tgt) return null;
        const util = state.utilizations[i] ?? 20;
        const alpha = 0.08 + (util / 100) * 0.42;
        const sw = 0.8 + (util / 100) * 2.8;
        return (
          <Line
            key={`edge-${i}`}
            points={[{ x: src.x, y: src.y + NODE_H / 2 }, { x: tgt.x, y: tgt.y - NODE_H / 2 }]}
            stroke={`rgba(22, 119, 255, ${+alpha.toFixed(2)})`}
            strokeWidth={+sw.toFixed(1)}
          />
        );
      })}

      {/* 数据包：沿线匀速流动 */}
      {state.packets.map((pkt, i) => {
        const ld = LINK_DEFS[pkt.linkIdx];
        if (!ld) return null;
        const src = nodeMap.get(ld.source);
        const tgt = nodeMap.get(ld.target);
        if (!src || !tgt) return null;
        const sx = src.x;
        const sy = src.y + NODE_H / 2;
        const tx = tgt.x;
        const ty = tgt.y - NODE_H / 2;
        const px = +(sx + (tx - sx) * pkt.phase).toFixed(1);
        const py = +(sy + (ty - sy) * pkt.phase).toFixed(1);
        const color = PACKET_COLORS[i % PACKET_COLORS.length];
        const r = pkt.size;
        return (
          <Ellipse
            key={`pkt-${i}`}
            cx={px}
            cy={py}
            rx={r}
            ry={r}
            fill={color}
            opacity={0.7}
          />
        );
      })}

      {/* 节点 */}
      {state.nodes.map((node) => (
        <Group key={node.id}>
          <Rect x={node.x - node.w / 2} y={node.y - node.h / 2} width={node.w} height={node.h} rx={6} fill={ROLE_COLORS[node.role]} opacity={0.08} />
          <Rect x={node.x - node.w / 2} y={node.y - node.h / 2} width={node.w} height={node.h} rx={6} fill="none" stroke={node.status === 'offline' ? '#d9d9d9' : ROLE_COLORS[node.role]} strokeWidth={node.status === 'offline' ? 1 : 1.5} />
          <Ellipse cx={node.x - node.w / 2 + 12} cy={node.y} rx={5} ry={5} fill={STATUS_COLORS[node.status]} />
          <Text x={node.x + 2} y={node.y + 3} text={node.label} fontSize={10} fontWeight={600} fill={node.status === 'offline' ? '#d9d9d9' : '#262626'} textAlign="middle" textBaseline="middle" />
        </Group>
      ))}

      {/* 底栏 */}
      <Rect x={12} y={height - 42} width={width - 24} height={32} rx={6} fill="#fff" stroke="#e8e8e8" strokeWidth={1} />
      <Text x={24} y={height - 22} text={`链路: ${LINK_DEFS.length}`} fontSize={10} fill="#8c8c8c" />
      <Text x={120} y={height - 22} text={`负载: ${avgUtil}%`} fontSize={10} fill="#1677ff" fontWeight="bold" />
      <Text x={220} y={height - 22} text={`在线: ${onlineCount}/${state.nodes.length}`} fontSize={10} fill="#8c8c8c" />
      {alarmCount > 0 && (
        <Text x={340} y={height - 22} text={`告警: ${alarmCount}`} fontSize={10} fill="#ff4d4f" fontWeight="bold" />
      )}
    </ReactVizComposer>
  );
}

export default NetworkTopology;
