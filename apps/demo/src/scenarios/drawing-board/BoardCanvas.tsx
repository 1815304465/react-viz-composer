import { useMemo, useCallback, useRef, useState, type RefObject } from 'react';
import {
  ReactVizComposer,
  Rect,
  Ellipse,
  Line,
  Path,
  Text,
  Group,
} from 'react-viz-composer';
import type { Viewport, VizEvent } from 'react-viz-composer';
import type { BoardTool, DrawingBoardState, DrawingBoardAction, BoardElement } from './types';
import { resolveElementStyle } from './boardState';
import {
  getVisibleWorldBounds,
  screenToWorld,
  getAdaptiveGridStep,
  buildGridPathD,
} from './coords';
import { normalizeEllipse, normalizeRect } from './pathUtils';
import DrawOverlay from './DrawOverlay';

interface Props {
  width: number;
  height: number;
  state: DrawingBoardState;
  viewport: Viewport;
  composerKey: number;
  dispatch: React.Dispatch<DrawingBoardAction>;
  onViewportChange: (v: Viewport) => void;
  canvasRef: RefObject<HTMLDivElement | null>;
}

const GRID_COLOR = 'rgba(0,0,0,0.08)';
const AXIS_COLOR = 'rgba(22,119,255,0.55)';
const TICK_COLOR = 'rgba(22,119,255,0.5)';
const ORIGIN_COLOR = '#1677ff';
const TICK_LABEL_COLOR = 'rgba(0,0,0,0.45)';

const DRAW_TOOLS: BoardTool[] = ['rect', 'ellipse', 'line', 'path'];
const OVERLAY_TOOLS: BoardTool[] = ['rect', 'ellipse', 'line', 'path', 'text'];

/** 稳定裁剪边距，避免每帧新对象导致 Graph remount */
const BOARD_CULL_MARGIN = { top: 80, right: 80, bottom: 80, left: 80 };

/**
 * 根据选中/悬停/禁用状态决定样式槽位
 */
function styleMode(
  element: BoardElement,
  selectedId: string | null,
  hoveredId: string | null,
  globalDisabled: boolean,
): 'default' | 'highlight' | 'disabled' {
  if (globalDisabled || element.disabled) return 'disabled';
  if (element.id === selectedId || element.id === hoveredId) return 'highlight';
  return 'default';
}

/**
 * 格式化刻度文字（过大数值用紧凑写法）
 */
function formatTick(v: number): string {
  if (Math.abs(v) >= 10000) return v.toExponential(0);
  if (Number.isInteger(v)) return String(v);
  return String(+v.toFixed(2));
}

/**
 * 画板主画布
 */
