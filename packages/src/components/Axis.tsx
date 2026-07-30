/**
 * Axis —— 半成品坐标轴
 *
 * 轴线 / tick / 标签样式均通过 props 控制，无隐藏全局常量依赖。
 */

import { Fragment } from 'react';
import { Line, Text } from '../shapes';

/** band scale 最小约定 */
export interface BandScaleLike {
  (v: string | number): number;
  bandwidth: number;
  domain: (string | number)[];
}

/** linear scale 最小约定 */
export interface LinearScaleLike {
  (v: number): number;
  ticks: (count?: number) => number[];
}

export type AxisScale = BandScaleLike | LinearScaleLike;

export interface AxisProps {
  scale: AxisScale;
  orient: 'bottom' | 'left' | 'right' | 'top';
  /** 轴线长度（像素） */
  length: number;
  /**
   * 轴线在垂直/水平方向上的交叉位置：
   * - bottom/top：y
   * - left/right：x
   * 默认 bottom → length 所在轴的远端需由调用方传入；未传时 bottom/right 为 0（调用方应显式传入）
   */
  crossAt?: number;
  tickCount?: number;
  tickFormat?: (v: string | number) => string;
  showLine?: boolean;
  showTicks?: boolean;
  showLabels?: boolean;
  /** 轴线颜色 */
  stroke?: string;
  strokeWidth?: number;
  /** tick 颜色，默认跟 stroke */
  tickStroke?: string;
  tickStrokeWidth?: number;
  /** tick 半长（轴线两侧各延伸该值） */
  tickSize?: number;
  /** 标签填充色 */
  labelFill?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelFontWeight?: string | number;
  /** 标签相对轴线的偏移（bottom/top 为 y 方向；left/right 为 x 方向） */
  labelOffset?: number;
}

/** 是否为 band scale */
function isBandScale(s: AxisScale): s is BandScaleLike {
  return (s as BandScaleLike).bandwidth !== undefined;
}

/** band ticks */
function bandTicks(s: AxisScale): (string | number)[] | null {
  if (!isBandScale(s)) return null;
  return s.domain;
}

/** linear ticks */
function linearTicks(s: AxisScale, count: number): number[] {
  if (isBandScale(s)) return [];
  return (s as LinearScaleLike).ticks(count);
}

/**
 * 坐标轴半成品组件
 * @param props 轴配置（尺寸与样式均由 props 控制）
 */
export function Axis(props: AxisProps) {
  const {
    scale,
    orient,
    length,
    crossAt = 0,
    tickCount = 5,
    tickFormat = (v) => String(v),
    showLine = true,
    showTicks = true,
    showLabels = true,
    stroke = '#d9d9d9',
    strokeWidth = 1,
    tickStroke,
    tickStrokeWidth,
    tickSize = 4,
    labelFill = '#595959',
    labelFontSize = 11,
    labelFontFamily = 'sans-serif',
    labelFontWeight,
    labelOffset,
  } = props;

  const tickColor = tickStroke ?? stroke;
  const tickW = tickStrokeWidth ?? strokeWidth;

  if (orient === 'bottom' || orient === 'top') {
    const y = crossAt;
    const labelDy = labelOffset ?? (orient === 'bottom' ? 18 : -10);
    const ticks = bandTicks(scale) ?? linearTicks(scale, tickCount);

    return (
      <>
        {showLine && (
          <Line
            points={[
              { x: 0, y },
              { x: length, y },
            ]}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )}
        {ticks.map((t, i) => {
          const x = isBandScale(scale)
            ? scale(t) + scale.bandwidth / 2
            : (scale as LinearScaleLike)(t as number);
          return (
            <Fragment key={i}>
              {showTicks && (
                <Line
                  points={[
                    { x, y: y - tickSize },
                    { x, y: y + tickSize },
                  ]}
                  stroke={tickColor}
                  strokeWidth={tickW}
                />
              )}
              {showLabels && (
                <Text
                  x={x}
                  y={y + labelDy}
                  text={tickFormat(t)}
                  fontSize={labelFontSize}
                  fontFamily={labelFontFamily}
                  fontWeight={labelFontWeight}
                  fill={labelFill}
                  textAlign="middle"
                />
              )}
            </Fragment>
          );
        })}
      </>
    );
  }

  // left / right
  const x = crossAt;
  const labelDx = labelOffset ?? (orient === 'left' ? -8 : 8);
  const ticks = linearTicks(scale, tickCount);

  return (
    <>
      {showLine && (
        <Line
          points={[
            { x, y: 0 },
            { x, y: length },
          ]}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}
      {ticks.map((t, i) => {
        const y = (scale as LinearScaleLike)(t as number);
        return (
          <Fragment key={i}>
            {showTicks && (
              <Line
                points={[
                  { x: x - tickSize, y },
                  { x: x + tickSize, y },
                ]}
                stroke={tickColor}
                strokeWidth={tickW}
              />
            )}
            {showLabels && (
              <Text
                x={x + labelDx}
                y={y + 4}
                text={tickFormat(t)}
                fontSize={labelFontSize}
                fontFamily={labelFontFamily}
                fontWeight={labelFontWeight}
                fill={labelFill}
                textAlign={orient === 'left' ? 'end' : 'start'}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

export default Axis;
