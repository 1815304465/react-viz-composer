/**
 * PieChart —— 饼图
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

/**
 * 构建饼图扇形路径
 */
function pieSlicePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  if (endAngle <= startAngle) return `M ${cx} ${cy} L ${cx} ${cy} Z`;
  const x0 = cx + r * Math.cos(startAngle);
  const y0 = cy + r * Math.sin(startAngle);
  const x1 = cx + r * Math.cos(endAngle);
  const y1 = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

export function PieChart(props: Props) {
  return (
    <ChartFrame>
      <PieChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function PieChartPlot(props: Props) {
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
  const r = Math.min(cx, cy) - 20;

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
              d={pieSlicePath(cx, cy, r, a.startAngle, endAngle)}
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
          const labelR = r * 0.6;
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
    </>
  );
}


export default PieChart;
