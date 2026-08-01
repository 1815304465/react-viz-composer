import { Button, Divider, InputNumber, Switch, Typography, ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';
import {
  SelectOutlined,
  BorderOutlined,
  ColumnWidthOutlined,
  LineOutlined,
  EditOutlined,
  FontSizeOutlined,
} from '@ant-design/icons';
import type { BoardTool, DrawingBoardAction, DrawingBoardState, StylePreset, StyleTriple } from './types';
import { resolveElementStyle } from './boardState';

interface Props {
  state: DrawingBoardState;
  dispatch: React.Dispatch<DrawingBoardAction>;
}

const TOOLS: Array<{ key: BoardTool; label: string; icon: React.ReactNode }> = [
  { key: 'select', label: '选择', icon: <SelectOutlined /> },
  { key: 'rect', label: '矩形', icon: <BorderOutlined /> },
  { key: 'ellipse', label: '椭圆', icon: <ColumnWidthOutlined /> },
  { key: 'line', label: '直线', icon: <LineOutlined /> },
  { key: 'path', label: '手绘', icon: <EditOutlined /> },
  { key: 'text', label: '文本', icon: <FontSizeOutlined /> },
];

interface StyleFieldsProps {
  title: string;
  preset: StylePreset;
  previewLabel?: string;
  onChange: (patch: Partial<StylePreset>) => void;
}

/** 样式预览块 */
function StylePreview(props: { preset: StylePreset; label: string }) {
  const { preset, label } = props;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div
        style={{
          width: 28,
          height: 18,
          borderRadius: 3,
          background: preset.fill,
          border: `${Math.max(1, preset.strokeWidth)}px solid ${preset.stroke}`,
          opacity: preset.opacity,
        }}
      />
      <Typography.Text type="secondary" style={{ fontSize: 10 }}>{label}</Typography.Text>
    </div>
  );
}

/** 单套样式字段编辑器 */
function StyleFields(props: StyleFieldsProps) {
  const { title, preset, previewLabel, onChange } = props;

  return (
    <div style={{ marginBottom: 12 }}>
      <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
        {title}
      </Typography.Text>
      {previewLabel && <StylePreview preset={preset} label={previewLabel} />}
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: '6px 8px', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#8c8c8c' }}>填充</span>
        <ColorPicker size="small" value={preset.fill} onChange={(c: Color) => onChange({ fill: c.toHexString() })} />
        <span style={{ fontSize: 11, color: '#8c8c8c' }}>描边</span>
        <ColorPicker size="small" value={preset.stroke} onChange={(c: Color) => onChange({ stroke: c.toHexString() })} />
        <span style={{ fontSize: 11, color: '#8c8c8c' }}>线宽</span>
        <InputNumber size="small" min={0} max={20} step={0.5} value={preset.strokeWidth}
          onChange={(v) => onChange({ strokeWidth: v ?? 1 })} style={{ width: '100%' }} />
        <span style={{ fontSize: 11, color: '#8c8c8c' }}>透明度</span>
        <InputNumber size="small" min={0} max={1} step={0.05} value={preset.opacity}
          onChange={(v) => onChange({ opacity: v ?? 1 })} style={{ width: '100%' }} />
      </div>
    </div>
  );
}

/** 合并全局 + 元素差异得到展示用 preset */
function mergedPreset(
  global: StylePreset,
  override: Partial<StylePreset> | undefined,
): StylePreset {
  return override ? { ...global, ...override } : global;
}

/**
 * 左侧工具栏
 */
