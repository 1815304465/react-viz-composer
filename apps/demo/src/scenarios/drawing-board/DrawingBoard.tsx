import { useReducer, useState, useCallback, useRef, useEffect } from 'react';
import type { Viewport } from 'react-viz-composer';
import { Button, Space, Typography } from 'antd';
import { useDrawingBoardReducer } from './boardState';
import { LEFT_PANEL_W, RIGHT_PANEL_W } from './defaults';
import { savePersistedGlobalStyles, savePersistedBoardSettings } from './storage';
import BoardCanvas from './BoardCanvas';
import LeftPanel from './LeftPanel';
import LayerPanel from './LayerPanel';
import TextEditorOverlay from './TextEditorOverlay';

interface Props {
  width?: number;
  height?: number;
}

const DEFAULT_W = 1060;
const DEFAULT_H = 580;
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

/**
 * 二维画板：工具/样式（左）+ 无限画布（中）+ 图层（右）
 */
export function DrawingBoard(props: Props) {
  const { width = DEFAULT_W, height = DEFAULT_H } = props;

  const { initialState, reducer } = useDrawingBoardReducer();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [composerKey, setComposerKey] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const canvasW = width - LEFT_PANEL_W - RIGHT_PANEL_W;

  const handleResetView = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
    setComposerKey((k) => k + 1);
  }, []);

  const handleViewportChange = useCallback((v: Viewport) => {
    setViewport(v);
  }, []);

  useEffect(() => {
    savePersistedGlobalStyles(state.globalStyles);
  }, [state.globalStyles]);

  useEffect(() => {
    savePersistedBoardSettings(state.boardSettings);
  }, [state.boardSettings]);

  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <div
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
        }}
      >
        <Typography.Text strong style={{ fontSize: 12 }}>二维画板</Typography.Text>
        <Space size="small">
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            滚轮缩放 · 空白拖拽平移 · 绘制工具可连续创建
          </Typography.Text>
          <Button size="small" onClick={handleResetView}>重置视图</Button>
        </Space>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: LEFT_PANEL_W, flexShrink: 0 }}>
          <LeftPanel state={state} dispatch={dispatch} />
        </div>

        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <BoardCanvas
            width={canvasW}
            height={height - 32}
            state={state}
            viewport={viewport}
            composerKey={composerKey}
            dispatch={dispatch}
            onViewportChange={handleViewportChange}
            canvasRef={canvasRef}
          />
          {state.textEdit && (
            <TextEditorOverlay
              session={state.textEdit}
              viewport={viewport}
              dispatch={dispatch}
            />
          )}
        </div>

        <div style={{ width: RIGHT_PANEL_W, flexShrink: 0 }}>
          <LayerPanel state={state} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}

export default DrawingBoard;
