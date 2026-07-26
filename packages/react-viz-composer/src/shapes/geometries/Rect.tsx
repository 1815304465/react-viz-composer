import type { RectData } from '../../engine/types';
import type { ShapeEventProps } from '../events';
import { resolveShapeProps, RECT_DATA_KEYS, useShapeElement } from '../register';

interface Props extends RectData, ShapeEventProps {
  id?: string;
}

/**
 * Rect —— 矩形形状组件（纯代理）
 * 不渲染任何 DOM，只将 props 拆解为 JSON 投递到 SceneTree
 */
function Rect(props: Props) {
  const { id, data, eventProps } = resolveShapeProps(props, RECT_DATA_KEYS);
  useShapeElement('rect', id, data as RectData, eventProps);
  return null;
}

export default Rect;
export { Rect };
