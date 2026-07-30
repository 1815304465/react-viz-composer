/**
 * ThemeRiverChart —— 主题河流图
 */

import { useMemo } from 'react';
import { Animation, Path, Text } from 'react-viz-composer';
import {
  Axis,
  Grid,
} from 'react-viz-composer';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverOpacity,
  scaleBand,
  scaleLinear,
  CATEGORY_12,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
  BandScale,
} from './local';


interface ThemeRiverSeries {
  name: string;
  values: number[];
}

interface ThemeRiverHoverPayload {
  name: string;
}

interface Props extends ChartItemHoverProps<ThemeRiverHoverPayload> {
  categories?: string[];
  series?: ThemeRiverSeries[];
}

const BAND_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 800, easing: 'easeOutCubic', targets: 'children', stagger: 120 },
] as const;

const LEGEND_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 80, delay: 400 },
] as const;

/**
 * 构建主题河流带路径
 */
function buildRiverBandPath(
  top: number[],
  bottom: number[],
  cats: string[],
  xAt: (i: number) => number,
  yScale: ReturnType<typeof scaleLinear>,
): string {
  const n = cats.length;
  const topPts = top.map((v, j) => ({
    x: xAt(j),
    y: yScale(v),
  }));
  const bottomPts = bottom.map((v, j) => ({
    x: xAt(j),
    y: yScale(v),
  }));
  let d = `M ${topPts[0].x} ${topPts[0].y}`;
  for (let j = 0; j < topPts.length - 1; j++) {
    const cp1x = topPts[j].x + (topPts[j + 1].x - topPts[j].x) / 3;
    const cp2x = topPts[j + 1].x - (topPts[j + 1].x - topPts[j].x) / 3;
    d += ` C ${cp1x} ${topPts[j].y}, ${cp2x} ${topPts[j + 1].y}, ${topPts[j + 1].x} ${topPts[j + 1].y}`;
  }
  for (let j = bottomPts.length - 1; j >= 0; j--) {
    if (j === bottomPts.length - 1) {
      d += ` L ${bottomPts[j].x} ${bottomPts[j].y}`;
    } else {
      const cp1x = bottomPts[j + 1].x + (bottomPts[j].x - bottomPts[j + 1].x) / 3;
      const cp2x = bottomPts[j].x - (bottomPts[j].x - bottomPts[j + 1].x) / 3;
      d += ` C ${cp1x} ${bottomPts[j + 1].y}, ${cp2x} ${bottomPts[j].y}, ${bottomPts[j].x} ${bottomPts[j].y}`;
    }
  }
  d += ' Z';
  return d;
}

/**
 * 主题河流图
 */
export function ThemeRiverChart(props: Props) {
  return (
    <ChartFrame>
      <ThemeRiverChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function ThemeRiverChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { categories, series, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p) => p.name,
  );

  const cats: string[] = categories ?? ['1月', '2月', '3月', '4月', '5月', '6月', '7月'];
  const sers: ThemeRiverSeries[] = series ?? [
    { name: '产品A', values: [30, 50, 35, 45, 60, 40, 55] },
    { name: '产品B', values: [20, 30, 25, 40, 35, 30, 45] },
    { name: '产品C', values: [15, 25, 20, 30, 25, 20, 35] },
  ];
  const n = cats.length;

  const stacked = useMemo(() => {
    const result: number[][] = sers.map(() => new Array(n).fill(0));
    for (let j = 0; j < n; j++) {
      let running = 0;
      for (let i = 0; i < sers.length; i++) {
        running += sers[i].values[j];
        result[i][j] = running;
      }
    }
    return result;
  }, [sers, n]);

  const maxTotal = Math.max(...stacked[stacked.length - 1]);
  const xScale: BandScale = useMemo(
    () => scaleBand(cats, [0, plotWidth], 0.3),
    [cats],
  );
  const yScale = useMemo(
    () => scaleLinear([0, maxTotal * 1.1], [plotHeight, 0]),
    [maxTotal],
  );

  function xAt(i: number): number {
    return xScale(cats[i]) + xScale.bandwidth / 2;
  }

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      <Animation playbook={[...BAND_PLAYBOOK]}>
        {sers.map((ser, i) => {
          const top = stacked[i];
          const bottom = i > 0 ? stacked[i - 1] : new Array(n).fill(0);
          const color = CATEGORY_12[i % CATEGORY_12.length];
          const payload: ThemeRiverHoverPayload = { name: ser.name };
          return (
            <Path
              key={ser.name}
              d={buildRiverBandPath(top, bottom, cats, xAt, yScale)}
              fill={color}
              opacity={hoverOpacity(0.65, isHovering(ser.name))}
              stroke={color}
              strokeWidth={0.5}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...LEGEND_PLAYBOOK]}>
        {sers.map((ser, i) => (
          <Text
            key={`leg-${ser.name}`}
            x={plotWidth - 80}
            y={14 + i * 18}
            text={ser.name}
            fontSize={11}
            fontFamily="sans-serif"
            fill={CATEGORY_12[i % CATEGORY_12.length]}
            opacity={1}
          />
        ))}
      </Animation>
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
      <Axis scale={yScale} orient="left"  length={plotHeight} crossAt={0}  />
    </>
  );
}


export default ThemeRiverChart;
