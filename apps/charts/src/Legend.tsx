/**
 * Legend —— 示例兼容：转发 kit Legend，并用本地 plot 尺寸算默认锚点
 *
 * 推荐业务侧直接使用 kit 的 Legend，自行传入 x/y。
 */

import { Legend as KitLegend, type LegendItem as KitLegendItem } from '@react-viz-composer/kit';
import type { VizEvent } from '@react-viz-composer/core';
import { useChartSize } from './local';

interface LegacyItem {
  name: string;
  color: string;
}

interface Props {
  items: LegacyItem[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  swatchSize?: number;
  gap?: number;
  onItemClick?: (item: KitLegendItem, evt: VizEvent) => void;
  onItemEnter?: (item: KitLegendItem, evt: VizEvent) => void;
  onItemLeave?: (item: KitLegendItem, evt: VizEvent) => void;
}

/**
 * 示例图例（内部转 kit）
 */
export function Legend(props: Props) {
  const {
    items,
    position = 'top-right',
    swatchSize = 10,
    gap = 20,
    onItemClick,
    onItemEnter,
    onItemLeave,
  } = props;

  const { plotWidth, plotHeight } = useChartSize();

  const anchor = {
    'top-right': { x: plotWidth - 10 - swatchSize - 60, y: 8 },
    'top-left': { x: 10, y: 8 },
    'bottom-right': { x: plotWidth - 10 - swatchSize - 60, y: plotHeight - 8 },
    'bottom-left': { x: 10, y: plotHeight - 8 },
  }[position];

  const kitItems: KitLegendItem[] = items.map((d) => ({
    key: d.name,
    label: d.name,
    color: d.color,
  }));

  return (
    <KitLegend
      items={kitItems}
      x={anchor.x}
      y={anchor.y}
      gap={gap}
      swatchSize={swatchSize}
      onItemClick={onItemClick}
      onItemEnter={onItemEnter}
      onItemLeave={onItemLeave}
    />
  );
}

export default Legend;
