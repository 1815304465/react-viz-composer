/**
 * ChartFrame —— 示例用图表外框（不属于 kit）
 *
 * 默认填满父级。children 可为渲染函数，以获取实测 plot 尺寸。
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import ReactVizComposer, { Group as VizGroup } from 'react-viz-composer';
import type { EngineType } from 'react-viz-composer';
import { GRID_COLOR } from '../utils/palette';

export const PADDING = { top: 20, right: 20, bottom: 40, left: 50 } as const;

export type ChartPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const CHART_DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 } as const;

export const CHART_WIDTH = 600;
export const CHART_HEIGHT = 400;
export const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
export const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

export interface ChartSize {
  chartWidth: number;
  chartHeight: number;
  plotWidth: number;
  plotHeight: number;
  padding: ChartPadding;
}

const ChartSizeContext = createContext<ChartSize>({
  chartWidth: CHART_WIDTH,
  chartHeight: CHART_HEIGHT,
  plotWidth: PLOT_WIDTH,
  plotHeight: PLOT_HEIGHT,
  padding: { ...PADDING },
});

/**
 * 在 ChartFrame 子树内读取实测尺寸
 */
export function useChartSize(): ChartSize {
  return useContext(ChartSizeContext);
}

interface Props {
  children: ReactNode | ((size: ChartSize) => ReactNode);
  width?: number | string;
  height?: number | string;
  padding?: Partial<ChartPadding>;
  background?: string;
  engine?: EngineType;
  className?: string;
  style?: CSSProperties;
}

/**
 * 合并 padding
 */
function resolvePadding(override?: Partial<ChartPadding>): ChartPadding {
  return {
    top: override?.top ?? PADDING.top,
    right: override?.right ?? PADDING.right,
    bottom: override?.bottom ?? PADDING.bottom,
    left: override?.left ?? PADDING.left,
  };
}

/**
 * 示例图表外框
 */
export function ChartFrame(props: Props) {
  const {
    children,
    width = '100%',
    height = '100%',
    padding: paddingProp,
    background = '#fff',
    engine = 'canvas',
    className,
    style,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const padding = resolvePadding(paddingProp);
  const [size, setSize] = useState<ChartSize | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function apply(nextW: number, nextH: number) {
      if (nextW <= 0 || nextH <= 0) return;
      setSize({
        chartWidth: nextW,
        chartHeight: nextH,
        plotWidth: Math.max(0, nextW - padding.left - padding.right),
        plotHeight: Math.max(0, nextH - padding.top - padding.bottom),
        padding,
      });
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
  }, [padding.top, padding.right, padding.bottom, padding.left]);

  const content = size
    ? (typeof children === 'function' ? children(size) : children)
    : null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        background,
        border: `1px solid ${GRID_COLOR}`,
        borderRadius: 4,
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {size && (
        <ChartSizeContext.Provider value={size}>
          <ReactVizComposer
            engine={engine}
            width="100%"
            height="100%"
            viewport={CHART_DEFAULT_VIEWPORT}
          >
            <VizGroup x={size.padding.left} y={size.padding.top}>
              {content}
            </VizGroup>
          </ReactVizComposer>
        </ChartSizeContext.Provider>
      )}
    </div>
  );
}

export const COLORS = {
  AXIS_COLOR: '#d9d9d9',
  GRID_COLOR,
  TEXT_LIGHT: '#8c8c8c',
};

export default ChartFrame;
