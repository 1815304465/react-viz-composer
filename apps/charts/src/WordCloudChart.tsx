/**
 * WordCloudChart —— 词云图
 */

import { useMemo } from 'react';
import { Animation, Text } from '@react-viz-composer/core';
import {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  useChartItemHover,
  hoverStrokeWidth,
  CATEGORY_12,
  useChartSize,
} from './local';
import type {
  ChartItemHoverProps,
} from './local';


interface WordCloudItem {
  text: string;
  weight: number;
}

interface PlacedWord {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  weight: number;
}

interface WordCloudHoverPayload {
  text: string;
  weight: number;
}

interface Props extends ChartItemHoverProps<WordCloudHoverPayload> {
  data?: WordCloudItem[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CHAR_W_RATIO = 0.62;

const WORD_PLAYBOOK = [
  { attribute: 'opacity', from: 0, duration: 600, easing: 'easeOut', targets: 'children', stagger: 30 },
] as const;

/**
 * 词云图
 */
export function WordCloudChart(props: Props) {
  return (
    <ChartFrame>
      <WordCloudChartPlot {...props} />
    </ChartFrame>
  );
}

/** @param props: Props 图表 props */
function WordCloudChartPlot(props: Props) {
  const { plotWidth, plotHeight } = useChartSize();

  const { data, onItemEnter, onItemLeave } = props;
  const { bindHover, isHovering } = useChartItemHover(
    { onItemEnter, onItemLeave },
    (p) => p.text,
  );

  const words: WordCloudItem[] = data ?? [
    { text: 'React', weight: 100 },
    { text: 'TypeScript', weight: 92 },
    { text: 'Visualization', weight: 78 },
    { text: 'D3', weight: 65 },
    { text: 'Chart', weight: 60 },
    { text: 'Canvas', weight: 55 },
    { text: 'SVG', weight: 50 },
    { text: 'Animation', weight: 45 },
    { text: 'CSS', weight: 42 },
    { text: 'HTML', weight: 40 },
    { text: 'Vite', weight: 38 },
    { text: 'ESM', weight: 35 },
    { text: 'Node', weight: 32 },
    { text: 'API', weight: 30 },
    { text: 'UX', weight: 28 },
    { text: 'UI', weight: 26 },
    { text: 'WebGL', weight: 24 },
    { text: 'GPU', weight: 22 },
    { text: 'State', weight: 20 },
    { text: 'Props', weight: 18 },
    { text: 'Hooks', weight: 16 },
    { text: 'Redux', weight: 15 },
    { text: 'Router', weight: 14 },
    { text: 'Fetch', weight: 12 },
    { text: 'JSON', weight: 10 },
  ];

  const placedWords = useMemo(() => {
    const sorted = [...words].sort((a, b) => b.weight - a.weight);
    const minW = sorted[sorted.length - 1].weight;
    const maxW = sorted[0].weight;
    const mapSize = (w: number) =>
      Math.round(8 + ((w - minW) / Math.max(maxW - minW, 1)) * 36);
    const placed: PlacedWord[] = [];
    const occupied: Rect[] = [];
    const cx = plotWidth / 2;
    const cy = plotHeight / 2;

    function textWidth(text: string, fontSize: number): number {
      return text.length * fontSize * CHAR_W_RATIO;
    }
    function textHeight(fontSize: number): number {
      return fontSize * 1.2;
    }
    function aabbOverlap(a: Rect, b: Rect): boolean {
      return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
    }
    function canPlace(x: number, y: number, w: number, h: number): boolean {
      if (x < 0 || y < 0 || x + w > plotWidth || y + h > plotHeight) return false;
      const rect: Rect = { x: x - 2, y: y - 2, w: w + 4, h: h + 4 };
      return !occupied.some((o) => aabbOverlap(o, rect));
    }

    for (let idx = 0; idx < sorted.length; idx++) {
      const word = sorted[idx];
      const fontSize = mapSize(word.weight);
      const w = textWidth(word.text, fontSize);
      const h = textHeight(fontSize);
      const color = CATEGORY_12[idx % CATEGORY_12.length];
      let found = false;
      for (let t = 0; t < 400; t += 0.5) {
        const theta = t * 0.18;
        const radius = 1 + t;
        const sx = cx + radius * Math.cos(theta);
        const sy = cy + radius * Math.sin(theta);
        const px = sx - w / 2;
        const py = sy - h / 2;
        if (canPlace(px, py, w, h)) {
          placed.push({ text: word.text, x: px, y: py, fontSize, color, weight: word.weight });
          occupied.push({ x: px, y: py, w, h });
          found = true;
          break;
        }
      }
      if (!found) {
        for (let row = 0; row < 20 && !found; row++) {
          for (let col = 0; col < 20 && !found; col++) {
            const gx = col * (plotWidth / 20);
            const gy = row * (plotHeight / 20);
            if (canPlace(gx, gy, w, h)) {
              placed.push({ text: word.text, x: gx, y: gy, fontSize, color, weight: word.weight });
              occupied.push({ x: gx, y: gy, w, h });
              found = true;
            }
          }
        }
      }
    }
    return placed;
  }, [words]);

  return (
    <>
      <Animation playbook={[...WORD_PLAYBOOK]}>
        {placedWords.map((pw) => {
          const payload: WordCloudHoverPayload = { text: pw.text, weight: pw.weight };
          const centerX = pw.x + pw.fontSize * pw.text.length * CHAR_W_RATIO / 2;
          const centerY = pw.y + pw.fontSize * 0.6;
          const hovered = isHovering(pw.text);
          return (
            <Text
              key={pw.text}
              x={centerX}
              y={centerY}
              text={pw.text}
              fontSize={pw.fontSize}
              fontWeight="bold"
              fontFamily="sans-serif"
              fill={pw.color}
              opacity={hovered ? 1 : 0.85}
              stroke={hovered ? pw.color : undefined}
              strokeWidth={hoverStrokeWidth(0, hovered)}
              textAlign="middle"
              {...bindHover(payload)}
            />
          );
        })}
      </Animation>
    </>
  );
}


export default WordCloudChart;
