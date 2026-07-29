/**
 * PolarBarChart —— 极坐标柱状图
 */

import { Animation, Path, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  hoverOpacity,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface PolarBarItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<PolarBarItem> {
  data?: PolarBarItem[];
}

const BAR_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 60 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 60, delay: 300 },
] as const;

/**
 * 构建极坐标柱路径
 */
function polarBarPath(
  item: PolarBarItem,
  index: number,
  cx: number,
  cy: number,
  innerR: number,
  maxBarR: number,
  maxVal: number,
  angleStep: number,
  barAngleWidth: number,
): string {
  const startAngle = -Math.PI / 2 + index * angleStep;
  const midAngle = startAngle + angleStep / 2;
  const barR = innerR + (item.value / maxVal) * (maxBarR - innerR);
  const halfW = barAngleWidth / 2;
  const a0 = midAngle - halfW;
  const a1 = midAngle + halfW;
  const innerX0 = cx + innerR * Math.cos(a0);
  const innerY0 = cy + innerR * Math.sin(a0);
  const innerX1 = cx + innerR * Math.cos(a1);
  const innerY1 = cy + innerR * Math.sin(a1);
  const outerX0 = cx + barR * Math.cos(a0);
  const outerY0 = cy + barR * Math.sin(a0);
  const outerX1 = cx + barR * Math.cos(a1);
  const outerY1 = cy + barR * Math.sin(a1);
  return `M ${innerX0} ${innerY0} L ${outerX0} ${outerY0} A ${barR} ${barR} 0 0 1 ${outerX1} ${outerY1} L ${innerX1} ${innerY1} A ${innerR} ${innerR} 0 0 0 ${innerX0} ${innerY0} Z`;
}

/**
 * 极坐标柱状图
 */
export function PolarBarChart(props: Props) {
  return (
    <ChartFrame>
      <PolarBarChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function PolarBarChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: PolarBarItem) => d.name,
  );

  const items: PolarBarItem[] = data ?? defaultPolarBarData();
  const maxVal = Math.max(...items.map((d) => d.value));

  const cx = plotWidth / 2;
  const cy = plotHeight / 2;
  const innerR = 20;
  const maxBarR = Math.min(plotWidth, plotHeight) / 2 - 40;
  const angleStep = (Math.PI * 2) / items.length;
  const barAngleWidth = angleStep * 0.7;

  return (
    <>
      <Animation playbook={[...BAR_PLAYBOOK]}>
        {items.map((item, i) => (
          <Path
            key={item.name}
            d={polarBarPath(item, i, cx, cy, innerR, maxBarR, maxVal, angleStep, barAngleWidth)}
            fill={CATEGORY_12[i % CATEGORY_12.length]}
            stroke={CATEGORY_12[i % CATEGORY_12.length]}
            strokeWidth={hoverStrokeWidth(0.5, isHovering(item.name))}
            opacity={hoverOpacity(0.85, isHovering(item.name))}
            {...bindHover(item)}
          />
        ))}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        {items.map((item, i) => {
          const midAngle = -Math.PI / 2 + i * angleStep + angleStep / 2;
          const labelR = maxBarR + 16;
          return (
            <Text
              key={`label-${item.name}`}
              x={cx + labelR * Math.cos(midAngle)}
              y={cy + labelR * Math.sin(midAngle) + 4}
              text={item.name}
              fontSize={10}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              textAlign="middle"
              opacity={1}
            />
          );
        })}
      </Animation>
    </>
  );
}


function defaultPolarBarData(): PolarBarItem[] {
  return [
    { name: '周一', value: 85 },
    { name: '周二', value: 60 },
    { name: '周三', value: 75 },
    { name: '周四', value: 45 },
    { name: '周五', value: 90 },
    { name: '周六', value: 55 },
    { name: '周日', value: 40 },
    { name: '平均', value: 64 },
  ];
}

export default PolarBarChart;
