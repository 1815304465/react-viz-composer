import { useCallback, useState } from 'react';
// 从 shapes 层间接引用引擎类型（charts 不越过 shapes 触及 engine 内部）
import type { VizEvent } from '../../index';

/** 由 App 层传入的 hover 回调（图表本身不包含 Tooltip UI） */
export interface ChartItemHoverProps<T = unknown> {
  onItemEnter?: (payload: T, evt: VizEvent) => void;
  onItemLeave?: () => void;
}

/**
 * 图表项 hover：App 层 Tooltip + 图表内高亮（不触发动画重播）
 * @param props hover 回调
 * @param getKey 从数据项提取唯一键
 */
export function useChartItemHover<T, K extends string | number>(
  props: ChartItemHoverProps<T>,
  getKey: (item: T) => K,
) {
  const { onItemEnter, onItemLeave } = props;
  const [hoverKey, setHoverKey] = useState<K | null>(null);

  const bindHover = useCallback((item: T) => ({
    onMouseEnter: (evt: VizEvent) => {
      setHoverKey(getKey(item));
      onItemEnter?.(item, evt);
    },
    onMouseLeave: () => {
      setHoverKey(null);
      onItemLeave?.();
    },
  }), [getKey, onItemEnter, onItemLeave]);

  const isHovering = useCallback(
    (key: K) => hoverKey === key,
    [hoverKey],
  );

  return { bindHover, isHovering, hoverKey };
}

/**
 * hover 时描边加粗
 * @param base 默认描边宽度
 * @param active 是否 hover
 */
export function hoverStrokeWidth(base: number, active: boolean): number {
  return active ? base + 1.5 : base;
}

/**
 * hover 时略微提高不透明度
 * @param base 默认 opacity
 * @param active 是否 hover
 */
export function hoverOpacity(base: number, active: boolean): number {
  return active ? Math.min(1, base + 0.12) : base;
}

/**
 * @deprecated 请使用 useChartItemHover
 */
export function itemHoverProps<T>(
  payload: T,
  props: ChartItemHoverProps<T>,
): {
  onMouseEnter?: (evt: VizEvent) => void;
  onMouseLeave?: () => void;
} {
  const { onItemEnter, onItemLeave } = props;
  if (!onItemEnter && !onItemLeave) return {};
  return {
    onMouseEnter: onItemEnter ? (evt) => onItemEnter(payload, evt) : undefined,
    onMouseLeave: onItemLeave,
  };
}
