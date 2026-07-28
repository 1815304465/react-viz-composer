/**
 * Axis —— 坐标轴组件
 *
 * 用 Rect 画轴线，Line 画 tick，Text 画标签
 *
 * orient: 'bottom' | 'left' | 'right' | 'top'
 */

import { Fragment } from 'react';
import { Line, Text } from '../../shapes';
import type { LinearScale, BandScale } from './scales';
import { AXIS_COLOR, TEXT_COLOR } from './palette';
import { PLOT_WIDTH, PLOT_HEIGHT } from './ChartFrame';

type Scale = LinearScale | BandScale;

interface Props {
  scale: Scale;
  orient: 'bottom' | 'left' | 'right' | 'top';
  length?: number;
  tickCount?: number;
  tickFormat?: (v: any) => string;
  showLine?: boolean;
}

export function Axis({
  scale,
  orient,
  length,
  tickCount = 5,
  tickFormat = (v) => String(v),
  showLine = true,
}: Props) {
  if (orient === 'bottom' || orient === 'top') {
    const axLen = length ?? PLOT_WIDTH;
    const y = orient === 'bottom' ? PLOT_HEIGHT : 0;
    const ticks = bandTicks(scale) ?? linearTicks(scale, tickCount);

    return (
      <>
        {showLine && (
          <Line
            points={[
              { x: 0, y },
              { x: axLen, y },
            ]}
            stroke={AXIS_COLOR}
            strokeWidth={1}
          />
        )}
        {ticks.map((t, i) => {
          const x = isBandScale(scale) ? (scale as BandScale)(t as any) + (scale as BandScale).bandwidth / 2 : (scale as LinearScale)(t as number);
          return (
            <Fragment key={i}>
              <Line
                points={[
                  { x, y: y - 4 },
                  { x, y: y + 4 },
                ]}
                stroke={AXIS_COLOR}
                strokeWidth={1}
              />
              <Text
                x={x}
                y={y + 18}
                text={tickFormat(t)}
                fontSize={11}
                fontFamily="sans-serif"
                fill={TEXT_COLOR}
                textAlign="middle"
              />
            </Fragment>
          );
        })}
      </>
    );
  }

  // left / right
  const axLen = length ?? PLOT_HEIGHT;
  const x = orient === 'left' ? 0 : PLOT_WIDTH;
  const ticks = linearTicks(scale, tickCount);

  return (
    <>
      {showLine && (
        <Line
          points={[
            { x, y: 0 },
            { x, y: axLen },
          ]}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />
      )}
      {ticks.map((t, i) => {
        const y = (scale as LinearScale)(t as number);
        return (
          <Fragment key={i}>
            <Line
              points={[
                { x: x - 4, y },
                { x: x + 4, y },
              ]}
              stroke={AXIS_COLOR}
              strokeWidth={1}
            />
            <Text
              x={orient === 'left' ? -8 : 8}
              y={y + 4}
              text={tickFormat(t)}
              fontSize={11}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              textAlign={orient === 'left' ? 'end' : 'start'}
            />
          </Fragment>
        );
      })}
    </>
  );
}

/* 内部 helpers */

function isBandScale(s: Scale): s is BandScale {
  return (s as BandScale).bandwidth !== undefined;
}

function bandTicks(s: Scale): (string | number)[] | null {
  if (!isBandScale(s)) return null;
  return s.domain;
}

function linearTicks(s: Scale, count: number): number[] {
  if (isBandScale(s)) return [];
  return s.ticks(count);
}

/* ---- 网格 Grid（横向/纵向） ---- */

interface GridProps {
  scale: Scale;
  orient: 'x' | 'y';
  length?: number;
  tickCount?: number;
}

export function Grid({ scale, orient, length, tickCount = 5 }: GridProps) {
  if (orient === 'x') {
    const len = length ?? PLOT_HEIGHT;
    const ticks = isBandScale(scale) ? scale.domain : (scale as LinearScale).ticks(tickCount);
    return (
      <>
        {ticks.map((t, i) => {
          const x = isBandScale(scale)
            ? (scale as BandScale)(t as any) + (scale as BandScale).bandwidth / 2
            : (scale as LinearScale)(t as number);
          return (
            <Line
              key={i}
              points={[
                { x, y: 0 },
                { x, y: len },
              ]}
              stroke="#f0f0f0"
              strokeWidth={1}
            />
          );
        })}
      </>
    );
  }
  const len = length ?? PLOT_WIDTH;
  const ticks = (scale as LinearScale).ticks(tickCount);
  return (
    <>
      {ticks.map((t, i) => {
        const y = (scale as LinearScale)(t as number);
        return (
          <Line
            key={i}
            points={[
              { x: 0, y },
              { x: len, y },
            ]}
            stroke="#f0f0f0"
            strokeWidth={1}
          />
        );
      })}
    </>
  );
}
