/**
 * PopulationPyramidChart —— 人口金字塔（双向水平条形）
 */

import { useMemo } from 'react';
import { Animation, Rect, Text } from '@react-viz-composer/core';
import {
  Axis,
  Grid,
} from '@react-viz-composer/kit';
import {
  ChartFrame,
  useChartItemHover,
  hoverStrokeWidth,
  scaleBand,
  scaleLinear,
  SEMANTIC_6,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface PyramidItem {
  age: string;
  male: number;
  female: number;
}

interface PyramidHoverPayload {
  age: string;
  gender: 'male' | 'female';
  value: number;
}

interface Props extends ChartItemHoverProps<PyramidHoverPayload> {
  data?: PyramidItem[];
}

const BAR_PLAYBOOK = [
  { attribute: 'width', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 30 },
] as const;

const LABEL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 500, easing: 'easeOut', targets: 'children', stagger: 30, delay: 300 },
] as const;

export function PopulationPyramidChart(props: Props) {
  return (
    <ChartFrame>
      <PopulationPyramidChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function PopulationPyramidChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover<PyramidHoverPayload, string>(
    { onItemEnter, onItemLeave },
    (p) => `${p.gender}-${p.age}`,
  );

  const dataset = data ?? [
    { age: '0-9', male: 8.2, female: 7.8 },
    { age: '10-19', male: 7.5, female: 7.1 },
    { age: '20-29', male: 9.0, female: 8.5 },
    { age: '30-39', male: 8.8, female: 8.6 },
    { age: '40-49', male: 7.2, female: 7.0 },
    { age: '50-59', male: 6.5, female: 6.8 },
    { age: '60-69', male: 4.8, female: 5.2 },
    { age: '70+', male: 3.0, female: 4.0 },
  ];

  const centerX = plotWidth / 2;
  const halfWidth = centerX - 30;

  const ages = useMemo(() => dataset.map((d) => d.age), [dataset]);
  const yScale = useMemo(
    () => scaleBand(ages, [0, plotHeight], 0.2),
    [ages, plotHeight],
  );
  const xScale = useMemo(() => {
    const maxVal = Math.max(...dataset.flatMap((d) => [d.male, d.female])) * 1.15;
    return scaleLinear([0, maxVal], [0, halfWidth]);
  }, [dataset, halfWidth]);

  return (
    <>
      <Grid scale={xScale} orient="x" length={plotHeight} />
      <Animation playbook={[...BAR_PLAYBOOK]}>
        {dataset.flatMap((d) => {
          const y = yScale(d.age);
          const maleW = xScale(d.male);
          const femaleW = xScale(d.female);
          const malePayload: PyramidHoverPayload = { age: d.age, gender: 'male', value: d.male };
          const femalePayload: PyramidHoverPayload = { age: d.age, gender: 'female', value: d.female };
          return [
            <Rect
              key={`male-${d.age}`}
              x={centerX - maleW}
              y={y}
              width={maleW}
              height={yScale.bandwidth}
              fill={SEMANTIC_6[0]}
              stroke={SEMANTIC_6[0]}
              strokeWidth={hoverStrokeWidth(1, isHovering(`male-${d.age}`))}
              {...bindHover(malePayload)}
            />,
            <Rect
              key={`female-${d.age}`}
              x={centerX}
              y={y}
              width={femaleW}
              height={yScale.bandwidth}
              fill={SEMANTIC_6[3]}
              stroke={SEMANTIC_6[3]}
              strokeWidth={hoverStrokeWidth(1, isHovering(`female-${d.age}`))}
              {...bindHover(femalePayload)}
            />,
          ];
        })}
      </Animation>
      <Animation playbook={[...LABEL_PLAYBOOK]}>
        <Text
          x={centerX - halfWidth / 2}
          y={14}
          text="男性"
          fontSize={12}
          fontWeight="bold"
          fontFamily="sans-serif"
          fill={SEMANTIC_6[0]}
          textAlign="middle"
          opacity={1}
        />
        <Text
          x={centerX + halfWidth / 2}
          y={14}
          text="女性"
          fontSize={12}
          fontWeight="bold"
          fontFamily="sans-serif"
          fill={SEMANTIC_6[3]}
          textAlign="middle"
          opacity={1}
        />
        {dataset.map((d) => (
          <Text
            key={`age-${d.age}`}
            x={centerX}
            y={yScale(d.age) + yScale.bandwidth / 2 + 4}
            text={d.age}
            fontSize={10}
            fontFamily="sans-serif"
            fill={TEXT_COLOR}
            textAlign="middle"
            opacity={1}
          />
        ))}
      </Animation>
      <Axis
        scale={xScale}
        orient="bottom"
        length={halfWidth}
        crossAt={plotHeight}
      />
      <Axis scale={yScale} orient="left" length={plotHeight} crossAt={centerX} showLabels={false} />
    </>
  );
}


export default PopulationPyramidChart;
