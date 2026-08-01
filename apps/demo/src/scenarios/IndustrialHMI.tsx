/**
 * IndustrialHMI —— 工业产线监控（交互版）
 *
 * - 悬停设备 → tooltip
 * - 点击设备 → 右侧 HTML 详情面板
 * - 拖拽任意设备节点
 * - 可选画布缩放平移（默认关闭）+ 重置视图
 * - 标题/底栏固定 HTML overlay，不随视口缩放
 * - 设备数值以不同相位缓慢波动，传送带物料独立推进
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  ReactVizComposer,
  Rect,
  Ellipse,
  Path,
  Text,
  Group,
} from 'react-viz-composer';
import type { Viewport } from 'react-viz-composer';
import { Switch, Button, Space, Card, Descriptions, Tag, Typography } from 'antd';
import { useSimulation, randomWalk } from './useSimulation';

/* ==================== 类型 ==================== */

interface EquipmentDef {
  id: string;
  name: string;
  type: 'furnace' | 'press' | 'cnc' | 'conveyor' | 'qc';
  x: number;
  y: number;
  baseline: number;
  amp: number;
  unit: string;
  decimals: number;
}

type EquipStatus = 'running' | 'idle' | 'alarm' | 'maintenance';

interface HmiSimState {
  statuses: Record<string, EquipStatus>;
  values: number[];
  beltPhases: number[];
  beltSpeeds: number[];
  time: number;
  faultTimer: number;
}

interface Props {
  width?: number;
  height?: number;
}

/* ==================== 常量 ==================== */

const STATUS_COLORS: Record<EquipStatus, string> = {
  running: '#52c41a',
  idle: '#d9d9d9',
  alarm: '#ff4d4f',
  maintenance: '#faad14',
};

const STATUS_LABELS: Record<EquipStatus, string> = {
  running: '运行',
  idle: '待机',
  alarm: '告警',
  maintenance: '维保',
};

const TYPE_COLORS: Record<EquipmentDef['type'], string> = {
  furnace: '#ff7a45',
  press: '#1677ff',
  cnc: '#722ed1',
  conveyor: '#13c2c2',
  qc: '#eb2f96',
};

const TYPE_LABELS: Record<EquipmentDef['type'], string> = {
  furnace: '熔炉',
  press: '冲压机',
  cnc: 'CNC',
  conveyor: '传送带',
  qc: '质检站',
};

/** 设计坐标系（设备布局基准） */
const DESIGN_W = 720;
const DESIGN_H = 340;

const EQUIPMENTS: EquipmentDef[] = [
  { id: 'F1', name: '熔炉 A', type: 'furnace', x: 70, y: 90, baseline: 1420, amp: 12, unit: '°C', decimals: 0 },
  { id: 'F2', name: '熔炉 B', type: 'furnace', x: 70, y: 200, baseline: 1380, amp: 10, unit: '°C', decimals: 0 },
  { id: 'P1', name: '冲压机', type: 'press', x: 210, y: 90, baseline: 60, amp: 3, unit: '次/min', decimals: 0 },
  { id: 'C1', name: 'CNC-01', type: 'cnc', x: 350, y: 50, baseline: 850, amp: 20, unit: 'rpm', decimals: 0 },
  { id: 'C2', name: 'CNC-02', type: 'cnc', x: 350, y: 145, baseline: 820, amp: 16, unit: 'rpm', decimals: 0 },
  { id: 'C3', name: 'CNC-03', type: 'cnc', x: 350, y: 240, baseline: 800, amp: 18, unit: 'rpm', decimals: 0 },
  { id: 'CV1', name: '传送带', type: 'conveyor', x: 490, y: 145, baseline: 3.2, amp: 0.1, unit: 'm/s', decimals: 1 },
  { id: 'QC1', name: '质检站', type: 'qc', x: 640, y: 145, baseline: 98.5, amp: 0.6, unit: '%', decimals: 1 },
];

const FLOW_LINES: Array<{ from: string; to: string }> = [
  { from: 'F1', to: 'P1' },
  { from: 'F2', to: 'P1' },
  { from: 'P1', to: 'C1' },
  { from: 'P1', to: 'C2' },
  { from: 'P1', to: 'C3' },
  { from: 'C1', to: 'CV1' },
  { from: 'C2', to: 'CV1' },
  { from: 'C3', to: 'CV1' },
  { from: 'CV1', to: 'QC1' },
];

