import type { PointsData } from '../../engine/types';
import type { ShapeEventProps } from '../events';
import { resolveShapeProps, POINTS_DATA_KEYS, useShapeElement } from '../register';

interface Props extends PointsData, ShapeEventProps {
  id?: string;
}

/**
 * Points —— 批量圆点形状（纯代理）
 * 单 SceneTree 节点渲染多个椭圆，适用于大规模散点
 */
function Points(props: Props) {
  const { id, data, eventProps } = resolveShapeProps(props, POINTS_DATA_KEYS);
  useShapeElement('points', id, data as PointsData, eventProps);
  return null;
}

export default Points;
export { Points };
