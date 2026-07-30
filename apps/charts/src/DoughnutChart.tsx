/**
 * DoughnutChart —— 环形图
 */

import { useMemo } from 'react';
import { Animation, Path, Text, Rect } from 'react-viz-composer';
import {
  ChartFrame,
  CHART_WIDTH,
  CHART_HEIGHT,
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

interface Props extends ChartItemHoverProps<Slice & { percent: string }> {
  data?: Slice[];
}

interface ArcSlice {
  name: string;
  value: number;
  startAngle: number;
  sliceAngle: number;
  midAngle: number;
}

const SLICE_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 80 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 80, delay: 300 },
] as const;

const CENTER_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 600, easing: 'easeOut', targets: 'children', delay: 400 },
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
 * 环形图
 */
export function DoughnutChart(props: Props) {
  return (
    <ChartFrame>
      <DoughnutChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function DoughnutChartPlot(props: Props) {
  const { plotWidth, plotHeight, chartWidth, chartHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (item) => item.name,
  );

  const slices: Slice[] = data ?? [
    { name: '直接访问', value: 335 },
    { name: '搜索引擎', value: 310 },
    { name: '推荐链接', value: 234 },
    { name: '社交媒体', value: 135 },
  ];

  const total = slices.reduce((s, x) => s + x.value, 0);
  const cx = chartWidth / 2 - 80;
  const cy = chartHeight / 2;
  const outerR = Math.min(cx, cy) - 20;
  const innerR = outerR * 0.55;

  const arcs: ArcSlice[] = useMemo(() => {
    let startAngle = -Math.PI / 2;
    return slices.map((s) => {
      const sliceAngle = (s.value / total) * Math.PI * 2;
      const arc: ArcSlice = {
        name: s.name,
        value: s.value,
        startAngle,
        sliceAngle,
        midAngle: startAngle + sliceAngle / 2,
      };
      startAngle += sliceAngle;
      return arc;
    });
  }, [slices, total]);

  return (
    <>
      <Animation playbook={[...SLICE_PLAYBOOK]}>
        {arcs.map((a, i) => {
          const color = CATEGORY_12[i % CATEGORY_12.length];
          const pct = ((a.value / total) * 100).toFixed(0);
          const payload = { ...slices[i], percent: pct };
          const endAngle = a.startAngle + a.sliceAngle;
          return (
            <Path
              key={a.name}
              d={doughnutSlicePath(cx, cy, outerR, innerR, a.startAngle, endAngle)}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(2, isHovering(a.name))}
              opacity={1}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {arcs.map((a) => {
          const pct = ((a.value / total) * 100).toFixed(0);
          const labelR = (outerR + innerR) / 2;
          return (
            <Text
              key={`pct-${a.name}`}
              x={cx + labelR * Math.cos(a.midAngle)}
              y={cy + labelR * Math.sin(a.midAngle) + 4}
              text={`${pct}%`}
              fontSize={12}
              fontWeight="bold"
              fontFamily="sans-serif"
              fill="#fff"
              textAlign="middle"
              opacity={1}
            />
          );
        })}
      </Animation>
      {slices.map((s, i) => {
        const color = CATEGORY_12[i % CATEGORY_12.length];
        const lx = chartWidth - 140;
        const ly = 30 + i * 24;
        const payload = { ...s, percent: ((s.value / total) * 100).toFixed(0) };
        return (
          <Rect
            key={`leg-${s.name}`}
            x={lx}
            y={ly - 8}
            width={12}
            height={12}
            fill={color}
            stroke={AXIS_COLOR}
            strokeWidth={hoverStrokeWidth(1, isHovering(s.name))}
            {...bindHover(payload)}
          />
        );
      })}
      {slices.map((s, i) => (
        <Text
          key={`leg-t-${s.name}`}
          x={chartWidth - 140 + 18}
          y={30 + i * 24 + 2}
          text={s.name}
          fontSize={12}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
        />
      ))}
      <Animation playbook={[...CENTER_PLAYBOOK]}>
        <Text
          x={cx}
          y={cy + 4}
          text="总数"
          fontSize={14}
          fontFamily="sans-serif"
          fill="#595959"
          textAlign="middle"
          opacity={1}
        />
        <Text
          x={cx}
          y={cy + 22}
          text={String(total)}
          fontSize={18}
          fontWeight="bold"
          fontFamily="sans-serif"
          fill="#262626"
          textAlign="middle"
          opacity={1}
        />
      </Animation>
    </>
  );
}


export default DoughnutChart;
