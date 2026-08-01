import { useRef, useMemo, useState, useEffect, type ReactNode, type CSSProperties } from 'react';
import { throttle } from './utils/object';
import { Graph, SceneTree } from './engine';
import type {
  EngineType, Viewport, ElementData, ViewportCullMargin,
  VizEventType, VizEventHandler, VizDragEventHandler,
  SceneNode,
} from './engine';
import type { ShapeEventProps } from './shapes/events';
import { buildShapeEvents, pickShapeEventProps } from './shapes/events';
import { panViewport, wheelDeltaToZoomFactor, zoomViewportAtPoint } from './engine/utils/viewport';
import {
  VizContext, VizFrameContext, SceneTreeContext,
  type IVizContext, type IVizFrameContext,
} from './context';

interface Props {
  engine?: EngineType;
  width?: number | string;
  height?: number | string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 视口（相机）配置：平移量和缩放倍率 */
  viewport?: Viewport;
  /** 是否自动监听容器尺寸变化，默认 true */
  autoSize?: boolean;
  /** ResizeObserver 防抖时间（ms），默认 120 */
  debounceWait?: number;
  /** 启用滚轮缩放视口（未传受控 viewport 时生效） */
  interactiveViewport?: boolean;
  /** 视口变化回调 */
  onViewportChange?: (viewport: Viewport) => void;
  /** 视口裁剪边距（CSS 像素）；未传时四边默认各为画布宽/高的 20%；四边传 0 关闭裁剪 */
  cullMargin?: ViewportCullMargin;
  /** 根画布事件（与形状组件事件 props 一致，在空白区域触发） */
  canvasEventProps?: ShapeEventProps;
}

/** 尺寸变化阈值，低于此值的变化视为浮点误差不做处理 */
const SIZE_THRESHOLD = 2;

