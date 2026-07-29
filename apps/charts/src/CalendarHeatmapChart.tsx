/**
 * CalendarHeatmapChart —— 日历热力图（GitHub 风格）
 */

import { useMemo } from 'react';
import { Animation, Rect, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_WIDTH,
  useChartItemHover,
  hoverStrokeWidth,
  TEXT_COLOR,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


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

const CELL_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 400, easing: 'easeOut', targets: 'children', stagger: 3 },
] as const;

/**
 * 日历热力图
 */
export function CalendarHeatmapChart(props: Props) {
  return (
    <ChartFrame>
      <CalendarHeatmapChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function CalendarHeatmapChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p: CalendarHoverPayload) => p.date,
  );

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
      const hash = dateStr.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      const v = (Math.sin(hash * 0.1) * 0.5 + 0.5) * 10 + (Math.random() * 2);
      out.push({ date: dateStr, value: Math.round(v) });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [data]);

  const maxVal = Math.max(...dataset.map((d) => d.value), 1);
  const valMap = useMemo(() => {
    const m = new Map<string, number>();
    dataset.forEach((d) => m.set(d.date, d.value));
    return m;
  }, [dataset]);

  const year = new Date().getFullYear();
  const grid = useMemo(() => {
    const weeks: { date: string; dayOfWeek: number; weekIndex: number }[][] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const d = new Date(start);
    while (d.getDay() !== 1 && d <= end) {
      d.setDate(d.getDate() - 1);
    }
    let currentWeek: { date: string; dayOfWeek: number; weekIndex: number }[] = [];
    let weekIndex = 0;
    const cursor = new Date(d);
    while (cursor <= end) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
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

  const totalWidth = grid.length * CELL_STEP;
  const offsetX = Math.max(10, (plotWidth - totalWidth) / 2);
  const offsetY = 30;

  const months = useMemo(() => {
    const result: { label: string; weekIdx: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(year, m, 15);
      const dayOfYear = Math.floor((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000);
      const weekIdx = Math.floor((dayOfYear + new Date(year, 0, 1).getDay()) / 7);
      if (result.length > 0 && result[result.length - 1].label === `${m + 1}月`) continue;
      if (weekIdx >= 0 && weekIdx < grid.length) {
        result.push({ label: `${m + 1}月`, weekIdx });
      }
    }
    return result;
  }, [year, grid.length]);

  return (
    <>
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
      {months.map((mo) => (
        <Text
          key={`mo-${mo.label}`}
          x={offsetX + mo.weekIdx * CELL_STEP + CELL_SIZE / 2}
          y={offsetY - 10}
          text={mo.label}
          fontSize={9}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
        />
      ))}
      <Animation playbook={[...CELL_PLAYBOOK]}>
        {grid.flatMap((week, wi) =>
          week.map((day) => {
            const v = valMap.get(day.date) ?? 0;
            const x = offsetX + wi * CELL_STEP;
            const y = offsetY + day.dayOfWeek * CELL_STEP;
            const payload: CalendarHoverPayload = {
              date: day.date,
              value: v,
              dayOfWeek: DAY_LABELS[day.dayOfWeek],
            };
            return (
              <Rect
                key={day.date}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={heatColor(v, maxVal)}
                stroke="#fff"
                strokeWidth={hoverStrokeWidth(0.5, isHovering(day.date))}
                rx={3}
                ry={3}
                opacity={1}
                {...bindHover(payload)}
              />
            );
          }),
        )}
      </Animation>
    </>
  );
}


export default CalendarHeatmapChart;
