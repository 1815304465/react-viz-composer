import { useId, useEffect, useRef, useCallback } from 'react';
import {
  useViz, useVizFrame, useParentId, useAnimAttrs, applyAnimAttrs,
} from '../context';
import type { ElementData, ElementType, Transform, VizEvent } from '../engine/types';
import {
  buildShapeEvents,
  hasVizDragHandlers,
  SHAPE_EVENT_NOOP,
  VIZ_SHAPE_EVENT_PROP_NAMES,
  type ShapeEventProps,
} from './events';
import { pick } from 'lodash-es';

/* ========== Shape prop keys 常量 ========== */

/** 各形状共有属性键 */
const SHAPE_COMMON_KEYS = [
  'opacity', 'visible', 'pointerEvents', 'zIndex',
] as const;

/** 描边/阴影扩展键 */
const STROKE_EXTRA_KEYS = [
  'strokeDasharray', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY',
] as const;

/** 填充/描边基础键 */
const STROKE_STYLE_KEYS = [
  'fill', 'stroke', 'strokeWidth', 'clipPath', 'filter', 'mask',
] as const;

const RECT_DATA_KEYS = [
  'x', 'y', 'width', 'height', 'rx', 'ry',
  ...STROKE_STYLE_KEYS, ...SHAPE_COMMON_KEYS, ...STROKE_EXTRA_KEYS,
] as const;

const ELLIPSE_DATA_KEYS = [
  'cx', 'cy', 'rx', 'ry',
  ...STROKE_STYLE_KEYS, ...SHAPE_COMMON_KEYS, ...STROKE_EXTRA_KEYS,
] as const;

const LINE_DATA_KEYS = [
  'points', 'closed', 'fill',
  'stroke', 'strokeWidth', 'clipPath', 'filter', 'mask',
  ...SHAPE_COMMON_KEYS, 'strokeDasharray',
] as const;

const PATH_DATA_KEYS = [
  'd',
  ...STROKE_STYLE_KEYS, ...SHAPE_COMMON_KEYS, ...STROKE_EXTRA_KEYS,
] as const;

const TEXT_DATA_KEYS = [
  'text', 'x', 'y', 'fontSize', 'lineHeight', 'fontFamily', 'fontWeight',
  'textAlign', 'textBaseline',
  ...STROKE_STYLE_KEYS, ...SHAPE_COMMON_KEYS,
] as const;

const IMAGE_DATA_KEYS = [
  'src', 'x', 'y', 'width', 'height', 'preserveAspectRatio', 'clipPath', 'filter', 'mask',
  ...SHAPE_COMMON_KEYS,
] as const;

const GROUP_DATA_KEYS = [...SHAPE_COMMON_KEYS, 'filter', 'mask'] as const;

const GROUP_TRANSFORM_KEYS = [
  'x', 'y', 'rotation', 'scaleX', 'scaleY',
] as const;

const GROUP_TRANSFORM_DEFAULTS = {
  x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
};

/* ========== Shape props 工具 ========== */

/** 将 data 字段序列化为 effect 依赖（避免 points 等数组每帧新引用导致多余 upsert） */
function serializeDataDep(key: string, value: unknown): unknown {
  if (key === 'points' && Array.isArray(value)) {
    return value.map((p) => `${(p as { x: number; y: number }).x},${(p as { x: number; y: number }).y}`).join('|');
  }
  return value;
}

/**
 * 从 props 中拆分 id、数据属性与事件属性
 */
function resolveShapeProps<K extends string, T extends object>(
  props: T,
  dataKeys: readonly K[],
  defaults?: Partial<Record<K, unknown>>,
): { id: string | undefined; data: Record<K, unknown>; eventProps: ShapeEventProps } {
  const record = props as Record<string, unknown>;
  const id = record.id as string | undefined;
  const data = { ...defaults, ...pick(record, dataKeys) } as Record<K, unknown>;
  const eventProps = pick(record, VIZ_SHAPE_EVENT_PROP_NAMES) as ShapeEventProps;
  return { id, data, eventProps };
}

/** 生成 useEffect 依赖：数据值 + 全部事件 handler */
function shapeEffectDeps(data: Record<string, unknown>, eventProps: ShapeEventProps): unknown[] {
  return [
    ...Object.entries(data).map(([key, value]) => serializeDataDep(key, value)),
    ...VIZ_SHAPE_EVENT_PROP_NAMES.map((key) => eventProps[key as keyof ShapeEventProps]),
  ];
}

/* ========== useShapeElement hook ========== */

/**
 * useShapeElement —— 子组件注册到 SceneTree 的统一 hook
 *
 * 数据流：
 *  1. mount：构造 SceneNode → register(parentId, node)
 *  2. props 变化：update(id, { data, events })
 *  3. unmount：unregister(id)
 *
 * 变换合并移交给渲染器：
 *  - 自身 transform 写在 data.transform
 *  - 父级变换在渲染时通过 worldMatrix 矩阵乘法合成
 *
 * Animation 仍然通过 useAnimAttrs 注入瞬时形状属性（width/opacity 等）
 * —— 它会被合并进 data 后通过 update 推到 SceneTree
 */
function useShapeElement<TData extends ElementData>(
  type: ElementType,
  propId: string | undefined,
  data: TData,
  eventProps: ShapeEventProps,
): string {
  const { register, unregister, update } = useViz();
  const { registerDrag } = useVizFrame();
  const parentId = useParentId();
  const animAttrs = useAnimAttrs();
  const autoId = useId();
  const id = propId ?? autoId;
  const isFirstUpdateRef = useRef(true);

  const buildData = useCallback((): TData => {
    if (!animAttrs) return data;
    return applyAnimAttrs(data, animAttrs) as TData;
  }, [data, animAttrs]);

  const handleMouseDown = useCallback((evt: VizEvent) => {
    eventProps.onMouseDown?.(evt);
    eventProps.onPointerDown?.(evt);
    eventProps.onTouchStart?.(evt);
    if (hasVizDragHandlers(eventProps)) {
      registerDrag(id, eventProps.onDrag ?? SHAPE_EVENT_NOOP, eventProps.onDragEnd ?? SHAPE_EVENT_NOOP, evt.originalEvent as MouseEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, registerDrag, eventProps.onDrag, eventProps.onDragEnd, eventProps.onDragStart, eventProps.onMouseDown, eventProps.onPointerDown, eventProps.onTouchStart]);

  // 注册 + 卸载
  useEffect(() => {
    const finalData = buildData();
    const events = buildShapeEvents(eventProps, handleMouseDown);
    register(parentId, { id, type, data: finalData, events, dirty: true, subtreeDirty: true });
    isFirstUpdateRef.current = true;
    return () => unregister(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type, parentId]);

  // props 变化时增量更新
  const effectDeps = shapeEffectDeps(data as Record<string, unknown>, eventProps);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isFirstUpdateRef.current) { isFirstUpdateRef.current = false; return; }
    const finalData = buildData();
    const events = buildShapeEvents(eventProps, handleMouseDown);
    update(id, { data: finalData, events });
  }, [id, update, handleMouseDown, buildData, ...effectDeps]);

  return id;
}

export {
  RECT_DATA_KEYS,
  ELLIPSE_DATA_KEYS,
  LINE_DATA_KEYS,
  PATH_DATA_KEYS,
  TEXT_DATA_KEYS,
  IMAGE_DATA_KEYS,
  GROUP_DATA_KEYS,
  GROUP_TRANSFORM_KEYS,
  GROUP_TRANSFORM_DEFAULTS,
  resolveShapeProps,
  shapeEffectDeps,
  useShapeElement,
};
export type { Transform };