function LeftPanel(props: Props) {
  const { state, dispatch } = props;
  const selected = state.elements.find((e) => e.id === state.selectedElementId);

  const renderGlobalOrElementStyle = (label: string, slot: keyof StyleTriple) => {
    const globalPreset = state.globalStyles[slot];
    const override = selected?.styleOverride?.[slot];
    const displayPreset = mergedPreset(globalPreset, override);

    return (
      <StyleFields
        key={slot}
        title={label}
        preset={displayPreset}
        previewLabel={selected ? undefined : label}
        onChange={(patch) => {
          if (selected) {
            dispatch({ type: 'PATCH_ELEMENT_STYLE', id: selected.id, slot, preset: patch });
          } else {
            dispatch({ type: 'SET_GLOBAL_STYLE', slot, preset: patch });
          }
        }}
      />
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRight: '1px solid #f0f0f0',
        background: '#fff',
        overflow: 'auto',
        padding: '10px 12px',
      }}
    >
      <Typography.Text strong style={{ fontSize: 12 }}>工具</Typography.Text>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8, marginBottom: 12 }}>
        {TOOLS.map((t) => (
          <Button
            key={t.key}
            size="small"
            type={state.activeTool === t.key ? 'primary' : 'default'}
            icon={t.icon}
            onClick={() => dispatch({ type: 'SET_TOOL', tool: t.key })}
            style={{ fontSize: 11 }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <Typography.Text strong style={{ fontSize: 12 }}>画布显示</Typography.Text>
      <div style={{ marginTop: 8, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <Switch size="small" checked={state.boardSettings.showGrid}
            onChange={(v) => dispatch({ type: 'SET_BOARD_SETTING', key: 'showGrid', value: v })} />
          <Typography.Text style={{ fontSize: 11, marginLeft: 8 }}>显示网格</Typography.Text>
        </div>
        <div>
          <Switch size="small" checked={state.boardSettings.showAxes}
            onChange={(v) => dispatch({ type: 'SET_BOARD_SETTING', key: 'showAxes', value: v })} />
          <Typography.Text style={{ fontSize: 11, marginLeft: 8 }}>显示十字坐标轴</Typography.Text>
        </div>
        <div>
          <Switch size="small" checked={state.boardSettings.globalDisabled}
            onChange={(v) => dispatch({ type: 'SET_BOARD_SETTING', key: 'globalDisabled', value: v })} />
          <Typography.Text style={{ fontSize: 11, marginLeft: 8 }}>全局禁用</Typography.Text>
        </div>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <Typography.Text strong style={{ fontSize: 12 }}>
        {selected ? '元素样式（覆盖全局）' : '全局元素样式'}
      </Typography.Text>
      {!selected && (
        <Typography.Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4, marginBottom: 4 }}>
          默认 / 高亮 / 禁用三套样式；新建元素实时继承全局，全局配置会持久化
        </Typography.Text>
      )}

      {selected && (
        <div style={{ marginTop: 8, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <Switch size="small" checked={!!selected.disabled}
              onChange={(checked) => dispatch({ type: 'SET_ELEMENT_DISABLED', id: selected.id, disabled: checked })} />
            <Typography.Text style={{ fontSize: 11, marginLeft: 8 }}>禁用此元素</Typography.Text>
          </div>
          <Button size="small" type="link" style={{ padding: 0, fontSize: 11 }}
            onClick={() => dispatch({ type: 'CLEAR_ELEMENT_STYLE', id: selected.id })}>
            清除元素样式覆盖
          </Button>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        {renderGlobalOrElementStyle('默认样式', 'default')}
        {renderGlobalOrElementStyle('高亮样式（选中/悬停）', 'highlight')}
        {renderGlobalOrElementStyle('禁用样式', 'disabled')}
      </div>

      {selected && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <Typography.Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 6 }}>
            当前渲染预览
          </Typography.Text>
          <StylePreview
            preset={resolveElementStyle(
              selected,
              state.globalStyles,
              selected.id === state.selectedElementId ? 'highlight' : 'default',
              state.boardSettings.globalDisabled,
            )}
            label="当前效果"
          />
          <Button size="small" danger block style={{ marginTop: 8 }}
            onClick={() => dispatch({ type: 'DELETE_ELEMENT', id: selected.id })}>
            删除元素
          </Button>
        </>
      )}
    </div>
  );
}

export default LeftPanel;
