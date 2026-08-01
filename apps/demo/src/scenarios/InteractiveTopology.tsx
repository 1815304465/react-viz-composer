/**
 * InteractiveTopology —— 交互式网络拓扑
 *
 * Leaf-Spine 架构的完全交互版：
 * - 悬停节点 → 发光高亮 + tooltip
 * - 点击节点 → 右侧 HTML 详情面板
 * - 拖拽任意节点；拖拽时光标变为 grabbing
 * - 可选画布缩放平移（默认关闭）+ 重置视图
 * - 数据包沿线流动（useSimulation 驱动）
 * - 节点状态模拟故障切换
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  ReactVizComposer,
  Rect,
  Ellipse,
  Line,
  Text,
  Group,
} from 'react-viz-composer';
import type { Viewport } from 'react-viz-composer';
import { Switch, Button, Space, Card, Descriptions, Tag, Typography } from 'antd';
import { useSimulation, randomWalk } from './useSimulation';

/* ==================== 类型 ==================== */

interface TopoNode {
  id: string;
  label: string;
  role: 'spine' | 'leaf' | 'tor';
  status: 'online' | 'warning' | 'offline';
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Packet {
  linkIdx: number;
  phase: number;
  speed: number;
  dir: 1 | -1;
  size: number;
}

interface TopoState {
  utilizations: number[];
  packets: Packet[];
  time: number;
  faultTimer: number;
}

interface Props {
  width?: number;
  height?: number;
}

/* ==================== 常量 ==================== */

const NODE_W = 76;
const NODE_H = 42;

const ROLE_COLORS: Record<TopoNode['role'], string> = {
  spine: '#1677ff',
  leaf: '#52c41a',
  tor: '#fa8c16',
};

const STATUS_COLORS: Record<TopoNode['status'], string> = {
  online: '#52c41a',
  warning: '#faad14',
  offline: '#ff4d4f',
};

const STATUS_LABELS: Record<TopoNode['status'], string> = {
  online: '在线',
  warning: '告警',
  offline: '离线',
};

const PACKET_COLORS = ['#1677ff', '#69b1ff', '#36cfc9', '#9254de'];

const DEFAULT_W = 680;
const DEFAULT_H = 420;
const TOOLBAR_H = 44;
const HEADER_H = 36;
const STATUS_BAR_H = 40;
const SIDEBAR_W = 200;
const SIM_INTERVAL_MS = 200;
const PACKET_COUNT = 16;
/** 节点布局设计坐标系 */
const DESIGN_W = 560;
const DESIGN_H = 300;

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

function createInitialNodes(): TopoNode[] {
  return [
    { id: 'spine-1', label: 'Spine-1', role: 'spine', status: 'online', x: 200, y: 50, w: NODE_W, h: NODE_H },
    { id: 'spine-2', label: 'Spine-2', role: 'spine', status: 'online', x: 420, y: 50, w: NODE_W, h: NODE_H },
    { id: 'leaf-1', label: 'Leaf-1', role: 'leaf', status: 'online', x: 80, y: 155, w: NODE_W, h: NODE_H },
    { id: 'leaf-2', label: 'Leaf-2', role: 'leaf', status: 'online', x: 290, y: 155, w: NODE_W, h: NODE_H },
    { id: 'leaf-3', label: 'Leaf-3', role: 'leaf', status: 'online', x: 500, y: 155, w: NODE_W, h: NODE_H },
    { id: 'tor-1', label: 'ToR-A1', role: 'tor', status: 'online', x: 60, y: 265, w: NODE_W, h: NODE_H },
    { id: 'tor-2', label: 'ToR-A2', role: 'tor', status: 'online', x: 190, y: 265, w: NODE_W, h: NODE_H },
    { id: 'tor-3', label: 'ToR-B1', role: 'tor', status: 'online', x: 340, y: 265, w: NODE_W, h: NODE_H },
    { id: 'tor-4', label: 'ToR-B2', role: 'tor', status: 'online', x: 490, y: 265, w: NODE_W, h: NODE_H },
  ];
}

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

/* ==================== 种子 & 突变 ==================== */

function createSeed(): TopoState {
  const utilizations = LINK_DEFS.map((ld) => ld.baselineUtil);
  const packets = Array.from({ length: PACKET_COUNT }, (_, i) => ({
    linkIdx: i % LINK_DEFS.length,
    phase: (i / PACKET_COUNT + Math.random() * 0.15) % 1,
    speed: 0.12 + Math.random() * 0.1,
    dir: (Math.random() < 0.75 ? 1 : -1) as 1 | -1,
    size: 2.8,
  }));
  return { utilizations, packets, time: 0, faultTimer: 8 };
}

function simulateStep(state: TopoState, dt: number): TopoState {
  const newUtilizations = state.utilizations.map((u, i) =>
    randomWalk(u, LINK_DEFS[i].baselineUtil, LINK_DEFS[i].amp, 2, 98, 0.25),
  );
  const newPackets = state.packets.map((p) => {
    let phase = p.phase + p.speed * p.dir * dt;
    if (phase >= 1) phase -= Math.floor(phase);
    if (phase < 0) phase = 1 + (phase % 1);
    return { ...p, phase: +phase.toFixed(4) };
  });
  return { ...state, utilizations: newUtilizations, packets: newPackets, time: state.time + dt, faultTimer: state.faultTimer - dt };
}

/**
 * 将世界坐标转换为画布屏幕坐标
 * @param worldX 世界 x
 * @param worldY 世界 y
 * @param viewport 当前视口
 */
function toScreen(worldX: number, worldY: number, viewport: Viewport) {
  return {
    x: (worldX + viewport.x) * viewport.scale,
    y: (worldY + viewport.y) * viewport.scale,
  };
}

/* ==================== 组件 ==================== */

/**
 * 交互式 Leaf-Spine 网络拓扑场景
 * @param props.width 总宽度
 * @param props.height 总高度（含底部工具栏）
 */
export function InteractiveTopology(props: Props) {
  const { width = DEFAULT_W, height = DEFAULT_H } = props;

  const canvasH = height - TOOLBAR_H;
  const plotH = canvasH - HEADER_H - STATUS_BAR_H;

  /** 仿真种子 */
  const seed = useMemo(() => createSeed(), []);
  const state = useSimulation(seed, simulateStep, SIM_INTERVAL_MS);

  const [nodes, setNodes] = useState<TopoNode[]>(() => createInitialNodes());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewportEnabled, setViewportEnabled] = useState(false);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);

  const faultTimerRef = useRef(8);
  const prevTimeRef = useRef(state.time);
  const draggingIdRef = useRef<string | null>(null);
  const scaleRef = useRef({ sx: 1, sy: 1 });

  if (state.time !== prevTimeRef.current) {
    const dt = state.time - prevTimeRef.current;
    prevTimeRef.current = state.time;
    faultTimerRef.current -= dt;
    if (faultTimerRef.current <= 0) {
      faultTimerRef.current = 8 + Math.random() * 7;
      setNodes((prev) => {
        const idx = Math.floor(Math.random() * prev.length);
        const node = prev[idx];
        const nextStatus: TopoNode['status'] =
          node.status === 'online' ? (Math.random() < 0.6 ? 'warning' : 'offline') : 'online';
        return prev.map((n, i) => (i === idx ? { ...n, status: nextStatus } : n));
      });
    }
  }

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const onlineCount = nodes.filter((n) => n.status === 'online').length;
  const alarmCount = nodes.filter((n) => n.status !== 'online').length;
  const avgUtil = Math.round(state.utilizations.reduce((s, u) => s + u, 0) / state.utilizations.length);
  const hoveredNode = hoveredNodeId ? nodeMap.get(hoveredNodeId) : null;
  const selectedNode = selectedId ? nodeMap.get(selectedId) : null;

  const selectedPeers = useMemo(() => {
    if (!selectedId) return [];
    return LINK_DEFS
      .map((ld, linkIdx) => ({ ...ld, linkIdx }))
      .filter((ld) => ld.source === selectedId || ld.target === selectedId)
      .map((ld) => {
        const peerId = ld.source === selectedId ? ld.target : ld.source;
        const peer = nodeMap.get(peerId);
        return {
          id: peerId,
          label: peer?.label ?? peerId,
          status: peer?.status ?? 'online' as TopoNode['status'],
          util: state.utilizations[ld.linkIdx] ?? 0,
        };
      });
  }, [selectedId, nodeMap, state.utilizations]);

  const selectedAvgUtil = selectedPeers.length > 0
    ? Math.round(selectedPeers.reduce((s, p) => s + p.util, 0) / selectedPeers.length)
    : avgUtil;

  const canvasW = selectedNode ? width - SIDEBAR_W : width;
  const sx = canvasW / DESIGN_W;
  const sy = plotH / DESIGN_H;
  scaleRef.current = { sx, sy };

  /**
   * 设计坐标 → 画布坐标
   * @param x 设计 x
   * @param y 设计 y
   */
  const mapPos = useCallback((x: number, y: number) => ({
    x: x * sx,
    y: y * sy,
  }), [sx, sy]);

  /** 切换缩放平移开关 */
  const handleViewportToggle = useCallback((checked: boolean) => {
    setViewportEnabled(checked);
    if (!checked) {
      setViewport(DEFAULT_VIEWPORT);
    }
  }, []);

  /** 重置视口到初始状态 */
  const handleResetViewport = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, []);

  /** 关闭详情侧边栏 */
  const handleCloseDetail = useCallback(() => {
    setSelectedId(null);
  }, []);

  const nodeEventMap = useMemo(() => {
    const ids = ['spine-1', 'spine-2', 'leaf-1', 'leaf-2', 'leaf-3', 'tor-1', 'tor-2', 'tor-3', 'tor-4'];
    const map = new Map<string, {
      onClick: () => void;
      onMouseEnter: () => void;
      onMouseLeave: () => void;
      onDragStart: () => void;
      onDrag: (evt: { stepX: number; stepY: number; dx: number; dy: number }) => void;
      onDragEnd: (evt: { dx: number; dy: number }) => void;
    }>();
    for (const id of ids) {
      map.set(id, {
        onClick: () => setSelectedId(id),
        onMouseEnter: () => {
          if (draggingIdRef.current) return;
          setHoveredNodeId(id);
        },
        onMouseLeave: () => {
          if (draggingIdRef.current) return;
          setHoveredNodeId(null);
          document.body.style.cursor = '';
        },
        onDragStart: () => {
          draggingIdRef.current = id;
          document.body.style.cursor = 'grabbing';
        },
        onDrag: (evt) => {
          const { sx: csx, sy: csy } = scaleRef.current;
          setNodes((prev) =>
            prev.map((n) =>
              n.id === id
                ? { ...n, x: n.x + evt.stepX / csx, y: n.y + evt.stepY / csy }
                : n,
            ),
          );
        },
        onDragEnd: (evt) => {
          draggingIdRef.current = null;
          document.body.style.cursor = '';
          // 位移极小时视为点击选中（拖拽会抑制 click 事件）
          if (Math.abs(evt.dx) < 4 && Math.abs(evt.dy) < 4) {
            setSelectedId(id);
          }
        },
      });
    }
    return map;
  }, []);

  const hintText = viewportEnabled
    ? `缩放: ${Math.round(viewport.scale * 100)}% · 滚轮缩放 · 拖拽平移 · 点击节点查看详情`
    : '点击节点查看详情 · 拖拽节点 · 开启下方开关后可缩放平移';

  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column', background: '#f7f9fc' }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 0, height: canvasH }}>
          {/* 固定标题栏（不随视口缩放） */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: HEADER_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            <Typography.Text strong style={{ fontSize: 13, color: '#1a1a2e' }}>
              网络拓扑 · Leaf-Spine（交互式）
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 9 }}>
              {hintText}
            </Typography.Text>
          </div>

          {/* 拓扑画布（仅节点/连线区域参与缩放平移） */}
          <div
            style={{
              position: 'absolute',
              top: HEADER_H,
              left: 0,
              right: 0,
              height: plotH,
            }}
          >
            <ReactVizComposer
              engine="canvas"
              width={canvasW}
              height={plotH}
              viewport={viewport}
              interactiveViewport={viewportEnabled}
              onViewportChange={setViewport}
            >
              <Rect x={0} y={0} width={canvasW} height={plotH} fill="#f7f9fc" pointerEvents="none" />

            {LINK_DEFS.map((ld, i) => {
              const src = nodeMap.get(ld.source);
              const tgt = nodeMap.get(ld.target);
              if (!src || !tgt) return null;
              const a = mapPos(src.x, src.y);
              const b = mapPos(tgt.x, tgt.y);
              const util = state.utilizations[i] ?? 20;
              const alpha = 0.08 + (util / 100) * 0.42;
              const sw = 0.8 + (util / 100) * 2.8;
              return (
                <Line
                  key={`edge-${i}`}
                  points={[{ x: a.x, y: a.y + NODE_H / 2 }, { x: b.x, y: b.y - NODE_H / 2 }]}
                  stroke={`rgba(22, 119, 255, ${+alpha.toFixed(2)})`}
                  strokeWidth={+sw.toFixed(1)}
                  pointerEvents="none"
                />
              );
            })}

            {state.packets.map((pkt, i) => {
              const ld = LINK_DEFS[pkt.linkIdx];
              if (!ld) return null;
              const src = nodeMap.get(ld.source);
              const tgt = nodeMap.get(ld.target);
              if (!src || !tgt) return null;
              const a = mapPos(src.x, src.y);
              const b = mapPos(tgt.x, tgt.y);
              const nx = a.x + (b.x - a.x) * pkt.phase;
              const ny = a.y + NODE_H / 2 + (b.y - NODE_H / 2 - (a.y + NODE_H / 2)) * pkt.phase;
              return (
                <Ellipse
                  key={`pkt-${i}`}
                  cx={+nx.toFixed(1)}
                  cy={+ny.toFixed(1)}
                  rx={pkt.size}
                  ry={pkt.size}
                  fill={PACKET_COLORS[i % PACKET_COLORS.length]}
                  opacity={0.7}
                  pointerEvents="none"
                />
              );
            })}

            {nodes.map((node) => {
              const h = nodeEventMap.get(node.id);
              const isHovered = hoveredNodeId === node.id;
              const isSelected = selectedId === node.id;
              const roleColor = ROLE_COLORS[node.role];
              const p = mapPos(node.x, node.y);
              const hw = node.w / 2;
              const hh = node.h / 2;

              return (
                <Group key={node.id}>
                  {isSelected && (
                    <>
                      <Rect x={p.x - hw - 4} y={p.y - hh - 4} width={node.w + 8} height={node.h + 8}
                        rx={10} fill={roleColor} opacity={0.18} pointerEvents="none" />
                      <Rect x={p.x - hw - 8} y={p.y - hh - 8} width={node.w + 16} height={node.h + 16}
                        rx={14} fill={roleColor} opacity={0.07} pointerEvents="none" />
                    </>
                  )}
                  {isHovered && !isSelected && (
                    <Rect x={p.x - hw - 4} y={p.y - hh - 4} width={node.w + 8} height={node.h + 8}
                      rx={10} fill={roleColor} opacity={0.12} pointerEvents="none" />
                  )}
                  <Rect x={p.x - hw} y={p.y - hh} width={node.w} height={node.h}
                    rx={6} fill={roleColor} opacity={0.08} pointerEvents="none" />
                  <Rect
                    x={p.x - hw}
                    y={p.y - hh}
                    width={node.w}
                    height={node.h}
                    rx={6}
                    fill="none"
                    stroke={node.status === 'offline' ? '#d9d9d9' : roleColor}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : node.status === 'offline' ? 1 : 1.5}
                    onClick={h?.onClick}
                    onMouseEnter={h?.onMouseEnter}
                    onMouseLeave={h?.onMouseLeave}
                    onDragStart={h?.onDragStart}
                    onDrag={h?.onDrag}
                    onDragEnd={h?.onDragEnd}
                  />
                  <Ellipse cx={p.x - hw + 12} cy={p.y} rx={5} ry={5}
                    fill={STATUS_COLORS[node.status]} pointerEvents="none" />
                  <Text x={p.x + 2} y={p.y + 1} text={node.label}
                    fontSize={10} fontWeight={600}
                    fill={node.status === 'offline' ? '#d9d9d9' : '#262626'}
                    textAlign="middle" textBaseline="middle" pointerEvents="none" />
                </Group>
              );
            })}

            {hoveredNode && !selectedNode && (() => {
              const wp = mapPos(hoveredNode.x, hoveredNode.y);
              const { x: tipSx, y: tipSy } = toScreen(wp.x, wp.y, viewport);
              const tipW = 100;
              const tipH = 56;
              const tipX = Math.max(4, Math.min(canvasW - tipW - 4, tipSx - tipW / 2));
              const tipY = tipSy - hoveredNode.h / 2 * viewport.scale - tipH - 8;
              return (
                <Group key="node-tip" pointerEvents="none">
                  <Rect x={tipX} y={tipY} width={tipW} height={tipH} rx={4} fill="rgba(0,0,0,0.82)" />
                  <Text x={tipX + tipW / 2} y={tipY + 12} text={hoveredNode.label} fontSize={11} fontWeight="bold" fill="#fff" textAlign="middle" />
                  <Text x={tipX + tipW / 2} y={tipY + 26} text={`角色: ${hoveredNode.role.toUpperCase()}`} fontSize={9} fill={ROLE_COLORS[hoveredNode.role]} textAlign="middle" />
                  <Text x={tipX + tipW / 2} y={tipY + 40} text={`状态: ${hoveredNode.status}`} fontSize={9} fill={STATUS_COLORS[hoveredNode.status]} textAlign="middle" />
                </Group>
              );
            })()}
            </ReactVizComposer>
          </div>

          {/* 固定底栏（不随视口缩放） */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 12,
              right: 12,
              height: STATUS_BAR_H - 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              background: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: 6,
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            <Space size={16} split={<span style={{ color: '#f0f0f0' }}>|</span>}>
              <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                链路: {LINK_DEFS.length}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 10, color: '#1677ff', fontWeight: 600 }}>
                负载: {avgUtil}%
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                在线: {onlineCount}/{nodes.length}
              </Typography.Text>
              {alarmCount > 0 && (
                <Typography.Text style={{ fontSize: 10, color: '#ff4d4f', fontWeight: 600 }}>
                  告警: {alarmCount}
                </Typography.Text>
              )}
            </Space>
            <Space size={12}>
              {(['spine', 'leaf', 'tor'] as const).map((role) => (
                <Space key={role} size={4}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: ROLE_COLORS[role],
                      opacity: 0.5,
                    }}
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 8 }}>{role}</Typography.Text>
                </Space>
              ))}
            </Space>
          </div>
        </div>

        {selectedNode && (
          <div
            style={{
              width: SIDEBAR_W,
              flexShrink: 0,
              borderLeft: '1px solid #f0f0f0',
              background: '#fff',
              overflow: 'auto',
            }}
          >
            <Card
              size="small"
              title="节点详情"
              extra={<Button type="text" size="small" onClick={handleCloseDetail}>关闭</Button>}
              styles={{ body: { padding: '12px' } }}
              style={{ border: 'none', boxShadow: 'none', height: '100%' }}
            >
              <Typography.Title level={5} style={{ margin: '0 0 12px', color: ROLE_COLORS[selectedNode.role] }}>
                {selectedNode.label}
              </Typography.Title>
              <Descriptions column={1} size="small" styles={{ label: { color: '#8c8c8c' } }}>
                <Descriptions.Item label="角色">
                  <Tag color={ROLE_COLORS[selectedNode.role]}>{selectedNode.role.toUpperCase()}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={STATUS_COLORS[selectedNode.status]}>{STATUS_LABELS[selectedNode.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="链路负载">
                  <span style={{
                    color: selectedAvgUtil > 80 ? '#ff4d4f' : selectedAvgUtil > 50 ? '#faad14' : '#52c41a',
                    fontWeight: 600,
                  }}
                  >
                    {selectedAvgUtil}%
                  </span>
                </Descriptions.Item>
              </Descriptions>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12, marginBottom: 8 }}>
                连接节点
              </Typography.Text>
              {selectedPeers.length === 0 ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>无连接</Typography.Text>
              ) : (
                selectedPeers.map((peer) => (
                  <div key={peer.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: STATUS_COLORS[peer.status],
                      flexShrink: 0,
                    }}
                    />
                    <Typography.Text style={{ fontSize: 12, flex: 1 }}>{peer.label}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>{Math.round(peer.util)}%</Typography.Text>
                  </div>
                ))
              )}
            </Card>
          </div>
        )}
      </div>

      <div
        style={{
          height: TOOLBAR_H,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderTop: '1px solid #f0f0f0',
          background: '#fff',
        }}
      >
        <Space size="middle">
          <Space size="small">
            <Switch size="small" checked={viewportEnabled} onChange={handleViewportToggle} />
            <Typography.Text style={{ fontSize: 12 }}>缩放平移</Typography.Text>
          </Space>
          <Button size="small" onClick={handleResetViewport} disabled={!viewportEnabled}>
            重置视图
          </Button>
        </Space>
      </div>
    </div>
  );
}

export default InteractiveTopology;
