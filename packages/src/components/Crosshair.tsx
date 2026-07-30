/**
 * Crosshair —— 半成品十字准星
 *
 * 位置完全受控（x/y）；需开发者在图表 onMouseMove 中更新坐标后才有意义。
 */

import { Line } from '../shapes';

export interface CrosshairProps {
  /** 为 false 或不传坐标时不画 */
  visible?: boolean;
  /** 竖线 x（像素） */
  x?: number | null;
  /** 横线 y（像素） */
  y?: number | null;
  /** 绘图区宽（竖线高度来源） */
  plotWidth: number;
  /** 绘图区高（横线宽度来源） */
  plotHeight: number;
  showVertical?: boolean;
  showHorizontal?: boolean;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
}

/**
 * 十字准星叠加层
 * @param props 受控坐标与样式
 */
export function Crosshair(props: CrosshairProps) {
  const {
    visible = true,
    x,
    y,
    plotWidth,
    plotHeight,
    showVertical = true,
    showHorizontal = true,
    stroke = '#8c8c8c',
    strokeWidth = 1,
    strokeDasharray = '4 4',
    opacity = 0.85,
  } = props;

  if (!visible) return null;

  const showV = showVertical && x != null && Number.isFinite(x);
  const showH = showHorizontal && y != null && Number.isFinite(y);
  if (!showV && !showH) return null;

  return (
    <>
      {showV && (
        <Line
          points={[
            { x: x as number, y: 0 },
            { x: x as number, y: plotHeight },
          ]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          opacity={opacity}
        />
      )}
      {showH && (
        <Line
          points={[
            { x: 0, y: y as number },
            { x: plotWidth, y: y as number },
          ]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          opacity={opacity}
        />
      )}
    </>
  );
}

export default Crosshair;
