/**
 * Tooltip —— 半成品浮层提示
 *
 * 纯展示组件：可见性、位置、内容与样式全部由 props 控制。
 */

import type { CSSProperties, ReactNode } from 'react';

export interface TooltipProps {
  /** 是否显示 */
  visible?: boolean;
  /** 相对定位容器的 left（px） */
  x?: number;
  /** 相对定位容器的 top（px） */
  y?: number;
  /** 提示内容 */
  children?: ReactNode;
  /** 同 children，便于受控写法 */
  content?: ReactNode;
  className?: string;
  /** 完全覆盖默认样式；未传时使用内置基础样式 */
  style?: CSSProperties;
  /** 在默认样式之上合并（style 优先） */
  offsetX?: number;
  offsetY?: number;
  zIndex?: number;
  maxWidth?: number | string;
  padding?: string | number;
  background?: string;
  color?: string;
  fontSize?: number | string;
  lineHeight?: number | string;
  borderRadius?: number | string;
  boxShadow?: string;
  whiteSpace?: CSSProperties['whiteSpace'];
  pointerEvents?: CSSProperties['pointerEvents'];
}

const DEFAULT_STYLE: CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  padding: '6px 10px',
  background: 'rgba(0, 0, 0, 0.78)',
  color: '#fff',
  fontSize: 12,
  lineHeight: 1.5,
  borderRadius: 4,
  whiteSpace: 'pre-line',
  maxWidth: 240,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
};

/**
 * 浮层 Tooltip 半成品
 * @param props 位置 / 内容 / 样式
 */
export function Tooltip(props: TooltipProps) {
  const {
    visible = false,
    x = 0,
    y = 0,
    children,
    content,
    className,
    style,
    offsetX = 0,
    offsetY = 0,
    zIndex = 20,
    maxWidth,
    padding,
    background,
    color,
    fontSize,
    lineHeight,
    borderRadius,
    boxShadow,
    whiteSpace,
    pointerEvents,
  } = props;

  if (!visible) return null;

  const body = children ?? content;

  const merged: CSSProperties = {
    ...DEFAULT_STYLE,
    left: x + offsetX,
    top: y + offsetY,
    zIndex,
    ...(maxWidth !== undefined ? { maxWidth } : null),
    ...(padding !== undefined ? { padding } : null),
    ...(background !== undefined ? { background } : null),
    ...(color !== undefined ? { color } : null),
    ...(fontSize !== undefined ? { fontSize } : null),
    ...(lineHeight !== undefined ? { lineHeight } : null),
    ...(borderRadius !== undefined ? { borderRadius } : null),
    ...(boxShadow !== undefined ? { boxShadow } : null),
    ...(whiteSpace !== undefined ? { whiteSpace } : null),
    ...(pointerEvents !== undefined ? { pointerEvents } : null),
    ...style,
  };

  return (
    <div className={className} style={merged}>
      {body}
    </div>
  );
}

export default Tooltip;
