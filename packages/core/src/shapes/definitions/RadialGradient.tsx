import type { RadialGradientData, GradientStop } from '../../engine/types';
import { useRegisterNode } from '../../context';

interface StopProps {
  offset: number;
  color: string;
  opacity?: number;
}

interface Props {
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
 * RadialGradient —— 径向渐变定义组件（纯代理）
 * 开发者声明渐变参数，渲染引擎负责实现 CanvasGradient 或 SVG <radialGradient>
 */
function RadialGradient({
  id,
  cx = 0.5, cy = 0.5, r = 0.5,
  fx, fy,
  gradientUnits = 'objectBoundingBox',
  stops,
}: Props) {
  useRegisterNode(
    id,
    () => ({
      id,
      type: 'radialGradient',
      data: {
        id,
        cx, cy, r, fx, fy,
        gradientUnits,
        stops: stops.map((s): GradientStop => ({
          offset: s.offset,
          color: s.color,
          opacity: s.opacity,
        })),
      } as RadialGradientData,
      dirty: true,
      subtreeDirty: true,
    }),
    [id, cx, cy, r, fx, fy, gradientUnits, stops],
  );

  return null;
}

export default RadialGradient;
export { RadialGradient };