const EQ_W = 78;
const EQ_H = 52;
const DEFAULT_W = 680;
const DEFAULT_H = 440;
const TOOLBAR_H = 44;
const HEADER_H = 36;
const STATUS_BAR_H = 40;
const SIDEBAR_W = 200;
const SIM_INTERVAL_MS = 1200;
const BELT_COUNT = 5;

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

/* ==================== 工具 ==================== */

/**
 * 将设备数值格式化为适合卡片宽度的短文本
 * @param value 原始数值
 * @param decimals 保留小数位
 * @param unit 单位
 */
function formatEquipValue(value: number, decimals: number, unit: string): string {
  return `${value.toFixed(decimals)} ${unit}`;
}

/** 创建仿真初始状态 */
function createSeed(): HmiSimState {
  const statuses = Object.fromEntries(EQUIPMENTS.map((e) => [e.id, 'running' as EquipStatus]));
  const values = EQUIPMENTS.map((e) => e.baseline);
  const beltPhases = Array.from({ length: BELT_COUNT }, () => Math.random());
  const beltSpeeds = Array.from({ length: BELT_COUNT }, () => 0.012 + Math.random() * 0.018);
  return { statuses, values, beltPhases, beltSpeeds, time: 0, faultTimer: 8 };
}

/** 仿真步进 */
function simulateStep(state: HmiSimState, dt: number): HmiSimState {
  const newValues = state.values.map((v, i) => {
    const eq = EQUIPMENTS[i];
    const status = state.statuses[eq.id] ?? 'running';
    if (status !== 'running') {
      return status === 'alarm' ? 0 : +(v * 0.7 + eq.baseline * 0.3).toFixed(eq.decimals);
    }
    const next = randomWalk(v, eq.baseline, eq.amp, eq.baseline * 0.5, eq.baseline * 1.3, 0.25);
    return +next.toFixed(eq.decimals);
  });

  const beltPhases = state.beltPhases.map((p, i) => (p + state.beltSpeeds[i] * dt) % 1);

  let statuses = state.statuses;
  let fTimer = state.faultTimer - dt;
  if (fTimer <= 0) {
    fTimer = 6 + Math.random() * 8;
    const targetable = EQUIPMENTS.filter((e) => e.type !== 'qc');
    const pick = targetable[Math.floor(Math.random() * targetable.length)];
    if (pick) {
      const cur = statuses[pick.id] ?? 'running';
      const nextStatus: EquipStatus =
        cur === 'running' ? (Math.random() < 0.4 ? 'alarm' : 'maintenance') : 'running';
      statuses = { ...statuses, [pick.id]: nextStatus };
    }
  }

  return { ...state, statuses, values: newValues, beltPhases, time: state.time + dt, faultTimer: fTimer };
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

/** 创建设备初始设计坐标映射 */
function createInitialPositions(): Record<string, { x: number; y: number }> {
  return Object.fromEntries(EQUIPMENTS.map((e) => [e.id, { x: e.x, y: e.y }]));
}

/* ==================== 组件 ==================== */

/**
 * 工业产线 HMI：设备拓扑 + 实时数值 + 交互
 * @param props.width 总宽度
 * @param props.height 总高度（含底部工具栏）
 */
export function IndustrialHMI(props: Props) {
  const { width = DEFAULT_W, height = DEFAULT_H } = props;

  const canvasH = height - TOOLBAR_H;
  const plotH = canvasH - HEADER_H - STATUS_BAR_H;

  const seed = useMemo(() => createSeed(), []);
  const state = useSimulation(seed, simulateStep, SIM_INTERVAL_MS);

  const [positions, setPositions] = useState(createInitialPositions);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewportEnabled, setViewportEnabled] = useState(false);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);

  const draggingIdRef = useRef<string | null>(null);
  const scaleRef = useRef({ sx: 1, sy: 1 });

  const selectedEquip = selectedId ? EQUIPMENTS.find((e) => e.id === selectedId) : null;
  const selectedIdx = selectedId ? EQUIPMENTS.findIndex((e) => e.id === selectedId) : -1;
  const hoveredEquip = hoveredId ? EQUIPMENTS.find((e) => e.id === hoveredId) : null;
  const hoveredIdx = hoveredId ? EQUIPMENTS.findIndex((e) => e.id === hoveredId) : -1;

  const canvasW = selectedEquip ? width - SIDEBAR_W : width;
  const sx = canvasW / DESIGN_W;
  const sy = plotH / DESIGN_H;
  scaleRef.current = { sx, sy };

  const eqW = EQ_W * Math.min(1, sx);
  const eqH = EQ_H;

  const alarmCount = EQUIPMENTS.filter((e) => (state.statuses[e.id] ?? 'running') === 'alarm').length;
  const runningCount = EQUIPMENTS.filter((e) => (state.statuses[e.id] ?? 'running') === 'running').length;

  /**
   * 将设计坐标映射到画布世界坐标
   * @param id 设备 id
   */
  const mapPos = useCallback((id: string) => {
    const pos = positions[id] ?? { x: 0, y: 0 };
    return { x: pos.x * sx, y: pos.y * sy };
  }, [positions, sx, sy]);

  const selectedPeers = useMemo(() => {
    if (!selectedId) return { upstream: [] as string[], downstream: [] as string[] };
    const upstream = FLOW_LINES.filter((f) => f.to === selectedId).map((f) => f.from);
    const downstream = FLOW_LINES.filter((f) => f.from === selectedId).map((f) => f.to);
    return { upstream, downstream };
  }, [selectedId]);

  /** 切换缩放平移开关 */
  const handleViewportToggle = useCallback((checked: boolean) => {
    setViewportEnabled(checked);
    if (!checked) setViewport(DEFAULT_VIEWPORT);
  }, []);

  /** 重置视口 */
  const handleResetViewport = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, []);

  /** 关闭详情侧边栏 */
  const handleCloseDetail = useCallback(() => {
    setSelectedId(null);
  }, []);

  const equipEventMap = useMemo(() => {
    const map = new Map<string, {
      onClick: () => void;
      onMouseEnter: () => void;
      onMouseLeave: () => void;
      onDragStart: () => void;
      onDrag: (evt: { stepX: number; stepY: number; dx: number; dy: number }) => void;
      onDragEnd: (evt: { dx: number; dy: number }) => void;
    }>();

    for (const eq of EQUIPMENTS) {
      map.set(eq.id, {
        onClick: () => setSelectedId(eq.id),
        onMouseEnter: () => {
          if (draggingIdRef.current) return;
          setHoveredId(eq.id);
        },
        onMouseLeave: () => {
          if (draggingIdRef.current) return;
          setHoveredId(null);
          document.body.style.cursor = '';
        },
        onDragStart: () => {
          draggingIdRef.current = eq.id;
          document.body.style.cursor = 'grabbing';
        },
        onDrag: (evt) => {
          const { sx: csx, sy: csy } = scaleRef.current;
          setPositions((prev) => {
            const cur = prev[eq.id] ?? { x: eq.x, y: eq.y };
            return {
              ...prev,
              [eq.id]: {
                x: cur.x + evt.stepX / csx,
                y: cur.y + evt.stepY / csy,
              },
            };
          });
        },
        onDragEnd: (evt) => {
          draggingIdRef.current = null;
          document.body.style.cursor = '';
          if (Math.abs(evt.dx) < 4 && Math.abs(evt.dy) < 4) {
            setSelectedId(eq.id);
          }
        },
      });
    }
    return map;
  }, []);

  const hintText = viewportEnabled
    ? `缩放: ${Math.round(viewport.scale * 100)}% · 滚轮缩放 · 拖拽平移 · 点击设备查看详情`
    : '点击设备查看详情 · 拖拽设备 · 开启下方开关后可缩放平移';

  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column', background: '#fafbfc' }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 0, height: canvasH }}>
          {/* 固定标题栏 */}
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
              background: alarmCount > 0 ? '#fff2f0' : '#f0f5ff',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            <Typography.Text strong style={{ fontSize: 12, color: '#1a1a2e' }}>
              产线监控 · 一车间
            </Typography.Text>
            <Space size={12}>
              {alarmCount > 0 && (
                <Typography.Text style={{ fontSize: 11, color: '#ff4d4f', fontWeight: 600 }}>
                  ⚠ {alarmCount} 告警
                </Typography.Text>
              )}
              <Typography.Text type="secondary" style={{ fontSize: 9 }}>{hintText}</Typography.Text>
            </Space>
          </div>

          {/* 拓扑画布 */}
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
              <Rect x={0} y={0} width={canvasW} height={plotH} fill="#fafbfc" pointerEvents="none" />

              {FLOW_LINES.map(({ from, to }, i) => {
                const ap = mapPos(from);
                const bp = mapPos(to);
                const startX = ap.x + eqW / 2;
                const endX = bp.x - eqW / 2;
                const mx = (startX + endX) / 2;
                return (
                  <Path
                    key={`flow-${i}`}
                    d={`M ${startX} ${ap.y} C ${mx} ${ap.y} ${mx} ${bp.y} ${endX} ${bp.y}`}
                    fill="none"
                    stroke="#e0e4e8"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    pointerEvents="none"
                  />
                );
              })}

              {EQUIPMENTS.map((eq, i) => {
                const val = state.values[i];
                const status = state.statuses[eq.id] ?? 'running';
                const isAlarm = status === 'alarm';
                const isOff = status === 'idle' || status === 'maintenance';
                const isHovered = hoveredId === eq.id;
                const isSelected = selectedId === eq.id;
                const p = mapPos(eq.id);
                const h = equipEventMap.get(eq.id);
                const hw = eqW / 2;
                const hh = eqH / 2;

                return (
                  <Group key={eq.id}>
                    {isSelected && (
                      <Rect
                        x={p.x - hw - 4}
                        y={p.y - hh - 4}
                        width={eqW + 8}
                        height={eqH + 8}
                        rx={8}
                        fill={TYPE_COLORS[eq.type]}
                        opacity={0.15}
                        pointerEvents="none"
                      />
                    )}
                    {isHovered && !isSelected && (
                      <Rect
                        x={p.x - hw - 3}
                        y={p.y - hh - 3}
                        width={eqW + 6}
                        height={eqH + 6}
                        rx={7}
                        fill={TYPE_COLORS[eq.type]}
                        opacity={0.1}
                        pointerEvents="none"
                      />
                    )}
                    <Rect
                      x={p.x - hw}
                      y={p.y - hh}
                      width={eqW}
                      height={eqH}
                      rx={6}
                      fill={isAlarm ? '#fff2f0' : isOff ? '#fafafa' : '#fff'}
                      stroke={isSelected ? TYPE_COLORS[eq.type] : isAlarm ? '#ffccc7' : '#e8e8e8'}
                      strokeWidth={isSelected ? 2 : isAlarm ? 2 : 1}
                      onClick={h?.onClick}
                      onMouseEnter={h?.onMouseEnter}
                      onMouseLeave={h?.onMouseLeave}
                      onDragStart={h?.onDragStart}
                      onDrag={h?.onDrag}
                      onDragEnd={h?.onDragEnd}
                    />
                    <Rect
                      x={p.x - hw + 6}
                      y={p.y - hh + 6}
                      width={eqW - 12}
                      height={3}
                      rx={1.5}
                      fill={TYPE_COLORS[eq.type]}
                      opacity={isOff ? 0.3 : 1}
                      pointerEvents="none"
                    />
                    <Ellipse cx={p.x} cy={p.y - 4} rx={5} ry={5} fill={STATUS_COLORS[status]} pointerEvents="none" />
                    <Text
                      x={p.x}
                      y={p.y + 10}
                      text={eq.name}
                      fontSize={10}
                      fill="#595959"
                      textAlign="middle"
                      pointerEvents="none"
                    />
                    <Text
                      x={p.x}
                      y={p.y + hh - 6}
                      text={isAlarm ? '--' : formatEquipValue(val, eq.decimals, eq.unit)}
                      fontSize={9}
                      fontWeight="bold"
                      fill={isAlarm ? '#ff4d4f' : '#262626'}
                      textAlign="middle"
                      pointerEvents="none"
                    />
                  </Group>
                );
              })}

              {state.beltPhases.map((phase, bi) => {
                const cp = mapPos('CV1');
                const l = cp.x - eqW / 2 + 8;
                const r = cp.x + eqW / 2 - 8;
                const bx = +(l + (r - l) * phase).toFixed(1);
                return (
                  <Ellipse
                    key={`blt-${bi}`}
                    cx={bx}
                    cy={cp.y}
                    rx={4}
                    ry={4}
                    fill="#13c2c2"
                    opacity={0.5}
                    pointerEvents="none"
                  />
                );
              })}

              {hoveredEquip && hoveredIdx >= 0 && !selectedEquip && (() => {
                const p = mapPos(hoveredEquip.id);
                const status = state.statuses[hoveredEquip.id] ?? 'running';
                const val = state.values[hoveredIdx];
                const isAlarm = status === 'alarm';
                const { x: sxPos, y: syPos } = toScreen(p.x, p.y, viewport);
                const tipW = 110;
                const tipH = 52;
                const tipX = Math.max(4, Math.min(canvasW - tipW - 4, sxPos - tipW / 2));
                const tipY = syPos - eqH / 2 * viewport.scale - tipH - 8;
                return (
                  <Group key="eq-tip" pointerEvents="none">
                    <Rect x={tipX} y={tipY} width={tipW} height={tipH} rx={4} fill="rgba(0,0,0,0.82)" />
                    <Text x={tipX + tipW / 2} y={tipY + 12} text={hoveredEquip.name} fontSize={11} fontWeight="bold" fill="#fff" textAlign="middle" />
                    <Text x={tipX + tipW / 2} y={tipY + 26} text={STATUS_LABELS[status]} fontSize={9} fill={STATUS_COLORS[status]} textAlign="middle" />
                    <Text
                      x={tipX + tipW / 2}
                      y={tipY + 40}
                      text={isAlarm ? '--' : formatEquipValue(val, hoveredEquip.decimals, hoveredEquip.unit)}
                      fontSize={9}
                      fill="#bae7ff"
                      textAlign="middle"
                    />
                  </Group>
                );
              })()}
            </ReactVizComposer>
          </div>

          {/* 固定底栏 */}
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
                设备: {EQUIPMENTS.length}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 10, color: '#52c41a', fontWeight: 600 }}>
                运行: {runningCount}
              </Typography.Text>
              {alarmCount > 0 && (
                <Typography.Text style={{ fontSize: 10, color: '#ff4d4f', fontWeight: 600 }}>
                  告警: {alarmCount}
                </Typography.Text>
              )}
            </Space>
            <Space size={12}>
              {(['running', 'idle', 'alarm', 'maintenance'] as const).map((s) => (
                <Space key={s} size={4}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: STATUS_COLORS[s],
                    }}
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 8 }}>{STATUS_LABELS[s]}</Typography.Text>
                </Space>
              ))}
            </Space>
          </div>
        </div>

        {selectedEquip && selectedIdx >= 0 && (
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
              title="设备详情"
              extra={<Button type="text" size="small" onClick={handleCloseDetail}>关闭</Button>}
              styles={{ body: { padding: '12px' } }}
              style={{ border: 'none', boxShadow: 'none', height: '100%' }}
            >
              <Typography.Title level={5} style={{ margin: '0 0 12px', color: TYPE_COLORS[selectedEquip.type] }}>
                {selectedEquip.name}
              </Typography.Title>
              <Descriptions column={1} size="small" styles={{ label: { color: '#8c8c8c' } }}>
                <Descriptions.Item label="类型">
                  <Tag color={TYPE_COLORS[selectedEquip.type]}>{TYPE_LABELS[selectedEquip.type]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={STATUS_COLORS[state.statuses[selectedEquip.id] ?? 'running']}>
                    {STATUS_LABELS[state.statuses[selectedEquip.id] ?? 'running']}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="当前读数">
                  <span style={{ fontWeight: 600 }}>
                    {(state.statuses[selectedEquip.id] ?? 'running') === 'alarm'
                      ? '--'
                      : formatEquipValue(state.values[selectedIdx], selectedEquip.decimals, selectedEquip.unit)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="基准值">
                  {formatEquipValue(selectedEquip.baseline, selectedEquip.decimals, selectedEquip.unit)}
                </Descriptions.Item>
              </Descriptions>

              {(selectedPeers.upstream.length > 0 || selectedPeers.downstream.length > 0) && (
                <>
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12, marginBottom: 8 }}>
                    物料流向
                  </Typography.Text>
                  {selectedPeers.upstream.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>上游</Typography.Text>
                      <div style={{ marginTop: 4 }}>
                        {selectedPeers.upstream.map((id) => {
                          const eq = EQUIPMENTS.find((e) => e.id === id);
                          return eq ? (
                            <Tag key={id} style={{ marginBottom: 4 }}>{eq.name}</Tag>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  {selectedPeers.downstream.length > 0 && (
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>下游</Typography.Text>
                      <div style={{ marginTop: 4 }}>
                        {selectedPeers.downstream.map((id) => {
                          const eq = EQUIPMENTS.find((e) => e.id === id);
                          return eq ? (
                            <Tag key={id} style={{ marginBottom: 4 }}>{eq.name}</Tag>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </>
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

export default IndustrialHMI;
