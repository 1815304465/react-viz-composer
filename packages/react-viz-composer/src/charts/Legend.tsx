/**
 * Legend —— 图例组件
 *
 * 在图表固定位置渲染色块 + 文本标签。
 */

import { Fragment } from 'react';
import { Rect, Text } from '../shapes';
import { PLOT_WIDTH, PLOT_HEIGHT } from './shared/ChartFrame';
import { TEXT_COLOR } from './shared/palette';

interface LegendItem {
  name: string;
  color: string;
}

interface Props {
  items: LegendItem[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  swatchSize?: number;
  gap?: number;
}

const POSITION_MAP: Record<string, { anchor: 'start' | 'end'; xBase: () => number; yBase: () => number; direction: number }> = {
  'top-right': { anchor: 'end', xBase: () => PLOT_WIDTH - 10, yBase: () => 8, direction: 1 },
  'top-left': { anchor: 'start', xBase: () => 10, yBase: () => 8, direction: 1 },
  'bottom-right': { anchor: 'end', xBase: () => PLOT_WIDTH - 10, yBase: () => PLOT_HEIGHT - 8, direction: -1 },
  'bottom-left': { anchor: 'start', xBase: () => 10, yBase: () => PLOT_HEIGHT - 8, direction: -1 },
};

export function Legend({
  items,
  position = 'top-right',
  swatchSize = 10,
  gap = 20,
}: Props) {
  const cfg = POSITION_MAP[position] ?? POSITION_MAP['top-right'];
  const xBase = cfg.xBase();
  const yBase = cfg.yBase();
  const dir = cfg.direction;

  return (
    <>
      {items.map((item, i) => {
        const offset = i * gap * dir;
        const rowY = yBase + offset;
        const textX = position.includes('left')
          ? xBase + swatchSize + 6
          : xBase - swatchSize - 6;
        const textAlign = position.includes('left') ? 'start' : 'end';
        const swatchX = position.includes('left')
          ? xBase
          : xBase - swatchSize;

        return (
          <Fragment key={item.name}>
            <Rect
              x={swatchX}
              y={rowY}
              width={swatchSize}
              height={swatchSize}
              fill={item.color}
              rx={2}
              ry={2}
            />
            <Text
              x={textX}
              y={rowY + swatchSize - 1}
              text={item.name}
              fontSize={11}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              textAlign={textAlign}
            />
          </Fragment>
        );
      })}
    </>
  );
}

export default Legend;
