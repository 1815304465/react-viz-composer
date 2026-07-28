import type { PathData } from '../../engine/types';
import type { ShapeEventProps } from '../events';
import { resolveShapeProps, PATH_DATA_KEYS, useShapeElement } from '../register';

interface Props extends PathData, ShapeEventProps {
  id?: string;
}

/**
 * Path —— SVG 路径形状组件（纯代理）
 * 不渲染任何 DOM，只将 props 拆解为 JSON 投递到 SceneTree
 */
function Path(props: Props) {
  const { id, data, eventProps } = resolveShapeProps(props, PATH_DATA_KEYS);
  useShapeElement('path', id, data as PathData, eventProps);
  return null;
}

export default Path;
export { Path };
