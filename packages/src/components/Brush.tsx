/**
 * Brush —— 半成品框选矩形
 *
 * 矩形几何完全受控；拖拽起止需开发者监听画布/空白区事件后写入 x/y/width/height。
 */

import { Rect } from '../shapes';
import type { ShapeEventProps } from '../shapes/events';

export interface BrushProps extends ShapeEventProps {
  /** 为 false 或宽高无效时不画 */
  visible?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
  rx?: number;
  ry?: number;
}

/**
 * 框选叠加层
 * @param props 受控矩形与样式；可挂拖拽事件以便二次调整
 */
export function Brush(props: BrushProps) {
  const {
    visible = true,
    x,
    y,
    width,
    height,
    fill = '#1677ff',
    fillOpacity = 0.12,
    stroke = '#1677ff',
    strokeWidth = 1,
    strokeDasharray,
    opacity,
    rx,
    ry,
    ...events
  } = props;

  if (!visible) return null;
  if (!(width > 0 && height > 0)) return null;

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      opacity={opacity ?? fillOpacity}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      rx={rx}
      ry={ry}
      {...events}
    />
  );
}

export default Brush;
