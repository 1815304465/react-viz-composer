/**
 * MarkPoint —— 半成品标注点
 *
 * 纯展示；高亮逻辑由开发者根据图表事件传入 cx/cy/visible。
 */

import { Ellipse, Text } from '@react-viz-composer/core';
import type { ShapeEventProps } from '@react-viz-composer/core';

export interface MarkPointProps extends ShapeEventProps {
  cx: number;
  cy: number;
  /** 为 false 时不渲染 */
  visible?: boolean;
  r?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** 外圈光晕倍率，0 关闭 */
  haloScale?: number;
  haloOpacity?: number;
  opacity?: number;
  label?: string;
  labelPosition?: 'top' | 'right' | 'bottom' | 'left';
  labelFill?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelFontWeight?: string | number;
  labelGap?: number;
  zIndex?: number;
}

/**
 * 标注点
 * @param props 像素坐标与样式
 */
export function MarkPoint(props: MarkPointProps) {
  const {
    cx,
    cy,
    visible = true,
    r = 6,
    fill = '#f5222d',
    stroke = '#fff',
    strokeWidth = 2,
    haloScale = 2,
    haloOpacity = 0.12,
    opacity,
    label,
    labelPosition = 'top',
    labelFill,
    labelFontSize = 12,
    labelFontFamily = 'sans-serif',
    labelFontWeight,
    labelGap = 6,
    zIndex = 10,
    ...events
  } = props;

  if (!visible) return null;

  const textFill = labelFill ?? fill;
  let lx = cx;
  let ly = cy;
  let textAlign: 'start' | 'middle' | 'end' = 'middle';
  if (labelPosition === 'top') ly = cy - r - labelGap;
  else if (labelPosition === 'bottom') ly = cy + r + labelGap + 4;
  else if (labelPosition === 'right') {
    lx = cx + r + labelGap;
    ly = cy + 4;
    textAlign = 'start';
  } else {
    lx = cx - r - labelGap;
    ly = cy + 4;
    textAlign = 'end';
  }

  return (
    <>
      {haloScale > 0 && (
        <Ellipse
          cx={cx}
          cy={cy}
          rx={r * haloScale}
          ry={r * haloScale}
          fill={fill}
          opacity={haloOpacity}
          stroke="none"
          strokeWidth={0}
          zIndex={zIndex}
        />
      )}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={r}
        ry={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={opacity}
        zIndex={zIndex}
        {...events}
      />
      {label && (
        <Text
          x={lx}
          y={ly}
          text={label}
          fontSize={labelFontSize}
          fontFamily={labelFontFamily}
          fontWeight={labelFontWeight}
          fill={textFill}
          textAlign={textAlign}
          zIndex={zIndex}
        />
      )}
    </>
  );
}

export default MarkPoint;
