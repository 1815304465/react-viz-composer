import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { Viewport } from 'react-viz-composer';
import type { BoardTool, DrawingBoardAction } from './types';
import { screenToWorld } from './coords';
import { panViewport, wheelDeltaToZoomFactor, zoomViewportAtPoint } from './storage';

interface Props {
  viewport: Viewport;
  activeTool: BoardTool;
  dispatch: React.Dispatch<DrawingBoardAction>;
  canvasRef: RefObject<HTMLDivElement | null>;
  onViewportChange: (v: Viewport) => void;
}

const DRAW_TOOLS = new Set<BoardTool>(['rect', 'ellipse', 'line', 'path']);
const OVERLAY_TOOLS = new Set<BoardTool>(['rect', 'ellipse', 'line', 'path', 'text']);

/**
 * 绘制/文本遮罩：拦截左键创建；滚轮缩放、中键平移仍可用
 */
function DrawOverlay(props: Props) {
  const { viewport, activeTool, dispatch, canvasRef, onViewportChange } = props;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  const drawingRef = useRef(false);
  const panningRef = useRef(false);
  const panLastRef = useRef({ x: 0, y: 0 });

  const getLocalPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return screenToWorld(clientX - rect.left, clientY - rect.top, viewportRef.current);
  }, [canvasRef]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (panningRef.current) {
        const dx = e.clientX - panLastRef.current.x;
        const dy = e.clientY - panLastRef.current.y;
        panLastRef.current = { x: e.clientX, y: e.clientY };
        onViewportChangeRef.current(panViewport(viewportRef.current, dx, dy));
        return;
      }
      if (!drawingRef.current) return;
      const pt = getLocalPoint(e.clientX, e.clientY);
      if (!pt) return;
      dispatch({
        type: 'UPDATE_DRAW',
        x: pt.x,
        y: pt.y,
        pathPoint: activeToolRef.current === 'path' ? { x: pt.x, y: pt.y } : undefined,
      });
    };
    const onUp = () => {
      if (panningRef.current) {
        panningRef.current = false;
        return;
      }
      if (!drawingRef.current) return;
      drawingRef.current = false;
      dispatch({ type: 'END_DRAW' });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dispatch, getLocalPoint]);

  /**
   * 左键：文本落点 / 开始绘制；中键：平移
   */
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!OVERLAY_TOOLS.has(activeTool)) return;

    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      panningRef.current = true;
      panLastRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const pt = getLocalPoint(e.clientX, e.clientY);
    if (!pt) return;

    if (activeTool === 'text') {
      dispatch({
        type: 'OPEN_TEXT_EDIT',
        session: { elementId: null, worldX: pt.x, worldY: pt.y, value: '' },
      });
      return;
    }

    if (!DRAW_TOOLS.has(activeTool)) return;
    drawingRef.current = true;
    dispatch({
      type: 'START_DRAW',
      session: {
        tool: activeTool as 'rect' | 'ellipse' | 'line' | 'path',
        startX: pt.x,
        startY: pt.y,
        currentX: pt.x,
        currentY: pt.y,
        pathPoints: [{ x: pt.x, y: pt.y }],
      },
    });
  }, [activeTool, dispatch, getLocalPoint]);

  /**
   * 遮罩层上的滚轮缩放
   */
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = zoomViewportAtPoint(
      viewportRef.current,
      wheelDeltaToZoomFactor(e.deltaY),
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
    onViewportChangeRef.current(next);
  }, [canvasRef]);

  const cursor = activeTool === 'text' ? 'text' : 'crosshair';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 4,
        cursor,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

export default DrawOverlay;
