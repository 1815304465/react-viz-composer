/**
 * KnowledgeGraph —— 知识图谱（交互版）
 *
 * - 挂载时力导向收敛后冻结
 * - 悬停：仅当前节点轻微外晕 + 同色描边；cursor = grab
 * - 拖拽：节点跟随鼠标，cursor = grabbing；松手后以该节点为锚点复活力导向
 *
 * 注意：交互事件绑在可命中的 Ellipse 上（非 Group）。Canvas 空间索引不含
 * group，子节点 pointerEvents="none" 时 Group 无法被点中。
 */

import { useMemo, useRef, useState, useEffect } from 'react';
import {
  ReactVizComposer,
  Ellipse,
  Line,
  Text,
  Group,
  Rect,
} from 'react-viz-composer';

/* ==================== 类型 ==================== */

interface GraphNode {
  id: string;
  label: string;
  group: string;
  isCore: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
}

interface Props {
  width?: number;
  height?: number;
}

/* ==================== 数据 ==================== */

const W = 700;
const H = 420;
const CX = W / 2;
const CY = H / 2 + 10;

const NODES: GraphNode[] = [
  { id: 'AI', label: '人工智能', group: 'tech', isCore: true },
  { id: 'ML', label: '机器学习', group: 'tech', isCore: false },
  { id: 'DL', label: '深度学习', group: 'tech', isCore: false },
  { id: 'NLP', label: '自然语言', group: 'tech', isCore: false },
  { id: 'CV', label: '计算机视觉', group: 'tech', isCore: false },
  { id: 'Data', label: '大数据', group: 'data', isCore: true },
  { id: 'Cloud', label: '云计算', group: 'infra', isCore: true },
  { id: 'Edge', label: '边缘计算', group: 'infra', isCore: false },
  { id: 'IoT', label: '物联网', group: 'infra', isCore: false },
  { id: 'Blockchain', label: '区块链', group: 'web3', isCore: false },
  { id: 'Web3', label: 'Web3', group: 'web3', isCore: false },
  { id: 'Robot', label: '机器人', group: 'hardware', isCore: false },
  { id: 'Chip', label: '芯片', group: 'hardware', isCore: false },
  { id: '5G', label: '5G', group: 'infra', isCore: false },
  { id: 'Auto', label: '自动驾驶', group: 'app', isCore: false },
];

const EDGES: GraphEdge[] = [
  { source: 'AI', target: 'ML', weight: 0.9 },
  { source: 'ML', target: 'DL', weight: 0.8 },
  { source: 'AI', target: 'NLP', weight: 0.7 },
  { source: 'AI', target: 'CV', weight: 0.7 },
  { source: 'DL', target: 'NLP', weight: 0.6 },
  { source: 'DL', target: 'CV', weight: 0.65 },
  { source: 'AI', target: 'Data', weight: 0.8 },
  { source: 'Data', target: 'Cloud', weight: 0.7 },
  { source: 'AI', target: 'Cloud', weight: 0.7 },
  { source: 'Cloud', target: 'Edge', weight: 0.5 },
  { source: 'IoT', target: 'Edge', weight: 0.55 },
  { source: 'IoT', target: '5G', weight: 0.5 },
  { source: '5G', target: 'Auto', weight: 0.5 },
  { source: 'AI', target: 'Auto', weight: 0.65 },
  { source: 'CV', target: 'Auto', weight: 0.6 },
  { source: 'Robot', target: 'AI', weight: 0.55 },
  { source: 'Robot', target: 'Chip', weight: 0.5 },
  { source: 'Chip', target: 'AI', weight: 0.6 },
  { source: 'Blockchain', target: 'Web3', weight: 0.6 },
  { source: 'Cloud', target: 'Blockchain', weight: 0.4 },
];

const GROUP_COLORS: Record<string, string> = {
  tech: '#1677ff',
  data: '#52c41a',
  infra: '#fa8c16',
  web3: '#722ed1',
  hardware: '#eb2f96',
  app: '#13c2c2',
};

