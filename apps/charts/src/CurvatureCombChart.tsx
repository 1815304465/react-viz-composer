/**
 * CurvatureCombChart —— 曲率梳图（翼型法向梳）
 *
 * 内侧实线翼型轮廓 + 外侧虚线包络，梳齿沿轮廓法向向外伸出并按数值上色；
 * 入场：内外边界曲线沿路径绘完后，梳齿再沿轮廓顺序逐根从内侧延展到外侧。
 */

import { Animation, Path, Line } from '@react-viz-composer/core';
import {
  Axis,
  Grid,
} from '@react-viz-composer/kit';
import {
  ChartFrame,
  scaleLinear,
  useChartSize,
} from './local';

/** 翼型轮廓采样点（含映射颜色的数值） */
export interface CurvatureCombPoint {
  x: number;
  y: number;
  /** 映射梳齿长度与颜色的数值（如 SPRE） */
  value: number;
}

interface Props {
  data?: CurvatureCombPoint[];
  /** 是否播放入场动画，默认 true */
  animate?: boolean;
  /** 梳齿长度相对缩放（相对数值归一化后的屏幕像素） */
  toothScale?: number;
  /** 内侧轮廓描边色 */
  curveColor?: string;
}

/** 屏幕空间梳齿 */
interface CombTooth {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
}

/** 蓝 → 青 → 绿 → 黄 → 橙 → 红（贴近参考图色带） */
const VALUE_RAMP = [
  '#2166ac',
  '#4393c3',
  '#92c5de',
  '#d1e5f0',
  '#f7f7f7',
  '#fddbc7',
  '#f4a582',
  '#d6604d',
  '#b2182b',
] as const;

const CURVE_DURATION = 1400;
const TOOTH_DURATION = 280;
const TOOTH_STAGGER = 18;

/**
 * 将数值映射到连续色带
 * @param value 原始值
 * @param min 最小值
 * @param max 最大值
 */
function valueToColor(value: number, min: number, max: number): string {
  const span = max - min || 1;
  const t = Math.max(0, Math.min(1, (value - min) / span));
  const scaled = t * (VALUE_RAMP.length - 1);
  return VALUE_RAMP[Math.round(scaled)] ?? VALUE_RAMP[VALUE_RAMP.length - 1];
}

/**
 * 按进度截取折线路径
 * @param pts 完整点列
 * @param progress 0→1
 */
function buildCurveD(
  pts: Array<{ x: number; y: number }>,
  progress: number,
): string {
  if (pts.length === 0) return '';
  if (progress <= 0) return `M ${pts[0].x} ${pts[0].y}`;

  const total = pts.length - 1;
  const exact = Math.min(1, progress) * total;
  const count = Math.floor(exact);
  const frac = exact - count;

  const parts: string[] = [];
  for (let i = 0; i <= count && i < pts.length; i++) {
    parts.push(`${i === 0 ? 'M' : 'L'} ${pts[i].x} ${pts[i].y}`);
  }

  if (count < total && frac > 0) {
    const a = pts[count];
    const b = pts[count + 1];
    parts.push(
      `L ${a.x + (b.x - a.x) * frac} ${a.y + (b.y - a.y) * frac}`,
    );
  }

  return parts.join(' ');
}

/**
 * NACA 4 位翼型厚度分布（闭合时上下对称厚度）
 * @param x 弦向归一化坐标 0→1
 * @param thickness 最大厚度比（如 0.12）
 */
function nacaThickness(x: number, thickness: number): number {
  const xc = Math.max(0, Math.min(1, x));
  return (
    5 *
    thickness *
    (0.2969 * Math.sqrt(xc) -
      0.1260 * xc -
      0.3516 * xc * xc +
      0.2843 * xc * xc * xc -
      0.1015 * xc * xc * xc * xc)
  );
}

/**
 * NACA 凸轮线
 * @param x 弦向归一化
 * @param m 最大弯度
 * @param p 最大弯度位置
 */
