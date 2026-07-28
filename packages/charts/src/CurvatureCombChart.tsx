/**
 * CurvatureCombChart —— 曲率梳图
 *
 * 在曲线采样点沿法线方向绘制曲率梳齿，可视化曲线曲率变化。
 */

import { Fragment } from 'react';
import { Path, Line, Ellipse } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, scaleLinear, Axis, Grid, SEMANTIC_6 } from '@react-viz-composer/components';

interface CurvePoint {
  x: number;
  y: number;
}

interface Props {
  data?: CurvePoint[];
  toothScale?: number;
  sampleRate?: number;
}

interface CombTooth {
  x: number;
  y: number;
  tx: number;
  ty: number;
  curvature: number;
}

export function CurvatureCombChart(props: Props) {
  const { data, toothScale = 30, sampleRate = 4 } = props;

  const points: CurvePoint[] = data ?? defaultCurveData();

  // 计算 x/y 范围
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const padX = (xMax - xMin || 1) * 0.1;
  const padY = (yMax - yMin || 1) * 0.1;
  const xScale = scaleLinear([xMin - padX, xMax + padX], [30, PLOT_WIDTH - 10]);
  const yScale = scaleLinear([yMin - padY, yMax + padY], [PLOT_HEIGHT - 20, 20]);

  // 在曲线上等距采样并计算曲率梳齿
  const combTeeth: CombTooth[] = [];
  for (let i = 0; i < points.length - 1; i += sampleRate) {
    const idx = Math.min(i, points.length - 1);
    const prev = points[Math.max(idx - sampleRate, 0)];
    const curr = points[idx];
    const next = points[Math.min(idx + sampleRate, points.length - 1)];

    const tx1 = curr.x - prev.x;
    const ty1 = curr.y - prev.y;
    const len1 = Math.sqrt(tx1 * tx1 + ty1 * ty1) || 1;

    const tx2 = next.x - curr.x;
    const ty2 = next.y - curr.y;
    const len2 = Math.sqrt(tx2 * tx2 + ty2 * ty2) || 1;

    // 平均切向量
    const tanX = tx1 / len1 + tx2 / len2;
    const tanY = ty1 / len1 + ty2 / len2;
    const tanLen = Math.sqrt(tanX * tanX + tanY * tanY) || 1;

    // 法向量（左转 90°）
    const normX = -tanY / tanLen;
    const normY = tanX / tanLen;

    // 曲率（角度变化 / 弧长）
    const angle1 = Math.atan2(ty1, tx1);
    const angle2 = Math.atan2(ty2, tx2);
    let dAngle = angle2 - angle1;
    if (dAngle > Math.PI) dAngle -= 2 * Math.PI;
    if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
    const arcLen = (len1 + len2) / 2;
    const curvature = arcLen > 0 ? Math.abs(dAngle) / arcLen : 0;

    const toothLen = Math.min(curvature * toothScale * 2, 60);
    combTeeth.push({
      x: curr.x,
      y: curr.y,
      tx: curr.x + normX * toothLen,
      ty: curr.y + normY * toothLen,
      curvature,
    });
  }

  // 基曲线 Path
  const curveD = points
    .map((p, i) => {
      const sx = xScale(p.x);
      const sy = yScale(p.y);
      return i === 0 ? `M ${sx} ${sy}` : `L ${sx} ${sy}`;
    })
    .join(' ');

  return (
    <ChartFrame entryDuration={1000}>
      {(progress) => (
        <>
          <Grid scale={xScale} orient="x" />
          <Grid scale={yScale} orient="y" />

          {/* 曲率梳齿 */}
          {combTeeth.map((tooth, i) => {
            const aw = animValue(1, progress);
            return (
              <Fragment key={i}>
                <Line
                  points={[
                    { x: xScale(tooth.x), y: yScale(tooth.y) },
                    {
                      x: xScale(tooth.x) + (xScale(tooth.tx) - xScale(tooth.x)) * aw,
                      y: yScale(tooth.y) + (yScale(tooth.ty) - yScale(tooth.y)) * aw,
                    },
                  ]}
                  stroke={SEMANTIC_6[3]}
                  strokeWidth={0.8}
                />
                {progress > 0.4 && (
                  <Ellipse
                    cx={xScale(tooth.tx)}
                    cy={yScale(tooth.ty)}
                    rx={2} ry={2}
                    fill={SEMANTIC_6[3]}
                    stroke="none"
                  />
                )}
              </Fragment>
            );
          })}

          {/* 基曲线 */}
          <Path d={curveD} fill="none" stroke={SEMANTIC_6[0]} strokeWidth={2} />

          {/* 采样点 */}
          {combTeeth.map((tooth, i) => (
            <Ellipse
              key={`sample-${i}`}
              cx={xScale(tooth.x)}
              cy={yScale(tooth.y)}
              rx={3} ry={3}
              fill="#fff"
              stroke={SEMANTIC_6[0]}
              strokeWidth={1.5}
            />
          ))}

          <Axis scale={xScale} orient="bottom" />
          <Axis scale={yScale} orient="left" />
        </>
      )}
    </ChartFrame>
  );
}

function defaultCurveData(): CurvePoint[] {
  const pts: CurvePoint[] = [];
  for (let i = 0; i < 80; i++) {
    const t = i / 79;
    const x = 20 + t * 80;
    const y = 50 + 30 * Math.sin(t * Math.PI * 3) * Math.exp(-t * 2);
    pts.push({ x, y });
  }
  return pts;
}

export default CurvatureCombChart;
