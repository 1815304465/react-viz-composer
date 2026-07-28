/**
 * CalendarHeatmapChart —— 日历热力图（GitHub 风格）
 *
 * 7 行（一周）× N 列（周），每个单元格颜色深浅表示数值大小。
 */

import { useMemo } from 'react';
import { Rect, Text } from '../shapes';
import { ChartFrame, PLOT_WIDTH } from './shared/ChartFrame';
import { animValue } from './shared/useEntryProgress.ts';
import { useChartItemHover, hoverStrokeWidth, type ChartItemHoverProps } from './shared/chartEvents';
import { TEXT_COLOR } from './shared/palette';

interface CalendarDay {
  date: string;
  value: number;
}

interface CalendarHoverPayload {
  date: string;
  value: number;
  dayOfWeek: string;
}

interface Props extends ChartItemHoverProps<CalendarHoverPayload> {
  data?: CalendarDay[];
}

/** 绿色梯度 */
function heatColor(v: number, maxVal: number): string {
  const ratio = maxVal > 0 ? Math.min(1, v / maxVal) : 0;
  if (ratio <= 0) return '#ebedf0';
  if (ratio < 0.25) return '#c6e48b';
  if (ratio < 0.5) return '#7bc96f';
  if (ratio < 0.75) return '#239a3b';
  return '#196127';
}

const DAY_LABELS = ['周一', '', '周三', '', '周五', '', '周日'];
const CELL_SIZE = 16;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;

export function CalendarHeatmapChart(props: Props) {
  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: CalendarHoverPayload) => p.date,
  );

  // 生成一年的模拟数据（当前年份）
  const dataset: CalendarDay[] = useMemo(() => {
    if (data) return data;
    const now = new Date();
    const year = now.getFullYear();
    const out: CalendarDay[] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const d = new Date(start);
    while (d <= end) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      // 伪随机但确定性的值
      const hash = dateStr.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      const v = (Math.sin(hash * 0.1) * 0.5 + 0.5) * 10 + (Math.random() * 2);
      out.push({ date: dateStr, value: Math.round(v) });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [data]);

  const maxVal = Math.max(...dataset.map((d) => d.value), 1);

  // 构建 date → value 映射
  const valMap = useMemo(() => {
    const m = new Map<string, number>();
    dataset.forEach((d) => m.set(d.date, d.value));
    return m;
  }, [dataset]);

  // 生成周×天的网格
  const year = new Date().getFullYear();
  const grid = useMemo(() => {
    const weeks: { date: string; dayOfWeek: number; weekIndex: number }[][] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const d = new Date(start);

    // 找到第一个周一所在的周
    while (d.getDay() !== 1 && d <= end) {
      d.setDate(d.getDate() - 1);
    }

    let currentWeek: { date: string; dayOfWeek: number; weekIndex: number }[] = [];
    let weekIndex = 0;
    const cursor = new Date(d);
    while (cursor <= end) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      // 0=Sunday，转换为 0=Monday
      const dayOfWeek = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1;
      currentWeek.push({ date: dateStr, dayOfWeek, weekIndex });
      if (dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
        weekIndex++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);
    return weeks;
  }, [year]);

  // 计算偏移（居中）
  const totalWidth = grid.length * CELL_STEP;
  const offsetX = Math.max(10, (PLOT_WIDTH - totalWidth) / 2);
  const offsetY = 30;

  return (
    <ChartFrame>
      {(progress) => (
        <>
          {/* 行标签 */}
          {DAY_LABELS.map((label, i) => (
            <Text
              key={`day-${i}`}
              x={offsetX - 8}
              y={offsetY + i * CELL_STEP + CELL_SIZE / 2 + 3}
              text={label}
              fontSize={10}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              textAlign="end"
            />
          ))}

          {/* 列标签（月份） */}
          {(() => {
            const months: { label: string; weekIdx: number }[] = [];
            for (let m = 0; m < 12; m++) {
              const d = new Date(year, m, 15);
              // 找到该月中某一天所在的周
              let weekIdx = 0;
              const dayOfYear = Math.floor((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000);
              // 粗略估计周索引
              weekIdx = Math.floor((dayOfYear + new Date(year, 0, 1).getDay()) / 7);
              // 去重，只保留第一个出现的
              if (months.length > 0 && months[months.length - 1].label === `${m + 1}月`) continue;
              if (weekIdx >= 0 && weekIdx < grid.length) {
                months.push({ label: `${m + 1}月`, weekIdx });
              }
            }
            return months.map((mo) => {
              const x = offsetX + mo.weekIdx * CELL_STEP + CELL_SIZE / 2;
              return (
                <Text
                  key={`mo-${mo.label}`}
                  x={x}
                  y={offsetY - 10}
                  text={mo.label}
                  fontSize={9}
                  fontFamily="sans-serif"
                  fill={TEXT_COLOR}
                  textAlign="middle"
                />
              );
            });
          })()}

          {/* 单元格 */}
          {grid.map((week, wi) =>
            week.map((day) => {
              const v = valMap.get(day.date) ?? 0;
              const av = animValue(v, progress);
              const x = offsetX + wi * CELL_STEP;
              const y = offsetY + day.dayOfWeek * CELL_STEP;
              const payload: CalendarHoverPayload = {
                date: day.date,
                value: v,
                dayOfWeek: DAY_LABELS[day.dayOfWeek],
              };
              const hovered = isHovering(day.date);
              return (
                <Rect
                  key={day.date}
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={heatColor(av, maxVal)}
                  stroke="#fff"
                  strokeWidth={hoverStrokeWidth(0.5, hovered)}
                  rx={3}
                  ry={3}
                  {...bindHover(payload)}
                />
              );
            }),
          )}
        </>
      )}
    </ChartFrame>
  );
}

export default CalendarHeatmapChart;