function nacaCamber(x: number, m: number, p: number): number {
  if (m <= 0) return 0;
  if (x < p) return (m / (p * p)) * (2 * p * x - x * x);
  return (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
}

/**
 * 生成闭合翼型轮廓 + SPRE 风格数值（前缘高、尾缘低）
 * @param chord 弦长（数据坐标）
 * @param samplesPerSide 单侧采样数
 */
function defaultAirfoilData(
  chord = 0.08,
  samplesPerSide = 90,
): CurvatureCombPoint[] {
  const m = 0.02;
  const p = 0.4;
  const thick = 0.12;
  const leX = 0;
  const leY = 0.025;

  const upper: CurvatureCombPoint[] = [];
  const lower: CurvatureCombPoint[] = [];

  for (let i = 0; i <= samplesPerSide; i++) {
    const t = i / samplesPerSide;
    // 前缘加密
    const xNorm = t * t;
    const yt = nacaThickness(xNorm, thick);
    const yc = nacaCamber(xNorm, m, p);
    const x = leX + xNorm * chord;
    const yu = leY + (yc + yt) * chord;
    const yl = leY + (yc - yt) * chord;

    const leBoost = 1.05e5 * Math.exp(-xNorm * 9);
    const upperMid = 5.5e4 * Math.sin(Math.PI * Math.min(1, xNorm * 1.1));
    const lowerMid = 3.2e4 * Math.sin(Math.PI * Math.min(1, xNorm * 1.15));
    const teDip = -1.5e4 * xNorm * xNorm;

    upper.push({
      x,
      y: yu,
      value: 1.35e6 + leBoost + upperMid + teDip,
    });
    lower.push({
      x,
      y: yl,
      value: 1.35e6 + leBoost * 0.95 + lowerMid + teDip * 0.8,
    });
  }

  // 路径：尾缘上表面 → 前缘 → 下表面回尾缘（自上表面起沿轮廓走）
  const closed: CurvatureCombPoint[] = [
    ...upper.slice().reverse(),
    ...lower.slice(1),
  ];
  return closed;
}

/**
 * 计算指向外侧的单位法向
 * @param prev 前一点
 * @param curr 当前点
 * @param next 后一点
 * @param cx 轮廓质心 x
 * @param cy 轮廓质心 y
 */
function outwardNormal(
  prev: { x: number; y: number },
  curr: { x: number; y: number },
  next: { x: number; y: number },
  cx: number,
  cy: number,
): { nx: number; ny: number } {
  const tx = next.x - prev.x;
  const ty = next.y - prev.y;
  const len = Math.hypot(tx, ty) || 1;
  let nx = -ty / len;
  let ny = tx / len;
  const toCentrX = cx - curr.x;
  const toCentrY = cy - curr.y;
  if (nx * toCentrX + ny * toCentrY > 0) {
    nx = -nx;
    ny = -ny;
  }
  return { nx, ny };
}

/**
 * 曲率梳图
 */
export function CurvatureCombChart(props: Props) {
  return (
    <ChartFrame>
      <CurvatureCombChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props 图表 props */
function CurvatureCombChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const {
    data,
    animate = true,
    toothScale = 55,
    curveColor = '#1d39c4',
  } = props;

  const profile = data ?? defaultAirfoilData();
  const n = profile.length;
  if (n < 3) {
    return (
      <>
        <Axis scale={scaleLinear([0, 1], [0, plotWidth])} orient="bottom" length={plotWidth} crossAt={plotHeight} />
        <Axis scale={scaleLinear([0, 1], [plotHeight, 0])} orient="left" length={plotHeight} crossAt={0} />
      </>
    );
  }

  const values = profile.map((p) => p.value);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);

  let cx = 0;
  let cy = 0;
  for (const p of profile) {
    cx += p.x;
    cy += p.y;
  }
  cx /= n;
  cy /= n;

  /** 数据坐标下的内外点对 */
  const pairs = profile.map((p, i) => {
    const prev = profile[(i - 1 + n) % n];
    const next = profile[(i + 1) % n];
    const { nx, ny } = outwardNormal(prev, p, next, cx, cy);
    const t = Math.max(0, Math.min(1, (p.value - vMin) / (vMax - vMin || 1)));
    // 数值越高梳齿越长；保证最短也可见
    const len = (0.18 + 0.82 * t) * toothScale * 0.001;
    return {
      inner: p,
      outer: { x: p.x + nx * len, y: p.y + ny * len },
      value: p.value,
    };
  });

  const allX = pairs.flatMap((s) => [s.inner.x, s.outer.x]);
  const allY = pairs.flatMap((s) => [s.inner.y, s.outer.y]);
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const padX = (xMax - xMin || 1) * 0.12;
  const padY = (yMax - yMin || 1) * 0.18;

  const xScale = scaleLinear([xMin - padX, xMax + padX], [28, plotWidth - 10]);
  const yScale = scaleLinear([yMin - padY, yMax + padY], [plotHeight - 22, 18]);

  const innerPts = pairs.map((s) => ({
    x: xScale(s.inner.x),
    y: yScale(s.inner.y),
  }));
  const outerPts = pairs.map((s) => ({
    x: xScale(s.outer.x),
    y: yScale(s.outer.y),
  }));

  // 闭合路径多写回起点
  const innerClosed = [...innerPts, innerPts[0]];
  const outerClosed = [...outerPts, outerPts[0]];

  const teeth: CombTooth[] = pairs.map((s, i) => ({
    id: `tooth-${i}`,
    x0: innerPts[i].x,
    y0: innerPts[i].y,
    x1: outerPts[i].x,
    y1: outerPts[i].y,
    color: valueToColor(s.value, vMin, vMax),
  }));

  // 略稀疏采样，避免过密；仍保持闭合包络完整
  const toothStep = Math.max(1, Math.floor(teeth.length / 120));
  const visibleTeeth = teeth.filter((_, i) => i % toothStep === 0);
  const toothIds = visibleTeeth.map((t) => t.id);

  const innerFinalD = buildCurveD(innerClosed, 1);
  const outerFinalD = buildCurveD(outerClosed, 1);
  const innerStartD = `M ${innerPts[0].x} ${innerPts[0].y}`;
  const outerStartD = `M ${outerPts[0].x} ${outerPts[0].y}`;

  const playbook = animate
    ? [
        {
          group: 0,
          duration: CURVE_DURATION,
          easing: 'easeOutCubic' as const,
          targets: 'inner-curve',
          compute: ({ progress }: { progress: number }) => ({
            d: buildCurveD(innerClosed, progress),
          }),
        },
        {
          group: 0,
          duration: CURVE_DURATION,
          easing: 'easeOutCubic' as const,
          targets: 'outer-curve',
          compute: ({ progress }: { progress: number }) => ({
            d: buildCurveD(outerClosed, progress),
          }),
        },
        {
          group: 1,
          duration: TOOTH_DURATION,
          stagger: TOOTH_STAGGER,
          easing: 'easeOutCubic' as const,
          targets: toothIds,
          compute: ({
            progress,
            index,
          }: {
            progress: number;
            index: number;
          }) => {
            const tooth = visibleTeeth[index];
            if (!tooth) return {};
            return {
              points: [
                { x: tooth.x0, y: tooth.y0 },
                {
                  x: tooth.x0 + (tooth.x1 - tooth.x0) * progress,
                  y: tooth.y0 + (tooth.y1 - tooth.y0) * progress,
                },
              ],
            };
          },
        },
      ]
    : [];

  return (
    <>
      <Grid scale={xScale} orient="x" length={plotHeight} />
      <Grid scale={yScale} orient="y" length={plotWidth} />
      <Animation playbook={playbook} autoPlay={animate}>
        {visibleTeeth.map((tooth) => (
          <Line
            key={tooth.id}
            id={tooth.id}
            points={
              animate
                ? [
                    { x: tooth.x0, y: tooth.y0 },
                    { x: tooth.x0, y: tooth.y0 },
                  ]
                : [
                    { x: tooth.x0, y: tooth.y0 },
                    { x: tooth.x1, y: tooth.y1 },
                  ]
            }
            stroke={tooth.color}
            strokeWidth={0.9}
          />
        ))}
        <Path
          id="inner-curve"
          d={animate ? innerStartD : innerFinalD}
          fill="none"
          stroke={curveColor}
          strokeWidth={1.8}
        />
        <Path
          id="outer-curve"
          d={animate ? outerStartD : outerFinalD}
          fill="none"
          stroke="#595959"
          strokeWidth={1}
          strokeDasharray="3 2.5"
        />
      </Animation>
      <Axis scale={xScale} orient="bottom" length={plotWidth} crossAt={plotHeight} />
      <Axis scale={yScale} orient="left" length={plotHeight} crossAt={0} />
    </>
  );
}

export default CurvatureCombChart;
