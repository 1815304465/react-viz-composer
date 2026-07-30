/**
 * ExplorableChartFrame —— 示例用可交互视口外框
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import ReactVizComposer from 'react-viz-composer';
import { GRID_COLOR } from '../utils/palette';
import { CHART_DEFAULT_VIEWPORT } from './ChartFrame';

export const EXPLORE_WIDTH = 720;
export const EXPLORE_HEIGHT = 480;

interface Props {
  children: ReactNode;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  showHint?: boolean;
}

/**
 * 可缩放平移的探索画布（示例）
 */
export function ExplorableChartFrame(props: Props) {
  const {
    children,
    width = '100%',
    height = '100%',
    className,
    style,
    showHint = true,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function apply(w: number, h: number) {
      if (w > 0 && h > 0) setReady(true);
    }

    const rect = el.getBoundingClientRect();
    apply(rect.width, rect.height);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      apply(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        border: `1px solid ${GRID_COLOR}`,
        borderRadius: 4,
        overflow: 'hidden',
        background: '#fafafa',
        position: 'relative',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {ready && (
        <ReactVizComposer
          engine="canvas"
          width="100%"
          height="100%"
          interactiveViewport
          viewport={CHART_DEFAULT_VIEWPORT}
        >
          {children}
        </ReactVizComposer>
      )}
      {showHint && (
        <span
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            fontSize: 11,
            color: '#8c8c8c',
            background: 'rgba(255,255,255,0.85)',
            padding: '2px 6px',
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        >
          滚轮缩放 · 空白拖拽平移 · 点击选中聚类
        </span>
      )}
    </div>
  );
}

export default ExplorableChartFrame;
