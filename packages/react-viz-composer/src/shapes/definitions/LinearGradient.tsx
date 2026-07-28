import type { LinearGradientData, GradientStop } from '../../engine/types';
import { useRegisterNode } from '../../context';

interface StopProps {
  offset: number;
  color: string;
  opacity?: number;
}

interface Props {
  id: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  gradientUnits?: string;
  stops: StopProps[];
}

/**
 * LinearGradient —— 线性渐变定义
 *
 * 通过 useRegisterNode 声明式注册到 SceneTree（挂在 defs 容器里）。
 * 其他形状通过 fill="url(#id)" 引用它。
 */
function LinearGradient({
  id,
  x1 = 0, y1 = 0, x2 = 1, y2 = 0,
  gradientUnits = 'objectBoundingBox',
  stops,
}: Props) {
  useRegisterNode(
    id,
    () => ({
      id,
      type: 'linearGradient',
      data: {
        id,
        x1, y1, x2, y2,
        gradientUnits,
        stops: stops.map((s): GradientStop => ({
          offset: s.offset,
          color: s.color,
          opacity: s.opacity,
        })),
      } as LinearGradientData,
      dirty: true,
      subtreeDirty: true,
    }),
    [id, x1, y1, x2, y2, gradientUnits, stops],
  );

  return null;
}

export default LinearGradient;
export { LinearGradient };
