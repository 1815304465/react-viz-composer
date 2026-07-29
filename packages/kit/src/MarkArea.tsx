/**
 * MarkArea —— 半成品区间阴影
 *
 * 像素矩形优先；也可传数据范围 + scale，由本组件做映射。
 */

import { Rect, Text } from '@react-viz-composer/core';
import type { ShapeEventProps } from '@react-viz-composer/core';
import type { LinearScaleLike } from './Axis';

export interface MarkAreaProps extends ShapeEventProps {
  /** 为 false 时不渲染 */
  visible?: boolean;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  xScale?: LinearScaleLike;
  yScale?: LinearScaleLike;
  pixelXMin?: number;
  pixelXMax?: number;
  pixelYMin?: number;
  pixelYMax?: number;
  fill?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  label?: string;
  labelFill?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelOffsetY?: number;
}

/**
 * 区间阴影
 * @param props 范围与样式
 */
export function MarkArea(props: MarkAreaProps) {
  const {
    visible = true,
    xMin,
    xMax,
    yMin,
    yMax,
    xScale,
    yScale,
    pixelXMin,
    pixelXMax,
    pixelYMin,
    pixelYMax,
    fill = '#1677ff',
    opacity = 0.08,
    stroke,
    strokeWidth,
    label,
    labelFill,
    labelFontSize = 10,
    labelFontFamily = 'sans-serif',
    labelOffsetY = -4,
    ...events
  } = props;

  if (!visible) return null;

  const px0 = pixelXMin ?? (xScale && xMin != null ? xScale(xMin) : 0);
  const px1 = pixelXMax ?? (xScale && xMax != null ? xScale(xMax) : px0);
  const py0 = pixelYMin ?? (yScale && yMin != null ? yScale(yMin) : 0);
  const py1 = pixelYMax ?? (yScale && yMax != null ? yScale(yMax) : py0);

  const x = Math.min(px0, px1);
  const y = Math.min(py0, py1);
  const width = Math.abs(px1 - px0);
  const height = Math.abs(py1 - py0);

  if (width <= 0 && height <= 0) return null;

  return (
    <>
      <Rect
        x={x}
        y={y}
        width={Math.max(width, 1)}
        height={Math.max(height, 1)}
        fill={fill}
        opacity={opacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        {...events}
      />
      {label && (
        <Text
          x={x + width / 2}
          y={y + labelOffsetY}
          text={label}
          fontSize={labelFontSize}
          fontFamily={labelFontFamily}
          fill={labelFill ?? fill}
          textAlign="middle"
        />
      )}
    </>
  );
}

export default MarkArea;
