import type { LineData } from '../../engine/types';
import type { ShapeEventProps } from '../events';
import { resolveShapeProps, LINE_DATA_KEYS, useShapeElement } from '../register';

interface Props extends LineData, ShapeEventProps {
  id?: string;
}

/**
 * Line —— 折线/多边形形状组件（纯代理）
 * 不渲染任何 DOM，只将 props 拆解为 JSON 投递到 SceneTree
 */
function Line(props: Props) {
  const { id, data, eventProps } = resolveShapeProps(props, LINE_DATA_KEYS);
  useShapeElement('line', id, data as LineData, eventProps);
  return null;
}

export default Line;
export { Line };
