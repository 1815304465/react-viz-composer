import type { TextData } from '../../engine/types';
import type { ShapeEventProps } from '../events';
import { resolveShapeProps, TEXT_DATA_KEYS, useShapeElement } from '../register';

interface Props extends Omit<TextData, 'text'>, ShapeEventProps {
  id?: string;
  text: string;
}

/**
 * Text —— 文本形状组件（纯代理）
 * 不渲染任何 DOM，只将 props 拆解为 JSON 投递到 SceneTree
 */
function Text(props: Props) {
  const { id, data, eventProps } = resolveShapeProps(props, TEXT_DATA_KEYS);
  useShapeElement('text', id, data as TextData, eventProps);
  return null;
}

export default Text;
export { Text };
