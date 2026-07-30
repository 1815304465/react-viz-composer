/**
 * MarkLine —— 半成品阈值线
 *
 * 只画线与可选标签；像素位置或 value+scale 由开发者计算后传入。
 */

import { Line, Text } from '../shapes';
import type { ShapeEventProps } from '../shapes/events';
import type { LinearScaleLike } from './Axis';

export interface MarkLineProps extends ShapeEventProps {
  type: 'horizontal' | 'vertical';
  /** 数据值（配合 scale） */
  value?: number;
  scale?: LinearScaleLike;
  /** 像素位置（优先于 value+scale） */
  pixelValue?: number;
  /** 线长度（像素） */
  length: number;
  /** 线起点在另一轴上的偏移，默认 0 */
  offset?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
  label?: string;
  labelFill?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
}

/**
 * 解析标注线像素位置
 */
function resolvePos(props: MarkLineProps): number {
  const { pixelValue, scale, value } = props;
  if (pixelValue != null) return pixelValue;
  if (scale && value != null) return scale(value);
  return 0;
}

/**
 * 阈值标注线
 * @param props 位置 / 样式 / 可选事件
 */
export function MarkLine(props: MarkLineProps) {
  const {
    type,
    length,
    offset = 0,
    stroke = '#f5222d',
    strokeWidth = 1.5,
    strokeDasharray = '5 3',
    opacity,
    label,
    labelFill,
    labelFontSize = 11,
    labelFontFamily = 'sans-serif',
    labelOffsetX = 4,
    labelOffsetY = -4,
    onClick,
    onMouseEnter,
    onMouseLeave,
    ...restEvents
  } = props;

  const pos = resolvePos(props);
  const fill = labelFill ?? stroke;
  const events: ShapeEventProps = {
    onClick,
    onMouseEnter,
    onMouseLeave,
    ...restEvents,
  };

  if (type === 'horizontal') {
    return (
      <>
        <Line
          points={[
            { x: offset, y: pos },
            { x: offset + length, y: pos },
          ]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          opacity={opacity}
          {...events}
        />
        {label && (
          <Text
            x={offset + length + labelOffsetX}
            y={pos + 3 + labelOffsetY}
            text={label}
            fontSize={labelFontSize}
            fontFamily={labelFontFamily}
            fill={fill}
            textAlign="start"
          />
        )}
      </>
    );
  }

  return (
    <>
      <Line
        points={[
          { x: pos, y: offset },
          { x: pos, y: offset + length },
        ]}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        opacity={opacity}
        {...events}
      />
      {label && (
        <Text
          x={pos + labelOffsetX}
          y={offset + labelOffsetY + 3}
          text={label}
          fontSize={labelFontSize}
          fontFamily={labelFontFamily}
          fill={fill}
          textAlign="start"
        />
      )}
    </>
  );
}

export default MarkLine;