function ReactVizComposer(props: Props) {
  const {
    engine = 'svg',
    width = '100%',
    height = '100%',
    children,
    className,
    style,
    viewport,
    autoSize = true,
    debounceWait = 120,
    interactiveViewport = false,
    onViewportChange,
    cullMargin,
    canvasEventProps,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const sceneTreeRef = useRef<SceneTree | null>(null);
  const prevSizeRef = useRef({ width: 0, height: 0 });
  const viewportPropRef = useRef(viewport);
  const onViewportChangeRef = useRef(onViewportChange);
  const [internalViewport, setInternalViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const effectiveViewport = viewport ?? internalViewport;

  viewportPropRef.current = viewport;
  onViewportChangeRef.current = onViewportChange;

  // SceneTree 在 useMemo 中创建（不依赖 DOM，构造时无副作用）
  const sceneTree = useMemo(() => new SceneTree(), []);

  // Graph 仅随 engine 重建；cullMargin 通过 setCullMargin 热更新，避免对象引用变化 remount
  const graph = useMemo(() => new Graph({ engine, cullMargin }), [engine]);

  // 共享 sceneTree 引用
  sceneTreeRef.current = sceneTree;

  // useEffect 挂载 Graph 到 DOM
  // 注意：viewport / onViewportChange / canvasEventProps 走 ref，避免受控视口每次平移 remount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    graphRef.current = graph;
    graph.mount(container);

    // 应用视口裁剪边距：未传时用空对象 → 四边默认各 20% 画布尺寸
    {
      const rect = container.getBoundingClientRect();
      graph.setCullMargin(cullMargin ?? {}, rect.width, rect.height);
    }

    if (interactiveViewport) {
      const applyViewport = (next: Viewport) => {
        if (viewportPropRef.current === undefined) setInternalViewport(next);
        onViewportChangeRef.current?.(next);
        graphRef.current?.setViewport(next);
      };

      graph.eventSystem.setWheelHandler((evt) => {
        evt.preventDefault();
        const wheel = evt.originalEvent as WheelEvent;
        const prev = graphRef.current?.getViewport() ?? { x: 0, y: 0, scale: 1 };
        applyViewport(zoomViewportAtPoint(
          prev,
          wheelDeltaToZoomFactor(wheel.deltaY),
          evt.offsetX,
          evt.offsetY,
        ));
      });

      graph.eventSystem.setPanHandler((dx, dy) => {
        const prev = graphRef.current?.getViewport() ?? { x: 0, y: 0, scale: 1 };
        applyViewport(panViewport(prev, dx, dy));
      });
    }

    // 首次同步 SceneTree
    graph.applySceneChange(sceneTree, 'register');

    // 同步 flush：入场动画 update 必须在同帧 render 前写入 SceneTree
    sceneTree.setFlushScheduler(() => {
      sceneTree.flushUpdates();
    });

    // 订阅 SceneTree：结构变更全量同步，数据更新增量同步
    const unsubScene = sceneTree.subscribe((reason) => {
      graphRef.current?.applySceneChange(sceneTree, reason);
    });

    return () => {
      unsubScene();
      graph.eventSystem.setWheelHandler(null);
      graph.eventSystem.setPanHandler(null);
      graph.dispose();
      graphRef.current = null;
    };
  }, [engine, graph, interactiveViewport, sceneTree]);

  // cullMargin 变化时热更新，不重建 Graph；undefined → 默认 20%
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !graphRef.current) return;
    const rect = container.getBoundingClientRect();
    graphRef.current.setCullMargin(cullMargin ?? {}, rect.width, rect.height);
  }, [cullMargin]);

  // 根画布事件可随 props 更新，无需 remount Graph
  useEffect(() => {
    if (!graphRef.current) return;
    if (!canvasEventProps) {
      graphRef.current.eventSystem.setRootEventHandler({});
      return;
    }
    const rootEvents = buildShapeEvents(
      pickShapeEventProps(canvasEventProps as Record<string, unknown>),
    );
    graphRef.current.eventSystem.setRootEventHandler(rootEvents);
  }, [canvasEventProps, graph]);

  useEffect(() => {
    graphRef.current?.setViewport(effectiveViewport);
  }, [effectiveViewport]);

  // 节流后的 resize 处理器
  const handleResize = useMemo(
    () =>
      throttle((w: number, h: number) => {
        const prev = prevSizeRef.current;

        // 阈值检查：防止修改 SVG/Canvas 内部尺寸后触发微小回流
        if (Math.abs(w - prev.width) < SIZE_THRESHOLD && Math.abs(h - prev.height) < SIZE_THRESHOLD) {
          return;
        }

        prevSizeRef.current = { width: w, height: h };
        graphRef.current?.resize(w, h);
        // 容器尺寸变化时重新应用裁剪边距（未传 → 默认 20%）
        graphRef.current?.setCullMargin(cullMargin ?? {}, w, h);
      }, debounceWait),
    [debounceWait, cullMargin],
  );

  // ResizeObserver —— 监听容器尺寸变化
  useEffect(() => {
    if (!autoSize) return;

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0].contentRect;
      handleResize(w, h);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      handleResize.cancel();
    };
  }, [autoSize, handleResize]);

  // VizContext —— 极简的"声明式数据投递"接口
  // 形状组件只需 register / update / unregister 自己声明的 JSON。
  // 视口/帧循环/拖拽等运行时能力由下方独立的 VizFrameContext 提供。
  const contextValue: IVizContext = useMemo(() => ({
    register(parentId: string | undefined, node: SceneNode) {
      sceneTree.registerNode(parentId, node);
    },
    update(
      id: string,
      partial: {
        data?: Partial<ElementData>;
        events?: Partial<Record<VizEventType, VizEventHandler>>;
      },
    ) {
      sceneTree.updateNode(id, partial);
    },
    unregister(id: string) {
      sceneTree.unregisterNode(id);
    },
  }), [sceneTree]);

  // VizFrameContext —— 帧循环 / 事件运行时
  // 面向 Animation / EntryProgress / 可拖拽形状。
  // 普通形状不需要碰它。
  //
  // 直接用 graph 而非 graphRef.current：
  // React useEffect 是子→父顺序执行，子组件的 effect（如 Animation 的
  // requestFrame/enqueueJob）可能先于父组件 effect 中 graph.mount() 触发，
  // 此时 graphRef.current 仍是 null。graph 在 useMemo 中创建，不受 effect
  // 顺序影响，且 Scheduler / Renderer.registerDrag 在 mount 前即可安全工作
  // （Scheduler 只入队，registerDrag 监听 document 不依赖容器 DOM）。
  const frameContextValue: IVizFrameContext = useMemo(() => ({
    requestFrame(fn: () => void) {
      return graph.requestFrame(fn);
    },
    enqueueJob(fn: () => void, priority = 0) {
      graph.enqueueJob(fn, priority);
    },
    registerDrag(id: string, onDrag: VizDragEventHandler, onDragEnd: VizDragEventHandler, evt: MouseEvent) {
      graph.registerDrag(id, onDrag, onDragEnd, evt);
    },
  }), [graph]);

  return (
    <VizContext.Provider value={contextValue}>
      <VizFrameContext.Provider value={frameContextValue}>
        <SceneTreeContext.Provider value={sceneTree}>
          <div
            ref={containerRef}
            className={className}
            style={{
              width,
              height,
              position: 'relative',
              overflow: 'hidden',
              userSelect: 'none',
              ...style,
            }}
          >
            {children}
          </div>
        </SceneTreeContext.Provider>
      </VizFrameContext.Provider>
    </VizContext.Provider>
  );
}

export default ReactVizComposer;
export { Rect } from './shapes/geometries/Rect';
export { Ellipse } from './shapes/geometries/Ellipse';
export { Line } from './shapes/geometries/Line';
export { Path } from './shapes/geometries/Path';
export { Text } from './shapes/geometries/Text';
export { Image } from './shapes/geometries/Image';
export { Points } from './shapes/geometries/Points';
export { LinearGradient } from './shapes/definitions/LinearGradient';
export { RadialGradient } from './shapes/definitions/RadialGradient';
export { ClipPath } from './shapes/containers/ClipPath';
export { Filter } from './shapes/containers/Filter';
export { Mask } from './shapes/containers/Mask';
export { Group } from './shapes/containers/Group';
export { Animation } from './shapes/containers/Animation';
export type {
  AnimStep,
  AnimAttribute,
  AnimEasing,
  AnimTarget,
  AnimComputeContext,
  AnimationHandle,
} from './engine/types';
export type { ViewportCullMargin, VizEvent, VizEventHandler, VizDragEvent, VizDragEventHandler } from './engine/types';
export type { ShapeEventProps } from './shapes/events';
