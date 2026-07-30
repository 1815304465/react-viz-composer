/**
 * ExplorableScatterChart —— 可探索的大规模散点
 *
 * 体现：interactiveViewport 平移缩放、Canvas 命中、VizEvent onClick 选中聚类
 */

import { useMemo, useState, useId } from 'react';
import { Animation, Points, Line, Text, Rect } from 'react-viz-composer';
import type { VizEvent } from 'react-viz-composer';
import {
  ExplorableChartFrame,
  CATEGORY_12,
  GRID_COLOR,
  TEXT_COLOR,
} from './local';


interface ExplorePoint {
  x: number;
  y: number;
  group: number;
}

interface Props {
  data?: ExplorePoint[];
}

const GROUP_LABELS = ['集群 A', '集群 B', '集群 C', '集群 D'];

const POINTS_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOut', targets: 'explore-points' },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 80, delay: 300 },
] as const;

/**
 * 可探索散点图
 */
function ExplorableScatterChart(props: Props) {
  const { data } = props;
  const [activeGroup, setActiveGroup] = useState<number | null>(null);

  const points = useMemo(() => data ?? [], [data]);
  const worldW = 900;
  const worldH = 700;
  const autoId = useId();
  const pointsId = `explore-${autoId}`;

  const baseCx = useMemo(() => points.map((p) => p.x), [points]);
  const baseCy = useMemo(() => points.map((p) => p.y), [points]);
  const fills = useMemo(
    () => points.map((p) => {
      const color = CATEGORY_12[p.group % CATEGORY_12.length];
      const dimmed = activeGroup !== null && activeGroup !== p.group;
      return dimmed ? `${color}40` : `${color}D9`;
    }),
    [points, activeGroup],
  );
  const strokes = useMemo(
    () => points.map((p) =>
      activeGroup === p.group ? '#000' : CATEGORY_12[p.group % CATEGORY_12.length],
    ),
    [points, activeGroup],
  );
  const strokeWidths = useMemo(
    () => points.map((p) => (activeGroup === p.group ? 1.5 : 0)),
    [points, activeGroup],
  );
  const baseRadii = useMemo(
    () => points.map((p) => (activeGroup !== null && activeGroup !== p.group ? 3 : 5)),
    [points, activeGroup],
  );

  return (
    <ExplorableChartFrame>
      {Array.from({ length: 10 }).map((_, i) => {
        const x = (worldW / 10) * i;
        return (
          <Line
            key={`vg-${i}`}
            points={[{ x, y: 0 }, { x, y: worldH }]}
            stroke={GRID_COLOR}
            strokeWidth={1}
            pointerEvents="none"
          />
        );
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const y = (worldH / 8) * i;
        return (
          <Line
            key={`hg-${i}`}
            points={[{ x: 0, y }, { x: worldW, y }]}
            stroke={GRID_COLOR}
            strokeWidth={1}
            pointerEvents="none"
          />
        );
      })}

      <Rect
        x={0}
        y={0}
        width={worldW}
        height={worldH}
        fill="transparent"
        onClick={() => setActiveGroup(null)}
      />

      <Animation playbook={[
        ...POINTS_PLAYBOOK,
        {
          duration: 700,
          easing: 'easeOutCubic',
          targets: pointsId,
          compute: ({ progress }: { progress: number }) => ({
            rx: baseRadii.map((rad) => rad * progress),
            ry: baseRadii.map((rad) => rad * progress),
          }),
        },
      ]}>
        <Points
          id={pointsId}
          cx={baseCx}
          cy={baseCy}
          rx={baseRadii}
          ry={baseRadii}
          fill={fills}
          stroke={strokes}
          strokeWidth={strokeWidths}
          opacity={1}
          zIndex={activeGroup !== null ? 10 : 1}
          onClick={(evt: VizEvent) => {
            evt.stopPropagation();
            const idx = evt.pointIndex;
            if (idx != null && points[idx]) setActiveGroup(points[idx].group);
          }}
        />
      </Animation>

      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {GROUP_LABELS.map((label, g) => {
          const sample = points.find((p) => p.group === g);
          if (!sample) return null;
          return (
            <Text
              key={`lbl-${g}`}
              x={sample.x + 12}
              y={sample.y - 12}
              text={label}
              fontSize={12}
              fontFamily="sans-serif"
              fill={activeGroup === g ? TEXT_COLOR : '#bfbfbf'}
              fontWeight={activeGroup === g ? 'bold' : 'normal'}
              opacity={1}
            />
          );
        })}
      </Animation>

      {activeGroup !== null && (
        <Animation playbook={[
          { attribute: 'opacity', from: 0, duration: 400, easing: 'easeOut', targets: 'children', delay: 200 },
        ]}>
          <Rect
            x={worldW - 160}
            y={12}
            width={148}
            height={32}
            fill="rgba(255,255,255,0.9)"
            stroke={GRID_COLOR}
            strokeWidth={1}
            rx={4}
            ry={4}
            zIndex={20}
            opacity={1}
          />
          <Text
            x={worldW - 86}
            y={32}
            text={`已选 ${GROUP_LABELS[activeGroup]}`}
            fontSize={11}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="middle"
            zIndex={21}
            opacity={1}
          />
        </Animation>
      )}
    </ExplorableChartFrame>
  );
}

export default ExplorableScatterChart;
export { ExplorableScatterChart };
