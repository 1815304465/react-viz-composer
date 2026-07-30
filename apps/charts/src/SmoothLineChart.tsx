/**
 * SmoothLineChart —— 平滑曲线图
 */

import { Animation, Path, Ellipse, Text } from 'react-viz-composer';
import {
  Axis,
  Grid,
} from 'react-viz-composer';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  scaleBand,
  scaleLinear,
  SEMANTIC_6,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
  BandScale,
  LinearScale,
} from './local';



interface Series {
  name: string;
  values: number[];
}

interface SmoothHoverPayload {
  series: string;
  category: string;
  value: number;
}

interface Props extends ChartItemHoverProps<SmoothHoverPayload> {
  data?: Series[];
  categories?: string[];
}

const PATH_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOut', targets: 'children', stagger: 120 },
] as const;

/** 构建点入场 playbook */
function buildPointPlaybook(plotHeight: number) {
  return [
    { attribute: 'cy', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'opacity', from: 0, duration: 400, easing: 'easeOut', targets: 'children', stagger: 40 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 120, delay: 300 },
] as const;

/** Catmull-Rom 转三次贝塞尔 */
function catmullRomToBezier(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * 构建平滑曲线路径 d
 */
function buildSmoothPath(
  values: number[],
  cats: string[],
  xScale: BandScale,
  yScale: LinearScale,
): string {
  const points = values.map((v, i) => ({
    x: xScale(cats[i]) + xScale.bandwidth / 2,
    y: yScale(v),
  }));
  return catmullRomToBezier(points);
}

export function SmoothLineChart(props: Props) {
  return (
    <ChartFrame>
      <SmoothLineChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function SmoothLineChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, categories, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<SmoothHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.series}-${p.category}`,
  );

  const series: Series[] = data ?? [
    { name: '访问量', values: [120, 200, 150, 80, 70, 110, 130] },
    { name: '注册量', values: [80, 130, 90, 50, 40, 70, 90] },
    { name: '订单量', values: [40, 60, 50, 30, 20, 35, 45] },
  ];
  const cats = categories ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const xScale = scaleBand(cats, [0, plotWidth], 0.1);
  const maxV = Math.max(...series.flatMap((s) => s.values)) * 1.1;
  const yScale = scaleLinear([0, maxV], [plotHeight, 0]);

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[...PATH_PLAYBOOK]}>
        {series.map((s, idx) => (
          <Path
            key={`smooth-${s.name}`}
            d={buildSmoothPath(s.values, cats, xScale, yScale)}
            fill="none"
            stroke={SEMANTIC_6[idx % SEMANTIC_6.length]}
            strokeWidth={2}
            opacity={1}
          />
        ))}
      </Animation>
      <Animation playbook={[...buildPointPlaybook(plotHeight)]}>
        {series.flatMap((s, idx) => {
          const color = SEMANTIC_6[idx % SEMANTIC_6.length];
          return s.values.map((v, i) => {
            const payload: SmoothHoverPayload = {
              series: s.name,
              category: cats[i],
              value: v,
            };
            const pointKey = `${s.name}-${cats[i]}`;
            return (
              <Ellipse
                key={`${s.name}-${i}`}
                cx={xScale(cats[i]) + xScale.bandwidth / 2}
                cy={yScale(v)}
                rx={isHovering(pointKey) ? 7 : 5}
                ry={isHovering(pointKey) ? 7 : 5}
                fill="#fff"
                stroke={color}
                strokeWidth={hoverStrokeWidth(2, isHovering(pointKey))}
                opacity={1}
                {...bindHover(payload)}
              />
            );
          });
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {series.map((s, idx) => {
          const lastIdx = s.values.length - 1;
          const lastX = xScale(cats[lastIdx]) + xScale.bandwidth / 2;
          const lastValue = s.values[lastIdx];
          return (
            <Text
              key={`label-${s.name}`}
              x={lastX + 8}
              y={yScale(lastValue) + 4}
              text={s.name}
              fontSize={11}
              fontFamily="sans-serif"
              fill={SEMANTIC_6[idx % SEMANTIC_6.length]}
              opacity={1}
            />
          );
        })}
      </Animation>
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
    </>
  );
}


export default SmoothLineChart;
