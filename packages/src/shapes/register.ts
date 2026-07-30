import { useId, useLayoutEffect, useRef, useCallback } from 'react';
import { useViz, useVizFrame, useParentId } from '../context';
import type { ElementData, ElementType, Transform, VizEvent } from '../engine/types';
import {
  buildShapeEvents,
  hasVizDragHandlers,
  SHAPE_EVENT_NOOP,
  VIZ_SHAPE_EVENT_PROP_NAMES,
  type ShapeEventProps,
} from './events';
import { pick } from '../utils/object';

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
  'fill', 'stroke', 'strokeWidth',
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
  'stroke', 'strokeWidth',
  ...SHAPE_COMMON_KEYS, ...STROKE_EXTRA_KEYS,
] as const;

const PATH_DATA_KEYS = [
  'd',
  ...STROKE_STYLE_KEYS, ...SHAPE_COMMON_KEYS, ...STROKE_EXTRA_KEYS,
] as const;

const TEXT_DATA_KEYS = [
  'text', 'x', 'y', 'fontSize', 'lineHeight', 'fontFamily', 'fontWeight',
  'textAlign', 'textBaseline',
  ...STROKE_STYLE_KEYS, ...SHAPE_COMMON_KEYS, ...STROKE_EXTRA_KEYS,
] as const;

const IMAGE_DATA_KEYS = [
  'src', 'x', 'y', 'width', 'height', 'preserveAspectRatio',
  ...SHAPE_COMMON_KEYS,
] as const;

const POINTS_DATA_KEYS = [
  'cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'strokeWidth',
  ...SHAPE_COMMON_KEYS, ...STROKE_EXTRA_KEYS,
] as const;

const GROUP_DATA_KEYS = [...SHAPE_COMMON_KEYS] as const;

const GROUP_TRANSFORM_KEYS = [
  'x', 'y', 'rotation', 'scaleX', 'scaleY',
] as const;

const GROUP_TRANSFORM_DEFAULTS = {
  x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
};

/** 空事件 props（定义类 / Animation 容器无交互时使用） */
const EMPTY_EVENT_PROPS: ShapeEventProps = {};

/* ========== Shape props 工具 ========== */

/** 将 data 字段序列化为 effect 依赖（避免 points 等数组每帧新引用导致多余 upsert） */
function serializeDataDep(key: string, value: unknown): unknown {
  if (key === 'points' && Array.isArray(value)) {
    return value.map((p) => `${(p as { x: number; y: number }).x},${(p as { x: number; y: number }).y}`).join('|');
  }
  if ((key === 'cx' || key === 'cy') && Array.isArray(value)) {
    return value.join(',');
  }
  if (Array.isArray(value) && (key === 'rx' || key === 'ry' || key === 'fill' || key === 'stroke' || key === 'strokeWidth')) {
    return value.join(',');
  }
  if (key === 'effects' && Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (key === 'stops' && Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if ((key === 'shapeData' || key === 'transform') && value && typeof value === 'object') {
    return JSON.stringify(value);
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
  const data = Object.fromEntries(
    dataKeys.map((key) => [key, record[key] ?? defaults?.[key] ?? undefined]),
  ) as Record<K, unknown>;
  const eventProps = pick(record, VIZ_SHAPE_EVENT_PROP_NAMES) as ShapeEventProps;
  return { id, data, eventProps };
}

/** 将 data + events 序列化为稳定的 effect 依赖键（长度固定，避免 spread 变长数组） */
function shapeEffectDepKey(data: Record<string, unknown>, eventProps: ShapeEventProps): string {
  const dataPart = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}\x1f${JSON.stringify(serializeDataDep(key, value))}`)
    .join('\x1e');
  const eventPart = VIZ_SHAPE_EVENT_PROP_NAMES
    .map((key) => String(eventProps[key as keyof ShapeEventProps] ?? ''))
    .join('\x1f');
  return `${dataPart}\x1d${eventPart}`;
}

/* ========== useShapeElement hook ========== */

/**
 * useShapeElement —— 所有形状 / 容器 / 定义节点注册到 SceneTree 的统一 hook
 *
 * 数据流：
 *  1. mount：构造 SceneNode → register(parentId, node)
 *  2. props 变化：update(id, { data, events })
 *  3. unmount：unregister(id)
 *
 * @param type 元素类型
 * @param propId 外部指定 id；省略则自动生成
 * @param data 节点 data
 * @param eventProps 事件 props；定义类可传空对象
 */
function useShapeElement<TData extends ElementData>(
  type: ElementType,
  propId: string | undefined,
  data: TData,
  eventProps: ShapeEventProps = EMPTY_EVENT_PROPS,
): string {
  const { register, unregister, update } = useViz();
  const { registerDrag } = useVizFrame();
  const parentId = useParentId();
  const autoId = useId();
  const id = propId ?? autoId;
  const isFirstUpdateRef = useRef(true);

  const handleMouseDown = useCallback((evt: VizEvent) => {
    eventProps.onMouseDown?.(evt);
    eventProps.onPointerDown?.(evt);
    eventProps.onTouchStart?.(evt);
    if (hasVizDragHandlers(eventProps)) {
      registerDrag(id, eventProps.onDrag ?? SHAPE_EVENT_NOOP, eventProps.onDragEnd ?? SHAPE_EVENT_NOOP, evt.originalEvent as MouseEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, registerDrag, eventProps.onDrag, eventProps.onDragEnd, eventProps.onDragStart, eventProps.onMouseDown, eventProps.onPointerDown, eventProps.onTouchStart]);

  // 注册 + 卸载（useLayoutEffect：paint 前入树，供 Animation 首帧写入 from）
  useLayoutEffect(() => {
    const events = buildShapeEvents(eventProps, handleMouseDown);
    register(parentId, { id, type, data, events, dirty: true, subtreeDirty: true });
    isFirstUpdateRef.current = true;
    return () => unregister(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type, parentId]);

  // props 变化时增量更新（只依赖序列化后的 dataDepKey，避免每渲染新 data 引用打断动画）
  const dataDepKey = shapeEffectDepKey(data as Record<string, unknown>, eventProps);

  useLayoutEffect(() => {
    if (isFirstUpdateRef.current) { isFirstUpdateRef.current = false; return; }
    const events = buildShapeEvents(eventProps, handleMouseDown);
    update(id, { data, events });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- data/eventProps 由 dataDepKey 表达
  }, [id, update, handleMouseDown, dataDepKey]);

  return id;
}

export {
  RECT_DATA_KEYS,
  ELLIPSE_DATA_KEYS,
  LINE_DATA_KEYS,
  PATH_DATA_KEYS,
  TEXT_DATA_KEYS,
  IMAGE_DATA_KEYS,
  POINTS_DATA_KEYS,
  GROUP_DATA_KEYS,
  GROUP_TRANSFORM_KEYS,
  GROUP_TRANSFORM_DEFAULTS,
  EMPTY_EVENT_PROPS,
  resolveShapeProps,
  shapeEffectDepKey,
  useShapeElement,
};
export type { Transform };
