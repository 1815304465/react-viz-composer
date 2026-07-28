/**
 * RoseChart —— 南丁格尔玫瑰图（极区图）
 *
 * 类似饼图但半径编码数值大小（等角度、不等半径的扇形）。
 */

import { Path, Text } from '@react-viz-composer/core';
import { ChartFrame, PLOT_WIDTH, PLOT_HEIGHT, animValue, useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps, CATEGORY_12 } from '@react-viz-composer/components';

interface RoseItem {
  name: string;
  value: number;
}

interface Props extends ChartItemHoverProps<RoseItem> {
  data?: RoseItem[];
}

export function RoseChart(props: Props) {
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (d: RoseItem) => d.name,
  );

  const slices: RoseItem[] = data ?? [
    { name: '星期一', value: 40 },
    { name: '星期二', value: 55 },
    { name: '星期三', value: 70 },
    { name: '星期四', value: 45 },
    { name: '星期五', value: 60 },
    { name: '星期六', value: 80 },
    { name: '星期日', value: 35 },
    { name: '平均值', value: 50 },
  ];

  const cx = PLOT_WIDTH / 2;
  const cy = PLOT_HEIGHT / 2;
  const maxR = Math.min(cx, cy) - 10;
  const n = slices.length;
  const maxVal = Math.max(...slices.map((s) => s.value));
  const angleStep = (Math.PI * 2) / n;
  const startAngleOffset = -Math.PI / 2;

  return (
    <ChartFrame entryDuration={900}>
      {(progress) => (
        <>
          {slices.map((s, i) => {
            const ratio = animValue(s.value, progress) / maxVal;
            const r = maxR * ratio;
            const startAngle = startAngleOffset + i * angleStep;
            const endAngle = startAngleOffset + (i + 1) * angleStep * progress;
            if (endAngle <= startAngle || r <= 0) return null;

            const color = CATEGORY_12[i % CATEGORY_12.length];
            const hovered = isHovering(s.name);

            // 用多个点近似弧线
            const segs = 20;
            const points: { x: number; y: number }[] = [];
            for (let j = 0; j <= segs; j++) {
              const a = startAngle + (j / segs) * (endAngle - startAngle);
              points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
            }

            // 构建 Path：从圆心出发 → 弧线 → 回到圆心
            const dParts = [`M ${cx} ${cy}`];
            dParts.push(`L ${points[0].x} ${points[0].y}`);
            for (let j = 1; j < points.length; j++) {
              dParts.push(`L ${points[j].x} ${points[j].y}`);
            }
            dParts.push('Z');
            const d = dParts.join(' ');

            return (
              <Path
                key={s.name}
                d={d}
                fill={color}
                stroke="#fff"
                strokeWidth={hoverStrokeWidth(1, hovered)}
                {...bindHover(s)}
              />
            );
          })}

          {slices.map((s, i) => {
            if (progress < 0.5) return null;
            const ratio = animValue(s.value, progress) / maxVal;
            const r = maxR * ratio * 0.65;
            const midAngle = startAngleOffset + (i + 0.5) * angleStep;
            const lx = cx + r * Math.cos(midAngle);
            const ly = cy + r * Math.sin(midAngle);
            return (
              <Text
                key={`t-${s.name}`}
                x={lx}
                y={ly + 4}
                text={s.name}
                fontSize={11}
                fontFamily="sans-serif"
                fill={ratio > 0.5 ? '#fff' : '#595959'}
                textAlign="middle"
              />
            );
          })}
        </>
      )}
    </ChartFrame>
  );
}

export default RoseChart;
