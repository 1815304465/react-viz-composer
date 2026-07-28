/**
 * ExplorableChartFrame —— 可交互视口的大画布外框（平移/缩放）
 */

import type { ReactNode } from 'react';
import ReactVizComposer from '@react-viz-composer/core';
import { ChartEntryProgressProvider, useEntryProgress } from './useEntryProgress.ts';
import { GRID_COLOR } from '@react-viz-composer/utilities';
import { CHART_DEFAULT_VIEWPORT } from './ChartFrame';

export const EXPLORE_WIDTH = 720;
export const EXPLORE_HEIGHT = 480;

interface Props {
  children: ReactNode | ((progress: number) => ReactNode);
  entryDuration?: number;
}

function EntryProgressBridge(props: { render: (progress: number) => ReactNode }) {
  const progress = useEntryProgress();
  return <>{props.render(progress)}</>;
}

/** 可缩放平移的探索画布 */
export function ExplorableChartFrame(props: Props) {
  const { children, entryDuration } = props;

  return (
    <div
      style={{
        width: EXPLORE_WIDTH,
        height: EXPLORE_HEIGHT,
        border: `1px solid ${GRID_COLOR}`,
        borderRadius: 4,
        overflow: 'hidden',
        background: '#fafafa',
        position: 'relative',
      }}
    >
      <ReactVizComposer
        engine="canvas"
        width={EXPLORE_WIDTH}
        height={EXPLORE_HEIGHT}
        interactiveViewport
        viewport={CHART_DEFAULT_VIEWPORT}
      >
        <ChartEntryProgressProvider duration={entryDuration}>
          {typeof children === 'function' ? (
            <EntryProgressBridge render={children} />
          ) : (
            children
          )}
        </ChartEntryProgressProvider>
      </ReactVizComposer>
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
    </div>
  );
}

export default ExplorableChartFrame;
