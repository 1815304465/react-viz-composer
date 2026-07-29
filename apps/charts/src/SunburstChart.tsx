/**
 * SunburstChart —— 旭日图
 */

import { useMemo } from 'react';
import { Animation, Path, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface SunburstData {
  name: string;
  value: number;
  children?: SunburstData[];
}

interface SunburstArc {
  name: string;
  value: number;
  depth: number;
  startAngle: number;
  endAngle: number;
}

interface SunburstHoverPayload extends SunburstArc {
  percent: string;
}

interface Props extends ChartItemHoverProps<SunburstHoverPayload> {
  data?: SunburstData;
}

const SLICE_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 700, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
] as const;

const CENTER_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', delay: 300 },
] as const;

/**
 * 旭日图
 */
export function SunburstChart(props: Props) {
  return (
    <ChartFrame>
      <SunburstChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function SunburstChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p): string => `${p.name}-${p.depth}`,
  );

  const root: SunburstData = data ?? {
    name: '总销售',
    value: 1000,
    children: [
      {
        name: '华北', value: 350,
        children: [
          { name: '北京', value: 150 },
          { name: '天津', value: 80 },
          { name: '河北', value: 120 },
        ],
      },
      {
        name: '华东', value: 400,
        children: [
          { name: '上海', value: 180 },
          { name: '浙江', value: 130 },
          { name: '江苏', value: 90 },
        ],
      },
      {
        name: '华南', value: 250,
        children: [
          { name: '广东', value: 160 },
          { name: '福建', value: 90 },
        ],
      },
    ],
  };

  const arcs = useMemo(() => flattenToArcs(root), [root]);
  const maxDepth = Math.max(...arcs.map((a) => a.depth), 0);
  const cx = plotWidth / 2;
  const cy = plotHeight / 2;
  const outerR = Math.min(cx, cy) - 20;
  const ringWidth = maxDepth > 0 ? outerR / (maxDepth + 1) : outerR;
  const totalValue = root.value;

  function arcPath(innerR: number, outerRVal: number, startAngle: number, endAngle: number) {
    const x0 = cx + innerR * Math.cos(startAngle);
    const y0 = cy + innerR * Math.sin(startAngle);
    const x1 = cx + outerRVal * Math.cos(startAngle);
    const y1 = cy + outerRVal * Math.sin(startAngle);
    const x2 = cx + outerRVal * Math.cos(endAngle);
    const y2 = cy + outerRVal * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${outerRVal} ${outerRVal} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x0} ${y0} Z`;
  }

  return (
    <>
      <Animation playbook={[...SLICE_PLAYBOOK]}>
        {arcs.map((a) => {
          const color = CATEGORY_12[a.depth % CATEGORY_12.length];
          const pct = ((a.value / totalValue) * 100).toFixed(0);
          const key = `${a.name}-${a.depth}`;
          const payload: SunburstHoverPayload = { ...a, percent: pct };
          const innerR = a.depth * ringWidth;
          const outerRSlice = (a.depth + 1) * ringWidth;
          return (
            <Path
              key={key}
              d={arcPath(innerR, outerRSlice, a.startAngle, a.endAngle)}
              fill={color}
              stroke="#fff"
              strokeWidth={hoverStrokeWidth(1.2, isHovering(key))}
              opacity={1}
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
      <Animation playbook={[...CENTER_PLAYBOOK]}>
        <Text
          x={cx}
          y={cy - 8}
          text={root.name}
          fontSize={15}
          fontWeight="bold"
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
          opacity={1}
        />
        <Text
          x={cx}
          y={cy + 14}
          text={`${totalValue}`}
          fontSize={13}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
          opacity={1}
        />
      </Animation>
    </>
  );
}


function flattenToArcs(
  node: SunburstData,
  depth = 0,
  startAngle = -Math.PI / 2,
  endAngle = (Math.PI * 3) / 2,
): SunburstArc[] {
  const total = node.value;
  const result: SunburstArc[] = [];
  if (node.children && node.children.length > 0) {
    let cursor = startAngle;
    node.children.forEach((child) => {
      const childAngle = (child.value / total) * (endAngle - startAngle);
      const childEnd = cursor + childAngle;
      result.push({
        name: child.name,
        value: child.value,
        depth,
        startAngle: cursor,
        endAngle: childEnd,
      });
      result.push(...flattenToArcs(child, depth + 1, cursor, childEnd));
      cursor = childEnd;
    });
  }
  return result;
}

export default SunburstChart;
