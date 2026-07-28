import type { EllipseData } from '../../engine/types';
import type { ShapeEventProps } from '../events';
import { resolveShapeProps, ELLIPSE_DATA_KEYS, useShapeElement } from '../register';

interface Props extends EllipseData, ShapeEventProps {
  id?: string;
}

/**
 * Ellipse —— 椭圆形状组件（纯代理）
 * 不渲染任何 DOM，只将 props 拆解为 JSON 投递到 SceneTree
 */
function Ellipse(props: Props) {
  const { id, data, eventProps } = resolveShapeProps(props, ELLIPSE_DATA_KEYS);
  useShapeElement('ellipse', id, data as EllipseData, eventProps);
  return null;
}

export default Ellipse;
export { Ellipse };
