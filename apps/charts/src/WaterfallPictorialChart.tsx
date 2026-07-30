/**
 * WaterfallPictorialChart —— 象形柱图
 *
 * 每个柱体用一系列图标（Image）堆叠表示，代替传统矩形柱。
 */

import { Fragment } from 'react';
import { Animation, Rect, Text, Image } from 'react-viz-composer';
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
  scaleLinear,
  scaleBand,
  SEMANTIC_6,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface PictorialBarItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<PictorialBarItem> {
  data?: PictorialBarItem[];
  unitSize?: number;
  iconUrl?: string;
  iconW?: number;
  iconH?: number;
}

const DEFAULT_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
    '<circle cx="12" cy="12" r="10" fill="#1677ff" opacity="0.85"/>' +
    '<circle cx="12" cy="12" r="6" fill="white" opacity="0.3"/>' +
    '</svg>',
  );

/** 构建象形柱入场 playbook */
function buildIconPlaybook(plotHeight: number) {
  return [
    { attribute: 'y', from: plotHeight, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 20 },
  ] as const;
}

const FOOTER_PLAYBOOK = [
  { attribute: 'width', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40 },
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 40 },
] as const;

/**
 * 象形柱图
 */
export function PictorialBarChart(props: Props) {
  return (
    <ChartFrame>
      <PictorialBarChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function PictorialBarChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const {
    data,
    unitSize = 5,
    iconUrl = DEFAULT_ICON,
    iconW = 20,
    iconH = 20,
    onItemEnter,
    onItemLeave,
  } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: PictorialBarItem) => d.name,
  );

  const dataset = data ?? [
    { name: 'Q1', value: 35 },
    { name: 'Q2', value: 52 },
    { name: 'Q3', value: 28 },
    { name: 'Q4', value: 46 },
  ];

  const iconCount = Math.ceil(Math.max(...dataset.map((d) => d.value)) / unitSize) + 1;
  const maxY = iconCount * unitSize * 1.15;
  const xScale = scaleBand(
    dataset.map((d) => d.name),
    [0, plotWidth],
    0.25,
  );
  const yScale = scaleLinear([0, maxY], [plotHeight, 0]);

  return (
    <>
      <Grid scale={yScale} orient="y"  length={plotWidth} />
      {dataset.map((item) => {
        const x = xScale(item.name);
        const count = Math.ceil(item.value / unitSize);
        const iconX = x + (xScale.bandwidth - iconW) / 2;
        return (
          <Fragment key={item.name}>
            <Animation playbook={[...buildIconPlaybook(plotHeight)]}>
              {Array.from({ length: count }, (_, i) => (
                <Image
                  key={`icon-${item.name}-${i}`}
                  x={iconX}
                  y={yScale(unitSize * (i + 1))}
                  width={iconW}
                  height={iconH}
                  src={iconUrl}
                />
              ))}
            </Animation>
            <Animation playbook={[...FOOTER_PLAYBOOK]}>
              <Rect
                x={x + 2}
                y={plotHeight - 4}
                width={xScale.bandwidth - 4}
                height={4}
                fill={SEMANTIC_6[0]}
                rx={2}
                ry={2}
                stroke={SEMANTIC_6[0]}
                strokeWidth={hoverStrokeWidth(0, isHovering(item.name))}
                opacity={1}
                {...bindHover(item)}
              />
              <Text
                x={x + xScale.bandwidth / 2}
                y={plotHeight - 10}
                text={String(item.value)}
                fontSize={11}
                fontFamily="sans-serif"
                fill={TEXT_COLOR}
                textAlign="middle"
                opacity={1}
              />
            </Animation>
          </Fragment>
        );
      })}
      <Axis scale={xScale} orient="bottom"  length={plotWidth} crossAt={plotHeight}  />
    </>
  );
}


export default PictorialBarChart;
