/**
 * StackedBarChart —— 堆叠柱状图
 */

import { Animation, Rect, Text } from 'react-viz-composer';
import {
  Axis,
  Grid,
} from 'react-viz-composer';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  scaleBand,
  scaleLinear,
  SEMANTIC_6,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface Series {
  name: string;
  values: number[];
}

interface StackedHoverPayload {
  series: string;
  category: string;
  value: number;
}

interface Props extends ChartItemHoverProps<StackedHoverPayload> {
  data?: Series[];
  categories?: string[];
}

/** 构建堆叠柱入场 playbook */
function buildBarPlaybook(plotHeight: number) {
  return [
    { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 30 },
    { attribute: 'y', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 30 },
  ] as const;
}

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 30, delay: 250 },
] as const;

export function StackedBarChart(props: Props) {
  return (
    <ChartFrame>
      <StackedBarChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function StackedBarChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, categories, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<StackedHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.series}-${p.category}`,
  );

  const series: Series[] = data ?? [
    { name: '搜索引擎', values: [104, 56, 136, 86, 70] },
    { name: '直接访问', values: [42, 55, 26, 60, 48] },
    { name: '推荐来源', values: [51, 36, 45, 20, 38] },
  ];
  const cats = categories ?? ['周一', '周二', '周三', '周四', '周五'];

  const xScale = scaleBand(cats, [0, plotWidth], 0.3);
  const maxStacked = Math.max(
    ...cats.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0)),
  ) * 1.1;
  const yScale = scaleLinear([0, maxStacked], [plotHeight, 0]);

  const segments: {
    key: string;
    x: number;
    y: number;
    fullH: number;
    bandwidth: number;
    color: string;
    payload: StackedHoverPayload;
    hovered: boolean;
    hoverProps: Record<string, unknown>;
    labelY: number;
    value: number;
  }[] = [];

  cats.forEach((cat, ci) => {
    const x = xScale(cat);
    let cumulativeBelow = 0;
    series.forEach((s, si) => {
      const val = s.values[ci];
      const fullH = plotHeight - yScale(val);
      const y = plotHeight - cumulativeBelow - fullH;
      const payload: StackedHoverPayload = { series: s.name, category: cat, value: val };
      segments.push({
        key: `${cat}-${s.name}`,
        x,
        y,
        fullH,
        bandwidth: xScale.bandwidth,
        color: SEMANTIC_6[si % SEMANTIC_6.length],
        payload,
        hovered: isHovering(`${s.name}-${cat}`),
        hoverProps: bindHover(payload),
        labelY: y + fullH / 2 + 4,
        value: val,
      });
      cumulativeBelow += fullH;
    });
  });

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[...buildBarPlaybook(plotHeight)]}>
        {segments.map((seg) => (
          <Rect
            key={seg.key}
            x={seg.x}
            y={seg.y}
            width={seg.bandwidth}
            height={seg.fullH}
            fill={seg.color}
            stroke={seg.color}
            strokeWidth={hoverStrokeWidth(1, seg.hovered)}
            {...seg.hoverProps}
          />
        ))}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {segments.map((seg) => (
          <Text
            key={`t-${seg.key}`}
            x={seg.x + seg.bandwidth / 2}
            y={seg.labelY}
            text={seg.fullH >= 12 ? String(seg.value) : ''}
            fontSize={10}
            fontFamily="sans-serif"
            fill="#fff"
            textAlign="middle"
            opacity={seg.fullH >= 12 ? 1 : 0}
          />
        ))}
      </Animation>
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
    </>
  );
}


export default StackedBarChart;
