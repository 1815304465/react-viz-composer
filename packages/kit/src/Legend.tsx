/**
 * Legend —— 半成品图例
 *
 * 只负责绘制色块与文字；系列显隐 / 高亮需开发者通过 onItem* 事件自行对接图表。
 */

import { Fragment } from 'react';
import { Rect, Text } from '@react-viz-composer/core';
import type { ShapeEventProps, VizEvent } from '@react-viz-composer/core';

export interface LegendItem {
  /** 唯一键，事件回调带回 */
  key: string;
  /** 显示文本 */
  label: string;
  /** 色块颜色 */
  color: string;
  /** 是否处于禁用/隐藏态（仅影响本组件绘制，不自动改图表） */
  disabled?: boolean;
  /** 是否高亮 */
  active?: boolean;
}

export interface LegendProps {
  items: LegendItem[];
  /** 图例起点 x（像素） */
  x?: number;
  /** 图例起点 y（像素） */
  y?: number;
  /** 排布方向 */
  orient?: 'vertical' | 'horizontal';
  /** 项间距 */
  gap?: number;
  swatchSize?: number;
  swatchRx?: number;
  /** 禁用项色块透明度 */
  disabledOpacity?: number;
  labelFill?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelGap?: number;
  /** 文本相对色块的基线微调 */
  labelBaselineOffset?: number;
  onItemClick?: (item: LegendItem, evt: VizEvent) => void;
  onItemEnter?: (item: LegendItem, evt: VizEvent) => void;
  onItemLeave?: (item: LegendItem, evt: VizEvent) => void;
}

/**
 * 图例半成品
 * @param props 数据与样式；交互需自行接线
 */
export function Legend(props: LegendProps) {
  const {
    items,
    x = 0,
    y = 0,
    orient = 'vertical',
    gap = 20,
    swatchSize = 10,
    swatchRx = 2,
    disabledOpacity = 0.35,
    labelFill = '#595959',
    labelFontSize = 11,
    labelFontFamily = 'sans-serif',
    labelGap = 4,
    labelBaselineOffset = 4,
    onItemClick,
    onItemEnter,
    onItemLeave,
  } = props;

  return (
    <>
      {items.map((item, i) => {
        const ox = orient === 'horizontal' ? x + i * gap : x;
        const oy = orient === 'vertical' ? y + i * gap : y;
        const opacity = item.disabled ? disabledOpacity : item.active === false ? 0.55 : 1;

        const events: ShapeEventProps = {
          onClick: onItemClick ? (evt) => onItemClick(item, evt) : undefined,
          onMouseEnter: onItemEnter ? (evt) => onItemEnter(item, evt) : undefined,
          onMouseLeave: onItemLeave ? (evt) => onItemLeave(item, evt) : undefined,
        };

        return (
          <Fragment key={item.key}>
            <Rect
              x={ox}
              y={oy - swatchSize / 2}
              width={swatchSize}
              height={swatchSize}
              fill={item.color}
              rx={swatchRx}
              opacity={opacity}
              {...events}
            />
            <Text
              x={ox + swatchSize + labelGap}
              y={oy + labelBaselineOffset}
              text={item.label}
              fontSize={labelFontSize}
              fontFamily={labelFontFamily}
              fill={labelFill}
              opacity={opacity}
              textAlign="start"
              {...events}
            />
          </Fragment>
        );
      })}
    </>
  );
}

export default Legend;