function BoardCanvas(props: Props) {
  const {
    width, height, state, viewport, composerKey, dispatch, onViewportChange, canvasRef,
  } = props;
  const { layers, elements, globalStyles, boardSettings, drawSession, activeTool } = state;

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const [isPanning, setIsPanning] = useState(false);

  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.order - b.order),
    [layers],
  );

  const isDrawTool = DRAW_TOOLS.includes(activeTool);
  /** 文本编辑浮层打开时不盖遮罩，避免挡住输入框 */
  const needsOverlay = OVERLAY_TOOLS.includes(activeTool) && !state.textEdit;
  const previewStyle = globalStyles.default;
  const globalDisabled = boardSettings.globalDisabled;

  const canvasCursor = activeTool === 'text'
    ? 'text'
    : isDrawTool
      ? 'crosshair'
      : isPanning
        ? 'grabbing'
        : 'grab';

  const handleCanvasDoubleClick = useCallback((evt: VizEvent) => {
    if (activeTool !== 'select' && activeTool !== 'text') return;
    const { x, y } = screenToWorld(evt.offsetX, evt.offsetY, viewportRef.current);
    dispatchRef.current({
      type: 'OPEN_TEXT_EDIT',
      session: { elementId: null, worldX: x, worldY: y, value: '' },
    });
  }, [activeTool]);

  const handleCanvasClick = useCallback((evt: VizEvent) => {
    if (activeTool === 'text') {
      const { x, y } = screenToWorld(evt.offsetX, evt.offsetY, viewportRef.current);
      dispatchRef.current({
        type: 'OPEN_TEXT_EDIT',
        session: { elementId: null, worldX: x, worldY: y, value: '' },
      });
      return;
    }
    if (activeTool === 'select') {
      dispatchRef.current({ type: 'SELECT_ELEMENT', id: null });
    }
  }, [activeTool]);

  const canvasEventProps = useMemo(() => ({
    onClick: handleCanvasClick,
    onDoubleClick: handleCanvasDoubleClick,
  }), [handleCanvasClick, handleCanvasDoubleClick]);

  const gridStep = useMemo(
    () => getAdaptiveGridStep(viewport.scale),
    [viewport.scale],
  );

  const worldBounds = useMemo(
    () => getVisibleWorldBounds(width, height, viewport),
    [width, height, viewport],
  );

  /** 网格：单 Path，随视口更新 */
  const gridPathD = useMemo(() => {
    if (!boardSettings.showGrid) return '';
    return buildGridPathD(worldBounds, gridStep);
  }, [boardSettings.showGrid, worldBounds, gridStep]);

  /** 坐标轴 + 刻度（刻度数量受限，随平移/缩放重算） */
  const axisContent = useMemo(() => {
    if (!boardSettings.showAxes) return null;
    const { left, top, right, bottom } = worldBounds;
    const tickHalf = 5 / viewport.scale;
    const labelOffset = 14 / viewport.scale;
    const fontSize = 11 / viewport.scale;
    const xStart = Math.ceil(left / gridStep) * gridStep;
    const yStart = Math.ceil(top / gridStep) * gridStep;
    const ticks: React.ReactNode[] = [];
    let count = 0;
    const maxTicks = 40;

    for (let x = xStart; x <= right && count < maxTicks; x += gridStep) {
      if (Math.abs(x) < 1e-9) continue;
      ticks.push(
        <Group key={`xt-${x}`}>
          <Line
            points={[{ x, y: -tickHalf }, { x, y: tickHalf }]}
            stroke={TICK_COLOR}
            strokeWidth={1 / viewport.scale}
            pointerEvents="none"
          />
          <Text
            x={x}
            y={labelOffset}
            text={formatTick(x)}
            fontSize={fontSize}
            fill={TICK_LABEL_COLOR}
            textAlign="middle"
            pointerEvents="none"
          />
        </Group>,
      );
      count += 1;
    }
    for (let y = yStart; y <= bottom && count < maxTicks * 2; y += gridStep) {
      if (Math.abs(y) < 1e-9) continue;
      ticks.push(
        <Group key={`yt-${y}`}>
          <Line
            points={[{ x: -tickHalf, y }, { x: tickHalf, y }]}
            stroke={TICK_COLOR}
            strokeWidth={1 / viewport.scale}
            pointerEvents="none"
          />
          <Text
            x={-labelOffset * 0.7}
            y={y + fontSize * 0.35}
            text={formatTick(y)}
            fontSize={fontSize}
            fill={TICK_LABEL_COLOR}
            textAlign="end"
            pointerEvents="none"
          />
        </Group>,
      );
      count += 1;
    }

    const sw = 1.5 / viewport.scale;
    const originR = 3 / viewport.scale;
    return (
      <Group pointerEvents="none">
        <Line points={[{ x: 0, y: top }, { x: 0, y: bottom }]} stroke={AXIS_COLOR} strokeWidth={sw} />
        <Line points={[{ x: left, y: 0 }, { x: right, y: 0 }]} stroke={AXIS_COLOR} strokeWidth={sw} />
        <Ellipse cx={0} cy={0} rx={originR} ry={originR} fill={ORIGIN_COLOR} />
        {ticks}
      </Group>
    );
  }, [boardSettings.showAxes, worldBounds, gridStep, viewport.scale]);

  /**
   * 渲染单个画板元素（图层隐藏时保留节点，仅 visible=false，避免再次显示时丢失）
   */
  const renderElement = (el: BoardElement, layerVisible: boolean) => {
    const mode = styleMode(el, state.selectedElementId, state.hoveredElementId, globalDisabled);
    const style = resolveElementStyle(el, globalStyles, mode, globalDisabled);
    const canInteract = layerVisible && activeTool === 'select' && !globalDisabled && !el.disabled;

    const sharedEvents = {
      pointerEvents: (canInteract ? 'auto' : 'none') as 'auto' | 'none',
      onClick: canInteract
        ? (evt: VizEvent) => { dispatch({ type: 'SELECT_ELEMENT', id: el.id }); evt.stopPropagation(); }
        : undefined,
      onMouseEnter: canInteract
        ? () => {
            dispatch({ type: 'SET_HOVER', id: el.id });
            if (canvasRef.current) canvasRef.current.style.cursor = 'move';
          }
        : undefined,
      onMouseLeave: canInteract
        ? () => {
            dispatch({ type: 'SET_HOVER', id: null });
            if (canvasRef.current && !isPanning) {
              canvasRef.current.style.cursor = canvasCursor;
            }
          }
        : undefined,
      onDragStart: canInteract
        ? () => {
            if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
          }
        : undefined,
      onDrag: canInteract
        ? (evt: { stepX: number; stepY: number }) => {
            dispatch({ type: 'MOVE_ELEMENT', id: el.id, dx: evt.stepX, dy: evt.stepY });
          }
        : undefined,
      onDragEnd: canInteract
        ? () => {
            if (canvasRef.current) canvasRef.current.style.cursor = canvasCursor;
          }
        : undefined,
      onDoubleClick: canInteract && el.type === 'text'
        ? (evt: VizEvent) => {
            dispatch({
              type: 'OPEN_TEXT_EDIT',
              session: { elementId: el.id, worldX: el.x + el.gx, worldY: el.y + el.gy, value: el.text },
            });
            evt.stopPropagation();
          }
        : undefined,
    };

    const fillStroke = {
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity,
    };

    return (
      <Group key={el.id} x={el.gx} y={el.gy} visible={layerVisible}>
        {el.type === 'rect' && (
          <Rect x={el.x} y={el.y} width={el.width} height={el.height} rx={2} {...fillStroke} {...sharedEvents} />
        )}
        {el.type === 'ellipse' && (
          <Ellipse cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} {...fillStroke} {...sharedEvents} />
        )}
        {el.type === 'line' && (
          <Line
            points={el.points}
            {...sharedEvents}
            fill="none"
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        )}
        {el.type === 'path' && (
          <Path
            d={el.d}
            {...sharedEvents}
            fill="none"
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        )}
        {el.type === 'text' && (
          <Text
            x={el.x}
            y={el.y}
            text={el.text}
            fontSize={el.fontSize}
            fill={style.stroke}
            opacity={style.opacity}
            textBaseline="middle"
            {...sharedEvents}
          />
        )}
      </Group>
    );
  };

  /**
   * 绘制中的预览图形
   */
  const renderPreview = () => {
    if (!drawSession) return null;
    const { tool, startX, startY, currentX, currentY, pathPoints } = drawSession;
    const ps = {
      fill: tool === 'line' || tool === 'path' ? 'none' : previewStyle.fill,
      stroke: previewStyle.stroke,
      strokeWidth: previewStyle.strokeWidth,
      opacity: 0.85,
      pointerEvents: 'none' as const,
    };

    if (tool === 'rect') {
      const { x, y, width: w, height: h } = normalizeRect(startX, startY, currentX, currentY);
      if (w < 1 && h < 1) return null;
      return <Rect x={x} y={y} width={Math.max(w, 1)} height={Math.max(h, 1)} rx={2} {...ps} />;
    }
    if (tool === 'ellipse') {
      const { cx, cy, rx, ry } = normalizeEllipse(startX, startY, currentX, currentY);
      return <Ellipse cx={cx} cy={cy} rx={Math.max(rx, 0.5)} ry={Math.max(ry, 0.5)} {...ps} />;
    }
    if (tool === 'line') {
      return <Line points={[{ x: startX, y: startY }, { x: currentX, y: currentY }]} fill="none" {...ps} />;
    }
    if (tool === 'path' && pathPoints.length > 1) {
      const d = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      return <Path d={d} fill="none" {...ps} />;
    }
    return null;
  };

  const layerElements = sortedLayers.flatMap((layer) =>
    elements
      .filter((e) => e.layerId === layer.id)
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((el) => renderElement(el, layer.visible)),
  );

  return (
    <div
      ref={canvasRef}
      style={{
        width,
        height,
        position: 'relative',
        background: '#fafafa',
        cursor: canvasCursor,
      }}
      onPointerDown={(e) => {
        if (needsOverlay) return;
        if (e.button === 0 || e.button === 1) setIsPanning(true);
      }}
      onPointerUp={() => setIsPanning(false)}
      onPointerLeave={() => setIsPanning(false)}
    >
      <ReactVizComposer
        key={composerKey}
        engine="canvas"
        width={width}
        height={height}
        viewport={viewport}
        interactiveViewport
        onViewportChange={onViewportChange}
        canvasEventProps={canvasEventProps}
        cullMargin={BOARD_CULL_MARGIN}
        style={{ cursor: canvasCursor }}
      >
        {boardSettings.showGrid && gridPathD && (
          <Path
            d={gridPathD}
            fill="none"
            stroke={GRID_COLOR}
            strokeWidth={0.5 / viewport.scale}
            pointerEvents="none"
          />
        )}
        {axisContent}
        {layerElements}
        {renderPreview()}
      </ReactVizComposer>

      {needsOverlay && (
        <DrawOverlay
          viewport={viewport}
          activeTool={activeTool}
          dispatch={dispatch}
          canvasRef={canvasRef}
          onViewportChange={onViewportChange}
        />
      )}
    </div>
  );
}

export default BoardCanvas;
