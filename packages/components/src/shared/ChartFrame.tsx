/**
 * ChartFrame —— 图表外框
 *
 * 标准尺寸 600x400，左/下边距留给坐标轴
 */

import type { ReactNode } from 'react';
import ReactVizComposer from '@react-viz-composer/core';
import { ChartEntryProgressProvider, useEntryProgress } from './useEntryProgress.ts';
import { AXIS_COLOR, GRID_COLOR, TEXT_LIGHT } from './palette';

export const CHART_WIDTH = 600;
export const CHART_HEIGHT = 400;
export const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

/** 绘图区宽高（去掉 padding） */
export const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
export const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

/** 固定视口，避免父组件重渲染导致 context 重建并重播入场动画 */
export const CHART_DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 } as const;

interface Props {
  children: ReactNode | ((progress: number) => ReactNode);
  background?: string;
  /** 入场动画时长 ms */
  entryDuration?: number;
}

/**
 * 在 ChartEntryProgressProvider 内读取 progress 并渲染
 */
function EntryProgressBridge(props: { render: (progress: number) => ReactNode }) {
  const progress = useEntryProgress();
  return <>{props.render(progress)}</>;
}

export function ChartFrame(props: Props) {
  const { children, background = '#fff', entryDuration } = props;

  return (
    <div
      style={{
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
        background,
        border: `1px solid ${GRID_COLOR}`,
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <ReactVizComposer
        engine="canvas"
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        viewport={CHART_DEFAULT_VIEWPORT}
      >
        <ChartEntryProgressProvider duration={entryDuration}>
          <ChartBackground />
          <Group offsetX={PADDING.left} offsetY={PADDING.top}>
            {typeof children === 'function' ? (
              <EntryProgressBridge render={children} />
            ) : (
              children
            )}
          </Group>
          <ChartBorder />
        </ChartEntryProgressProvider>
      </ReactVizComposer>
    </div>
  );
}

/** 背景矩形：白底 */
function ChartBackground() {
  return null; // 容器 div 已经有 background，不需要在 SVG 内重复
}

/** Group —— 用于平移坐标系到 padding 偏移后的位置
 *  注意：现有 Group 只接受 x/y/rotation/scale，无 offsetX 概念，
 *  所以用 transform 透传
 */
import { Group as VizGroup } from '@react-viz-composer/core';

function Group({
  children,
  offsetX = 0,
  offsetY = 0,
}: {
  children: ReactNode;
  offsetX?: number;
  offsetY?: number;
}) {
  return (
    <VizGroup x={offsetX} y={offsetY}>
      {children}
    </VizGroup>
  );
}

/** 外边框线 */
function ChartBorder() {
  return null; // 容器 div 的 border 已经够用
}

/* ---- 静态工具 ---- */

/** 颜色常量导出，避免内部组件 import 重复 */
export const COLORS = {
  AXIS_COLOR,
  GRID_COLOR,
  TEXT_LIGHT,
};
