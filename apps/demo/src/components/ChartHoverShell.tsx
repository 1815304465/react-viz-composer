/**
 * ChartHoverShell —— App 层图表 Hover 浮层
 *
 * Tooltip UI 与状态由文档站（App）持有；图表仅通过 onItemEnter/onItemLeave 回调上报数据。
 * 无法在 App 外单独实现 hover 的原因：具体可交互元素（Rect/Ellipse 等）由图表组件内部创建，
 * App 无法在不改图表 API 的情况下直接绑定 onMouseEnter。
 */

import {
  useState, useCallback, type ReactNode,
} from 'react';
import type { VizEvent } from '@react-viz-composer/core';

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
}

export interface ChartHoverApi {
  /** 在鼠标位置展示文本 */
  show: (content: string, evt: VizEvent) => void;
  /** 隐藏浮层 */
  hide: () => void;
}

interface ShellProps {
  children: (api: ChartHoverApi) => ReactNode;
}

/**
 * 包裹 ChartFrame 图表，提供 hover 浮层（position 相对 ChartFrame 外框）
 */
export function ChartHoverShell(props: ShellProps) {
  const { children } = props;

  const [tip, setTip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, content: '',
  });

  const show = useCallback((content: string, evt: VizEvent) => {
    setTip({
      visible: true,
      x: evt.offsetX + 12,
      y: evt.offsetY + 12,
      content,
    });
  }, []);

  const hide = useCallback(() => {
    setTip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children({ show, hide })}
      {tip.visible && (
        <div
          style={{
            position: 'absolute',
            left: tip.x,
            top: tip.y,
            zIndex: 20,
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
          }}
        >
          {tip.content}
        </div>
      )}
    </div>
  );
}

export default ChartHoverShell;
