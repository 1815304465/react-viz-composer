/**
 * ChartHoverShell —— Demo 层 Hover + Tooltip
 *
 * 使用 kit 的 Tooltip 半成品；样式可通过 Tooltip props 覆盖。
 */

import {
  useState, useCallback, type ReactNode,
} from 'react';
import type { VizEvent } from 'react-viz-composer';
import { Tooltip } from 'react-viz-composer';

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
 * 包裹图表演示，提供受控 Tooltip
 */
export function ChartHoverShell(props: ShellProps) {
  const { children } = props;

  const [tip, setTip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, content: '',
  });

  const show = useCallback((content: string, evt: VizEvent) => {
    setTip({
      visible: true,
      x: evt.offsetX,
      y: evt.offsetY,
      content,
    });
  }, []);

  const hide = useCallback(() => {
    setTip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children({ show, hide })}
      <Tooltip
        visible={tip.visible}
        x={tip.x}
        y={tip.y}
        offsetX={12}
        offsetY={12}
      >
        {tip.content}
      </Tooltip>
    </div>
  );
}

export default ChartHoverShell;
