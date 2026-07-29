/**
 * Grid —— 半成品网格线
 *
 * 线色 / 线宽 / 长度全部由 props 控制。
 */

import { Line } from '@react-viz-composer/core';
import type { AxisScale, BandScaleLike, LinearScaleLike } from './Axis';

export interface GridProps {
  scale: AxisScale;
  /** x：竖线；y：横线 */
  orient: 'x' | 'y';
  /** 网格线长度（像素） */
  length: number;
  tickCount?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

/** 是否为 band scale */
function isBandScale(s: AxisScale): s is BandScaleLike {
  return (s as BandScaleLike).bandwidth !== undefined;
}

/**
 * 背景网格半成品组件
 * @param props 网格配置
 */
export function Grid(props: GridProps) {
  const {
    scale,
    orient,
    length,
    tickCount = 5,
    stroke = '#f0f0f0',
    strokeWidth = 1,
    opacity,
  } = props;

  if (orient === 'x') {
    const ticks = isBandScale(scale)
      ? scale.domain
      : (scale as LinearScaleLike).ticks(tickCount);
    return (
      <>
        {ticks.map((t, i) => {
          const x = isBandScale(scale)
            ? scale(t as string | number) + scale.bandwidth / 2
            : (scale as LinearScaleLike)(t as number);
          return (
            <Line
              key={i}
              points={[
                { x, y: 0 },
                { x, y: length },
              ]}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
          );
        })}
      </>
    );
  }

  const ticks = (scale as LinearScaleLike).ticks(tickCount);
  return (
    <>
      {ticks.map((t, i) => {
        const y = (scale as LinearScaleLike)(t as number);
        return (
          <Line
            key={i}
            points={[
              { x: 0, y },
              { x: length, y },
            ]}
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        );
      })}
    </>
  );
}

export default Grid;
