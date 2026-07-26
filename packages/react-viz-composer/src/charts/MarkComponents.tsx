/**
 * MarkComponents —— 标注组件
 *
 * 提供 MarkLine、MarkPoint、MarkArea 三个可组合的标注子组件，
 * 用于在图表中叠加阈值线、高亮点和区间阴影。
 *
 * 这些组件本身不包含坐标轴映射，而是接收像素坐标或数据+scale。
 * 可以在 ChartFrame 的 children render prop 内与主图表叠加使用。
 */

import { Line, Ellipse, Rect, Path, Text } from '../shapes';
import { TEXT_COLOR } from './shared/palette';
import type { LinearScale } from './shared/scales';

/* ==================== MarkLine ==================== */

interface MarkLineProps {
  /** 'horizontal' | 'vertical' */
  type: 'horizontal' | 'vertical';
  /** 数据值（会经过 scale 映射）或直接像素位置（传 pixelValue） */
  value?: number;
  scale?: LinearScale;
  /** 直接指定像素位置（优先于 value+scale） */
  pixelValue?: number;
  /** 线长度（像素） */
  length?: number;
  /** 线颜色，默认 #f5222d */
  color?: string;
  /** 线宽 */
  strokeWidth?: number;
  /** 虚线间隔，如 [4, 4] */
  dashArray?: number[];
  /** 标签文本 */
  label?: string;
  /** 标签位置偏移 */
  labelOffsetX?: number;
  labelOffsetY?: number;
}

export function MarkLine({
  type,
  value,
  scale,
  pixelValue,
  length = 530,
  color = '#f5222d',
  strokeWidth = 1.5,
  dashArray = [5, 3],
  label,
  labelOffsetX = 4,
  labelOffsetY = -4,
}: MarkLineProps) {
  const pos = pixelValue ?? (scale && value != null ? scale(value) : 0);

  if (type === 'horizontal') {
    return (
      <>
        <Line
          points={[
            { x: 0, y: pos },
            { x: length, y: pos },
          ]}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray.join(' ')}
        />
        {label && (
          <Text
            x={length + labelOffsetX}
            y={pos + 3 + labelOffsetY}
            text={label}
            fontSize={11}
            fontFamily="sans-serif"
            fill={color}
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
          { x: pos, y: 0 },
          { x: pos, y: length },
        ]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray.join(' ')}
      />
      {label && (
        <Text
          x={pos + labelOffsetX}
          y={labelOffsetY + 3}
          text={label}
          fontSize={11}
          fontFamily="sans-serif"
          fill={color}
          textAlign="start"
        />
      )}
    </>
  );
}

/* ==================== MarkPoint ==================== */

interface MarkPointProps {
  /** 像素坐标 */
  cx: number;
  cy: number;
  /** 标注颜色 */
  color?: string;
  /** 点半径 */
  r?: number;
  /** 标签 */
  label?: string;
  /** 文本放置方向 */
  labelPosition?: 'top' | 'right';
}

export function MarkPoint({
  cx,
  cy,
  color = '#f5222d',
  r = 6,
  label,
  labelPosition = 'top',
}: MarkPointProps) {
  const lx = labelPosition === 'right' ? cx + r + 6 : cx;
  const ly = labelPosition === 'right' ? cy + 4 : cy - r - 6;

  return (
    <>
      {/* 外圈脉冲 */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={r * 2}
        ry={r * 2}
        fill={color}
        opacity={0.12}
        stroke="none"
        strokeWidth={0}
      />
      <Ellipse
        cx={cx}
        cy={cy}
        rx={r * 1.4}
        ry={r * 1.4}
        fill={color}
        opacity={0.2}
        stroke="none"
        strokeWidth={0}
      />
      {/* 核心点 */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={r}
        ry={r}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        zIndex={10}
      />
      {label && (
        <Text
          x={lx}
          y={ly + 4}
          text={label}
          fontSize={12}
          fontFamily="sans-serif"
          fill={color}
          fontWeight="bold"
          textAlign={labelPosition === 'right' ? 'start' : 'middle'}
          zIndex={10}
        />
      )}
    </>
  );
}

/* ==================== MarkArea ==================== */

interface MarkAreaProps {
  /** 区域在 y 轴上的数据值范围 */
  yMin?: number;
  yMax?: number;
  xMin?: number;
  xMax?: number;
  /** 数据→像素 scale */
  yScale?: LinearScale;
  xScale?: LinearScale;
  /** 直接指定像素范围（优先于 scale） */
  pixelYMin?: number;
  pixelYMax?: number;
  pixelXMin?: number;
  pixelXMax?: number;
  /** 区域填充颜色 */
  color?: string;
  /** 填充透明度 */
  opacity?: number;
  /** 宽度覆盖 */
  width?: number;
  /** 标签（绘制在区域顶部边缘） */
  label?: string;
}

export function MarkArea({
  yMin,
  yMax,
  xMin,
  xMax,
  yScale,
  xScale,
  pixelYMin,
  pixelYMax,
  pixelXMin,
  pixelXMax,
  color = '#1677ff',
  opacity = 0.08,
  width = 530,
  label,
}: MarkAreaProps) {
  const py0 = pixelYMin ?? (yScale && yMin != null ? yScale(yMin) : 0);
  const py1 = pixelYMax ?? (yScale && yMax != null ? yScale(yMax) : 0);
  const px0 = pixelXMin ?? (xScale && xMin != null ? xScale(xMin) : 0);
  const px1 = pixelXMax ?? (xScale && xMax != null ? xScale(xMax) : width);

  const rectY = Math.min(py0, py1);
  const rectH = Math.abs(py1 - py0);
  const rectX = Math.min(px0, px1);
  const rectW = Math.abs(px1 - px0);

  return (
    <>
      <Rect
        x={rectX}
        y={rectY}
        width={rectW}
        height={rectH}
        fill={color}
        opacity={opacity}
      />
      {label && (
        <Text
          x={rectX + rectW / 2}
          y={rectY - 4}
          text={label}
          fontSize={10}
          fontFamily="sans-serif"
          fill={color}
          textAlign="middle"
        />
      )}
    </>
  );
}

export default { MarkLine, MarkPoint, MarkArea };
