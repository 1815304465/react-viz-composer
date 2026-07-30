/**
 * NestedPieChart —— 嵌套环形图（内外双环）
 */

import { useMemo } from 'react';
import { Animation, Path, Text, Rect } from '@react-viz-composer/core';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  TEXT_COLOR,
  AXIS_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface Slice {
  name: string;
  value: number;
}

interface NestedData {
  inner: Slice[];
  outer: Slice[];
}

interface ArcSlice {
  name: string;
  value: number;
  startAngle: number;
  sliceAngle: number;
  midAngle: number;
  ring: 'inner' | 'outer';
}

interface Props extends ChartItemHoverProps<Slice & { percent: string; ring: string }> {
  data?: NestedData;
}

const SLICE_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 60 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 60, delay: 300 },
] as const;

/**
 * 构建环形扇形路径
 */
function doughnutSlicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  if (endAngle <= startAngle) return '';
  const xOuter0 = cx + outerR * Math.cos(startAngle);
  const yOuter0 = cy + outerR * Math.sin(startAngle);
  const xOuter1 = cx + outerR * Math.cos(endAngle);
  const yOuter1 = cy + outerR * Math.sin(endAngle);
  const xInner0 = cx + innerR * Math.cos(startAngle);
  const yInner0 = cy + innerR * Math.sin(startAngle);
  const xInner1 = cx + innerR * Math.cos(endAngle);
  const yInner1 = cy + innerR * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return (
    `M ${xOuter0} ${yOuter0} ` +
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${xOuter1} ${yOuter1} ` +
    `L ${xInner1} ${yInner1} ` +
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${xInner0} ${yInner0} Z`
  );
}

/**
 * 构建扇形弧段列表
 */
function buildArcs(slices: Slice[], ring: 'inner' | 'outer'): ArcSlice[] {
  const total = slices.reduce((s, x) => s + x.value, 0);
  let startAngle = -Math.PI / 2;
  return slices.map((s) => {
    const sliceAngle = total > 0 ? (s.value / total) * Math.PI * 2 : 0;
    const arc: ArcSlice = {
      name: s.name,
      value: s.value,
      startAngle,
      sliceAngle,
      midAngle: startAngle + sliceAngle / 2,
      ring,
    };
    startAngle += sliceAngle;
    return arc;
  });
}

export function NestedPieChart(props: Props) {
  return (
    <ChartFrame>
      <NestedPieChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function NestedPieChartPlot(props: Props) {
  const { chartWidth, chartHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (item) => `${item.ring}-${item.name}`,
  );

  const nested: NestedData = data ?? {
    inner: [
      { name: '线上', value: 450 },
      { name: '线下', value: 350 },
    ],
    outer: [
      { name: '搜索', value: 180 },
      { name: '社交', value: 120 },
      { name: '门店', value: 200 },
      { name: '活动', value: 150 },
      { name: '其他', value: 150 },
    ],
  };

  const cx = chartWidth / 2 - 60;
  const cy = chartHeight / 2;
  const outerR = Math.min(cx, cy) - 20;
  const midR = outerR * 0.65;
  const innerR = outerR * 0.38;

  const innerArcs = useMemo(() => buildArcs(nested.inner, 'inner'), [nested.inner]);
  const outerArcs = useMemo(() => buildArcs(nested.outer, 'outer'), [nested.outer]);
  const allArcs = [...innerArcs, ...outerArcs];

  const innerTotal = nested.inner.reduce((s, x) => s + x.value, 0);
  const outerTotal = nested.outer.reduce((s, x) => s + x.value, 0);

  return (
    <>
      <Animation playbook={[...SLICE_PLAYBOOK]}>
        {innerArcs.map((a, i) => {
          const color = CATEGORY_12[i % CATEGORY_12.length];
          const total = innerTotal;
          const pct = total > 0 ? ((a.value / total) * 100).toFixed(0) : '0';
          const payload = { name: a.name, value: a.value, percent: pct, ring: 'inner' };
          const endAngle = a.startAngle + a.sliceAngle;
          return (
            <Path
              key={`inner-${a.name}`}
              d={doughnutSlicePath(cx, cy, midR, innerR, a.startAngle, endAngle)}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, isHovering(`inner-${a.name}`))}
              opacity={1}
              {...bindHover(payload)}
            />
          );
        })}
        {outerArcs.map((a, i) => {
          const color = CATEGORY_12[(i + 3) % CATEGORY_12.length];
          const total = outerTotal;
          const pct = total > 0 ? ((a.value / total) * 100).toFixed(0) : '0';
          const payload = { name: a.name, value: a.value, percent: pct, ring: 'outer' };
          const endAngle = a.startAngle + a.sliceAngle;
          return (
            <Path
              key={`outer-${a.name}`}
              d={doughnutSlicePath(cx, cy, outerR, midR + 2, a.startAngle, endAngle)}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, isHovering(`outer-${a.name}`))}
              opacity={1}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {allArcs.map((a) => {
          const total = a.ring === 'inner' ? innerTotal : outerTotal;
          const pct = total > 0 ? ((a.value / total) * 100).toFixed(0) : '0';
          const labelR = a.ring === 'inner' ? (midR + innerR) / 2 : (outerR + midR) / 2;
          if (a.sliceAngle < 0.3) return null;
          return (
            <Text
              key={`pct-${a.ring}-${a.name}`}
              x={cx + labelR * Math.cos(a.midAngle)}
              y={cy + labelR * Math.sin(a.midAngle) + 4}
              text={`${pct}%`}
              fontSize={a.ring === 'inner' ? 11 : 10}
              fontWeight="bold"
              fontFamily="sans-serif"
              fill="#fff"
              textAlign="middle"
              opacity={1}
            />
          );
        })}
      </Animation>
      {[...nested.inner, ...nested.outer].map((s, i) => {
        const ring = i < nested.inner.length ? 'inner' : 'outer';
        const color = CATEGORY_12[i % CATEGORY_12.length];
        const lx = chartWidth - 130;
        const ly = 24 + i * 22;
        const total = ring === 'inner' ? innerTotal : outerTotal;
        const pct = total > 0 ? ((s.value / total) * 100).toFixed(0) : '0';
        const payload = { ...s, percent: pct, ring };
        return (
          <Rect
            key={`leg-${ring}-${s.name}`}
            x={lx}
            y={ly - 7}
            width={10}
            height={10}
            fill={color}
            stroke={AXIS_COLOR}
            strokeWidth={hoverStrokeWidth(1, isHovering(`${ring}-${s.name}`))}
            {...bindHover(payload)}
          />
        );
      })}
      {[...nested.inner, ...nested.outer].map((s, i) => {
        const ring = i < nested.inner.length ? 'inner' : 'outer';
        return (
          <Text
            key={`leg-t-${ring}-${s.name}`}
            x={chartWidth - 130 + 16}
            y={24 + i * 22 + 2}
            text={`${ring === 'inner' ? '内' : '外'}·${s.name}`}
            fontSize={11}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
          />
        );
      })}
    </>
  );
}


export default NestedPieChart;