/* ==================== 物理引擎 ==================== */

const REPULSION = 500;
const BASE_LINK_DIST = 80;
const CENTER_GRAVITY = 0.003;
const VELOCITY_DECAY = 0.5;
const COLLISION_RADIUS = 26;

/** 根据图数据创建初始仿真节点（中心附近随机） */
function createSimNodes(): SimNode[] {
  return NODES.map((n) => ({
    id: n.id,
    x: CX + (Math.random() - 0.5) * 80,
    y: CY + (Math.random() - 0.5) * 80,
    vx: 0,
    vy: 0,
    mass: n.isCore ? 2.5 : 1,
  }));
}

/**
 * 单步力导向：排斥力 + 边拉力 + 中心引力 + 碰撞
 * @param nodes 当前节点（会被就地更新）
 * @param alpha 温度系数
 * @param pinnedId 固定不动的节点 id
 */
function forceTick(nodes: SimNode[], alpha: number, pinnedId: string | null) {
  const n = nodes.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (REPULSION * alpha) / (d * d);
      a.vx -= (dx / d) * f / a.mass;
      a.vy -= (dy / d) * f / a.mass;
      b.vx += (dx / d) * f / b.mass;
      b.vy += (dy / d) * f / b.mass;
    }
  }

  for (const e of EDGES) {
    const si = nodes.findIndex((x) => x.id === e.source);
    const ti = nodes.findIndex((x) => x.id === e.target);
    if (si < 0 || ti < 0) continue;
    const a = nodes[si];
    const b = nodes[ti];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const target = BASE_LINK_DIST / e.weight;
    const f = (d - target) * alpha * 0.2;
    a.vx += (dx / d) * f;
    a.vy += (dy / d) * f;
    b.vx -= (dx / d) * f;
    b.vy -= (dy / d) * f;
  }

  for (const sn of nodes) {
    if (sn.id === pinnedId) {
      sn.vx = 0;
      sn.vy = 0;
      continue;
    }
    sn.vx += (CX - sn.x) * CENTER_GRAVITY * alpha;
    sn.vy += (CY - sn.y) * CENTER_GRAVITY * alpha;
    sn.x += sn.vx * 0.6;
    sn.y += sn.vy * 0.6;
    sn.vx *= VELOCITY_DECAY;
    sn.vy *= VELOCITY_DECAY;
    sn.x = Math.max(25, Math.min(W - 25, sn.x));
    sn.y = Math.max(25, Math.min(H - 35, sn.y));
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < COLLISION_RADIUS) {
        const overlap = COLLISION_RADIUS - d;
        const fx = (dx / d) * overlap * 0.4;
        const fy = (dy / d) * overlap * 0.4;
        if (a.id !== pinnedId) {
          a.x -= fx / a.mass;
          a.y -= fy / a.mass;
        }
        if (b.id !== pinnedId) {
          b.x += fx / b.mass;
          b.y += fy / b.mass;
        }
      }
    }
  }
}

/**
 * 用 rAF 跑力导向直至 alpha 冷却
 * @param initial 初始节点快照
 * @param alpha 起始温度
 * @param pinnedId 固定节点
 * @param onTick 每帧回调
 * @returns 停止函数
 */
