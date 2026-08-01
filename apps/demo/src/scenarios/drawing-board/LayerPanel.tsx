import { useState } from 'react';
import { Button, Typography } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, PlusOutlined, HolderOutlined } from '@ant-design/icons';
import type { DrawingBoardAction, DrawingBoardState } from './types';

interface Props {
  state: DrawingBoardState;
  dispatch: React.Dispatch<DrawingBoardAction>;
}

/**
 * 右侧图层面板（PS 风格）
 */
function LayerPanel(props: Props) {
  const { state, dispatch } = props;
  const [dragId, setDragId] = useState<string | null>(null);

  const sorted = [...state.layers].sort((a, b) => b.order - a.order);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderLeft: '1px solid #f0f0f0',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography.Text strong style={{ fontSize: 12 }}>图层</Typography.Text>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => dispatch({ type: 'ADD_LAYER' })}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '6px 8px' }}>
        {sorted.map((layer, index) => {
          const count = state.elements.filter((e) => e.layerId === layer.id).length;
          const isActive = state.activeLayerId === layer.id;

          return (
            <div
              key={layer.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation();
                if (dragId && dragId !== layer.id) {
                  const asc = [...state.layers].sort((a, b) => a.order - b.order);
                  const toIndexAsc = asc.length - 1 - index;
                  dispatch({ type: 'REORDER_LAYER', id: dragId, toIndex: toIndexAsc });
                }
                setDragId(null);
              }}
              onClick={() => dispatch({ type: 'SET_ACTIVE_LAYER', id: layer.id })}
              onKeyDown={(e) => { if (e.key === 'Enter') dispatch({ type: 'SET_ACTIVE_LAYER', id: layer.id }); }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                marginBottom: 4,
                borderRadius: 6,
                cursor: 'pointer',
                background: isActive ? '#e6f4ff' : '#fafafa',
                border: isActive ? '1px solid #91caff' : '1px solid transparent',
              }}
            >
              <span
                draggable
                onDragStart={(e) => { e.stopPropagation(); setDragId(layer.id); }}
                style={{ cursor: 'grab', color: '#bfbfbf', fontSize: 12, lineHeight: 1 }}
              >
                <HolderOutlined />
              </span>
              <Button
                type="text"
                size="small"
                icon={layer.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'TOGGLE_LAYER_VISIBLE', id: layer.id });
                }}
                style={{ minWidth: 24, padding: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text ellipsis style={{ fontSize: 12, display: 'block' }}>
                  {layer.name}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                  {count} 个元素
                </Typography.Text>
              </div>
            </div>
          );
        })}
      </div>

      <Typography.Text
        type="secondary"
        style={{ fontSize: 10, padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}
      >
        拖拽调整顺序 · 元素 zIndex 仅在图层内有效
      </Typography.Text>
    </div>
  );
}

export default LayerPanel;
