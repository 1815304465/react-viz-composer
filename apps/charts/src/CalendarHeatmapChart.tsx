/**
 * CalendarHeatmapChart —— 日历热力图（GitHub 风格）
 */

import { useMemo } from 'react';
import { Animation, Rect, Text } from 'react-viz-composer';
import {
  ChartFrame,
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
    <ChartFrame padding={{ top: 12, right: 12, bottom: 12, left: 12 }}>
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
    if (data && data.length > 0) return data;
    const now = new Date();
    const year = now.getFullYear();
    const out: CalendarDay[] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const d = new Date(start);
    while (d <= end) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hash = dateStr.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      // 确定性伪随机，避免 Math.random 与 StrictMode 双调用不一致
      const v = (Math.sin(hash * 0.1) * 0.5 + 0.5) * 10;
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

  // 优先按高度撑满 7 行，避免全年 ~53 周挤进方卡后变成细条；装不下则只展示最近几周
  const labelCol = 32;
  const monthBand = 20;
  const availableW = Math.max(plotWidth - labelCol - 4, 80);
  const availableH = Math.max(plotHeight - monthBand - 4, 80);
  const heightStep = Math.min(CELL_STEP, availableH / 7);
  const maxWeeks = Math.max(8, Math.floor(availableW / Math.max(heightStep, 1)));
  const weekOffset = Math.max(0, grid.length - maxWeeks);
  const visibleGrid = weekOffset > 0 ? grid.slice(weekOffset) : grid;
  const cellStep = Math.min(
    CELL_STEP,
    availableW / Math.max(visibleGrid.length, 1),
    availableH / 7,
  );
  const cellSize = Math.max(5, cellStep - Math.max(1, CELL_GAP * (cellStep / CELL_STEP)));
  const totalWidth = visibleGrid.length * cellStep;
  const totalHeight = 7 * cellStep;
  const offsetX = labelCol + Math.max(0, (availableW - totalWidth) / 2);
  const offsetY = monthBand + Math.max(0, (availableH - totalHeight) / 2);

  const months = useMemo(() => {
    const result: { label: string; weekIdx: number }[] = [];
    let lastMonth = -1;
    visibleGrid.forEach((week, weekIdx) => {
      const inYear = week.find((day) => day.date.startsWith(`${year}-`));
      if (!inYear) return;
      const month = Number(inYear.date.slice(5, 7));
      if (month === lastMonth) return;
      if (result.length > 0 && weekIdx - result[result.length - 1].weekIdx < 2) {
        lastMonth = month;
        return;
      }
      lastMonth = month;
      result.push({ label: `${month}月`, weekIdx });
    });
    return result;
  }, [year, visibleGrid]);

  const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <>
      {DAY_LABELS.map((label, i) => (
        <Text
          key={`day-${i}`}
          x={offsetX - 6}
          y={offsetY + i * cellStep + cellSize / 2 + 3}
          text={label}
          fontSize={10}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="end"
        />
      ))}
      {months.map((mo) => (
        <Text
          key={`mo-${mo.label}-${mo.weekIdx}`}
          x={offsetX + mo.weekIdx * cellStep + cellSize / 2}
          y={offsetY - 8}
          text={mo.label}
          fontSize={10}
          fontFamily="sans-serif"
          fill={TEXT_COLOR}
          textAlign="middle"
        />
      ))}
      <Animation playbook={[...CELL_PLAYBOOK]}>
        {visibleGrid.flatMap((week, wi) =>
          week.map((day) => {
            const v = valMap.get(day.date) ?? 0;
            const x = offsetX + wi * cellStep;
            const y = offsetY + day.dayOfWeek * cellStep;
            const payload: CalendarHoverPayload = {
              date: day.date,
              value: v,
              dayOfWeek: weekdayNames[day.dayOfWeek],
            };
            return (
              <Rect
                key={day.date}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={heatColor(v, maxVal)}
                stroke="#fff"
                strokeWidth={hoverStrokeWidth(0.5, isHovering(day.date))}
                rx={2}
                ry={2}
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
