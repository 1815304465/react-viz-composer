import { isValidElement, type ReactElement } from 'react';
import type { EllipseData, PathData, RectData } from '../../engine/types';

/** 可作为裁剪/遮罩形状的几何类型 */
export type ClipShapeType = 'rect' | 'ellipse' | 'path';

/** 从声明式形状元素解析出的裁剪/遮罩数据 */
export interface ResolvedClipShape {
  shapeType: ClipShapeType;
  shapeData: RectData | EllipseData | PathData;
}

/**
 * 从 `<Rect>` / `<Ellipse>` / `<Path>` 元素解析 shapeType + shapeData
 * @param element 形状 ReactElement
 */
export function resolveClipShapeElement(element: ReactElement): ResolvedClipShape {
  if (!isValidElement(element)) {
    throw new Error('clip/mask must be a React element');
  }
  const p = element.props as Record<string, unknown>;

  if (typeof p.d === 'string') {
    return {
      shapeType: 'path',
      shapeData: {
        d: p.d,
        fill: p.fill as string | undefined,
        stroke: p.stroke as string | undefined,
        strokeWidth: p.strokeWidth as number | undefined,
      },
    };
  }

  if (typeof p.width === 'number' && typeof p.height === 'number') {
    return {
      shapeType: 'rect',
      shapeData: {
        x: Number(p.x ?? 0),
        y: Number(p.y ?? 0),
        width: p.width,
        height: p.height,
        rx: p.rx as number | undefined,
        ry: p.ry as number | undefined,
      },
    };
  }

  if (typeof p.cx === 'number' && typeof p.cy === 'number') {
    return {
      shapeType: 'ellipse',
      shapeData: {
        cx: p.cx,
        cy: p.cy,
        rx: Number(p.rx ?? 0),
        ry: Number(p.ry ?? 0),
      },
    };
  }

  throw new Error('clip/mask must be a <Rect>, <Ellipse>, or <Path> element');
}
