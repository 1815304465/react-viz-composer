/**
 * RoseChart —— 南丁格尔玫瑰图（极区图）
 */

import { Animation, Path, Text } from 'react-viz-composer';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface RoseItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<RoseItem> {
  data?: RoseItem[];
}

const SLICE_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 80 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 80, delay: 300 },
] as const;

/**
 * 构建玫瑰图扇形路径
 */
function roseSlicePath(
  cx: number,
  cy: number,
  maxR: number,
  maxVal: number,
  item: RoseItem,
  index: number,
  angleStep: number,
  startAngleOffset: number,
): string {
  const ratio = item.value / maxVal;
  const r = maxR * ratio;
  const startAngle = startAngleOffset + index * angleStep;
  const endAngle = startAngleOffset + (index + 1) * angleStep;
  if (r <= 0) return `M ${cx} ${cy} L ${cx} ${cy} Z`;
  const segs = 20;
  const points: { x: number; y: number }[] = [];
  for (let j = 0; j <= segs; j++) {
    const a = startAngle + (j / segs) * (endAngle - startAngle);
    points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  const dParts = [`M ${cx} ${cy}`, `L ${points[0].x} ${points[0].y}`];
  for (let j = 1; j < points.length; j++) {
    dParts.push(`L ${points[j].x} ${points[j].y}`);
  }
  dParts.push('Z');
  return dParts.join(' ');
}

/**
 * 南丁格尔玫瑰图
 */
export function RoseChart(props: Props) {
  return (
    <ChartFrame>
      <RoseChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function RoseChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: RoseItem) => d.name,
  );

  const slices: RoseItem[] = data ?? [
    { name: '星期一', value: 40 },
    { name: '星期二', value: 55 },
    { name: '星期三', value: 70 },
    { name: '星期四', value: 45 },
    { name: '星期五', value: 60 },
    { name: '星期六', value: 80 },
    { name: '星期日', value: 35 },
    { name: '平均值', value: 50 },
  ];

  const cx = plotWidth / 2;
  const cy = plotHeight / 2;
  const maxR = Math.min(cx, cy) - 10;
  const n = slices.length;
  const maxVal = Math.max(...slices.map((s) => s.value));
  const angleStep = (Math.PI * 2) / n;
  const startAngleOffset = -Math.PI / 2;

  return (
    <>
      <Animation playbook={[...SLICE_PLAYBOOK]}>
        {slices.map((s, i) => (
          <Path
            key={s.name}
            d={roseSlicePath(cx, cy, maxR, maxVal, s, i, angleStep, startAngleOffset)}
            fill={CATEGORY_12[i % CATEGORY_12.length]}
            stroke="#fff"
            strokeWidth={hoverStrokeWidth(1, isHovering(s.name))}
            opacity={1}
            {...bindHover(s)}
          />
        ))}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {slices.map((s, i) => {
          const ratio = s.value / maxVal;
          const r = maxR * ratio * 0.65;
          const midAngle = startAngleOffset + (i + 0.5) * angleStep;
          return (
            <Text
              key={`t-${s.name}`}
              x={cx + r * Math.cos(midAngle)}
              y={cy + r * Math.sin(midAngle) + 4}
              text={s.name}
              fontSize={11}
              fontFamily="sans-serif"
              fill="#595959"
              textAlign="middle"
              opacity={1}
            />
          );
        })}
      </Animation>
    </>
  );
}


export default RoseChart;