function runSimulation(
  initial: SimNode[],
  alpha: number,
  pinnedId: string | null,
  onTick: (nodes: SimNode[], done: boolean) => void,
): () => void {
  let stopped = false;
  let nodes = initial;
  let a = alpha;

  function tick() {
    if (stopped) return;
    const cur = nodes.map((n) => ({ ...n }));
    forceTick(cur, a, pinnedId);
    a *= 0.96;
    nodes = cur;
    const done = a < 0.005;
    onTick(cur, done);
    if (!done) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  return () => {
    stopped = true;
  };
}

/** 同步 document.body 鼠标手型 */
function setBodyCursor(cursor: string) {
  document.body.style.cursor = cursor;
}

/* ==================== 组件 ==================== */

/**
 * 可拖拽知识图谱场景
 * @param props.width 画布宽
 * @param props.height 画布高
 */
function KnowledgeGraph(props: Props) {
  const { width = W, height = H } = props;

  const [simNodes, setSimNodes] = useState<SimNode[]>(() => createSimNodes());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const simRef = useRef(simNodes);
  simRef.current = simNodes;
  const stopRef = useRef<(() => void) | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const hoveredIdRef = useRef<string | null>(null);

  // ---- 初始仿真 ----
  useEffect(() => {
    stopRef.current?.();
    const stop = runSimulation(createSimNodes(), 1, null, (nodes, done) => {
      simRef.current = nodes;
      setSimNodes(nodes);
      if (done) stopRef.current = null;
    });
    stopRef.current = stop;
    return () => {
      stop();
      setBodyCursor('');
    };
  }, []);

  // ---- 节点事件（绑在可命中 Ellipse 上）----
  const nodeHandlers = useMemo(() => {
    const map = new Map<string, {
      onMouseEnter: () => void;
      onMouseLeave: () => void;
      onDragStart: () => void;
      onDrag: (evt: { stepX: number; stepY: number }) => void;
      onDragEnd: () => void;
    }>();

    for (const node of NODES) {
      map.set(node.id, {
        onMouseEnter: () => {
          if (draggingIdRef.current) return;
          hoveredIdRef.current = node.id;
          setHoveredId(node.id);
          setBodyCursor('grab');
        },
        onMouseLeave: () => {
          if (draggingIdRef.current) return;
          hoveredIdRef.current = null;
          setHoveredId(null);
          setBodyCursor('');
        },
        onDragStart: () => {
          stopRef.current?.();
          stopRef.current = null;
          draggingIdRef.current = node.id;
          hoveredIdRef.current = node.id;
          setHoveredId(node.id);
          setBodyCursor('grabbing');
        },
        onDrag: (evt) => {
          setSimNodes((prev) => {
            const next = prev.map((n) =>
              n.id === node.id
                ? { ...n, x: n.x + evt.stepX, y: n.y + evt.stepY, vx: 0, vy: 0 }
                : n,
            );
            simRef.current = next;
            return next;
          });
        },
        onDragEnd: () => {
          draggingIdRef.current = null;
          setBodyCursor(hoveredIdRef.current ? 'grab' : '');
          stopRef.current?.();
          const cur = simRef.current.map((n) => ({ ...n, vx: 0, vy: 0 }));
          // 以拖拽节点为锚点，其余节点重新力导向收敛
          const stop = runSimulation(cur, 0.55, node.id, (nodes, done) => {
            simRef.current = nodes;
            setSimNodes(nodes);
            if (done) stopRef.current = null;
          });
          stopRef.current = stop;
        },
      });
    }
    return map;
  }, []);

  // ---- 预计算边端点索引 ----
  const edgeEndpoints = useMemo(
    () =>
      EDGES.map((e) => {
        const si = NODES.findIndex((n) => n.id === e.source);
        const ti = NODES.findIndex((n) => n.id === e.target);
        return { si, ti, weight: e.weight };
      }).filter(({ si, ti }) => si >= 0 && ti >= 0),
    [],
  );

  const hoveredNode = hoveredId ? NODES.find((n) => n.id === hoveredId) : null;
  const hoveredSim = hoveredId ? simNodes.find((n) => n.id === hoveredId) : null;

  return (
    <ReactVizComposer engine="canvas" width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill="#fafbfc" />
      <Text
        x={width / 2}
        y={20}
        text="科技知识图谱"
        fontSize={14}
        fontWeight="bold"
        fill="#1a1a2e"
        textAlign="middle"
      />
      <Text
        x={width / 2}
        y={36}
        text={`${NODES.length} 实体 · ${EDGES.length} 关系 · 拖拽节点后自动重布局`}
        fontSize={9}
        fill="#8c8c8c"
        textAlign="middle"
      />

      {/* 连线（悬停不改色） */}
      {edgeEndpoints.map(({ si, ti, weight }, i) => {
        const a = simNodes[si];
        const b = simNodes[ti];
        if (!a || !b) return null;
        return (
          <Line
            key={`e-${i}`}
            points={[
              { x: +a.x.toFixed(1), y: +a.y.toFixed(1) },
              { x: +b.x.toFixed(1), y: +b.y.toFixed(1) },
            ]}
            stroke={`rgba(22, 119, 255, ${+(0.12 + weight * 0.35).toFixed(2)})`}
            strokeWidth={+(0.5 + weight * 1.2).toFixed(1)}
            pointerEvents="none"
          />
        );
      })}

      {/* 节点：仅悬停节点本身轻微高亮，其余保持原样 */}
      {NODES.map((node, i) => {
        const sn = simNodes[i];
        if (!sn) return null;
        const color = GROUP_COLORS[node.group] ?? '#8c8c8c';
        const r = node.isCore ? 20 : 13;
        const isHovered = hoveredId === node.id;
        const h = nodeHandlers.get(node.id);
        const cx = +sn.x.toFixed(1);
        const cy = +sn.y.toFixed(1);

        return (
          <Group key={node.id}>
            <Ellipse
              cx={cx}
              cy={cy}
              rx={isHovered ? r + 6 : r + 4}
              ry={isHovered ? r + 6 : r + 4}
              fill={color}
              opacity={isHovered ? 0.12 : 0.05}
              pointerEvents="none"
            />
            <Ellipse
              cx={cx}
              cy={cy}
              rx={r}
              ry={r}
              fill={color}
              opacity={0.85}
              stroke={isHovered ? color : 'transparent'}
              strokeWidth={isHovered ? 1.5 : 0}
              onMouseEnter={h?.onMouseEnter}
              onMouseLeave={h?.onMouseLeave}
              onDragStart={h?.onDragStart}
              onDrag={h?.onDrag}
              onDragEnd={h?.onDragEnd}
            />
            <Text
              x={cx}
              y={+(sn.y + 1).toFixed(1)}
              text={node.label}
              fontSize={node.isCore ? 9 : 7}
              fontWeight={node.isCore ? 'bold' : 'normal'}
              fill="#fff"
              textAlign="middle"
              textBaseline="middle"
              pointerEvents="none"
            />
          </Group>
        );
      })}

      {/* tooltip */}
      {hoveredNode && hoveredSim && (
        <Group pointerEvents="none">
          <Rect
            x={hoveredSim.x - 42}
            y={hoveredSim.y - (hoveredNode.isCore ? 20 : 13) - 26}
            width={84}
            height={18}
            rx={4}
            fill="rgba(0,0,0,0.78)"
          />
          <Text
            x={hoveredSim.x}
            y={hoveredSim.y - (hoveredNode.isCore ? 20 : 13) - 15}
            text={hoveredNode.label}
            fontSize={10}
            fontWeight="bold"
            fill="#fff"
            textAlign="middle"
            textBaseline="middle"
          />
        </Group>
      )}

      {/* 图例 */}
      <Group x={width - 240} y={H - 28} pointerEvents="none">
        {Object.entries(GROUP_COLORS).map(([group, color], i) => (
          <Group key={group} x={i * 42}>
            <Ellipse cx={0} cy={5} rx={4} ry={4} fill={color} />
            <Text x={8} y={8} text={group} fontSize={7} fill="#8c8c8c" />
          </Group>
        ))}
      </Group>
    </ReactVizComposer>
  );
}

export default KnowledgeGraph;
export { KnowledgeGraph };
