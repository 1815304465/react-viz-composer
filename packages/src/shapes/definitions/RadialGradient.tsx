import type { RadialGradientData, GradientStop } from '../../engine/types';
import { useShapeElement } from '../register';

interface StopProps {
  offset: number;
  color: string;
  opacity?: number;
}

interface Props {
  /** 渐变 id，供 fill="url(#id)" 引用 */
  id: string;
  cx?: number;
  cy?: number;
  r?: number;
  fx?: number;
  fy?: number;
  gradientUnits?: string;
  stops: StopProps[];
}

/**
 * RadialGradient —— 径向渐变定义（纯代理）
 *
 * 经 useShapeElement 注册到 SceneTree；其他形状通过 fill="url(#id)" 引用。
 */
function RadialGradient(props: Props) {
  const {
    id,
    cx = 0.5,
    cy = 0.5,
    r = 0.5,
    fx,
    fy,
    gradientUnits = 'objectBoundingBox',
    stops,
  } = props;

  const data: RadialGradientData = {
    id,
    cx,
    cy,
    r,
    fx,
    fy,
    gradientUnits,
    stops: stops.map((s): GradientStop => ({
      offset: s.offset,
      color: s.color,
      opacity: s.opacity,
    })),
  };

  useShapeElement('radialGradient', id, data, {});
  return null;
}

export default RadialGradient;
export { RadialGradient };
