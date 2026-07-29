/**
 * 为 apps/charts 注入 useChartSize，并在组件体内用 plotWidth/plotHeight 替换布局常量。
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('apps/charts/src');

for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('.tsx')) continue;
  const full = path.join(DIR, file);
  let content = fs.readFileSync(full, 'utf8');

  // fix broken imports like `{ foo,\n, useChartSize }`
  content = content.replace(/\{\s*([^}]*),\s*,\s*useChartSize\s*\}/g, '{ $1, useChartSize }');
  content = content.replace(/,\s*,\s*useChartSize/g, ', useChartSize');

  if (!content.includes('ChartFrame') && !content.includes('useChartSize')) {
    fs.writeFileSync(full, content, 'utf8');
    continue;
  }

  // ensure local import has useChartSize
  if (content.includes("from './local'") && content.includes('ChartFrame') && !/useChartSize/.test(content.match(/from '\.\/local'/) ? content : '')) {
    content = content.replace(
      /import\s*\{([^}]+)\}\s*from\s*'\.\/local';/,
      (m, body) => {
        if (body.includes('useChartSize')) return m;
        return `import {\n  ${body.trim().replace(/,$/, '')},\n  useChartSize,\n} from './local';`;
      },
    );
  }

  const exportRe = /^export function (\w+)\(props\)\s*\{/m;
  const match = content.match(exportRe);
  if (!match) {
    fs.writeFileSync(full, content, 'utf8');
    continue;
  }

  const start = match.index + match[0].length;
  let depth = 1;
  let i = 0;
  const after = content.slice(start);
  for (; i < after.length; i++) {
    if (after[i] === '{') depth++;
    else if (after[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  let body = after.slice(0, i);
  const rest = after.slice(i);
  const before = content.slice(0, start);

  if (!body.includes('useChartSize()')) {
    const dest = body.match(/\n\s*const \{[^}]+\}\s*=\s*props;\n/);
    const hook = '\n  const { plotWidth, plotHeight } = useChartSize();\n';
    if (dest) body = body.replace(dest[0], dest[0] + hook);
    else body = hook + body;
  } else if (!body.includes('plotWidth')) {
    body = body.replace(
      /const \{([^}]*)\} = useChartSize\(\);/,
      'const { plotWidth, plotHeight } = useChartSize();',
    );
  }

  body = body
    .replace(/\bPLOT_WIDTH\b/g, 'plotWidth')
    .replace(/\bPLOT_HEIGHT\b/g, 'plotHeight')
    .replace(/\bCHART_WIDTH\b/g, 'chartWidth')
    .replace(/\bCHART_HEIGHT\b/g, 'chartHeight');

  // if chartWidth used, expand destructure
  if (/\bchartWidth\b|\bchartHeight\b/.test(body)) {
    body = body.replace(
      /const \{ plotWidth, plotHeight \} = useChartSize\(\);/,
      'const { plotWidth, plotHeight, chartWidth, chartHeight } = useChartSize();',
    );
  }

  content = before + body + rest;
  fs.writeFileSync(full, content, 'utf8');
  console.log('fixed', file);
}

// Legend: rewrite to useChartSize for positions
{
  const full = path.join(DIR, 'Legend.tsx');
  let content = `/**
 * Legend —— 图例组件（示例）
 */

import { Fragment } from 'react';
import { Rect, Text } from '@react-viz-composer/core';
import { TEXT_COLOR, useChartSize } from './local';

interface LegendItem {
  name: string;
  color: string;
}

interface Props {
  items: LegendItem[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  swatchSize?: number;
  gap?: number;
}

/**
 * 图例
 */
export function Legend(props: Props) {
  const {
    items,
    position = 'top-right',
    swatchSize = 10,
    gap = 20,
  } = props;

  const { plotWidth, plotHeight } = useChartSize();

  const cfg = {
    'top-right': { anchor: 'end', x: plotWidth - 10, y: 8, direction: 1 },
    'top-left': { anchor: 'start', x: 10, y: 8, direction: 1 },
    'bottom-right': { anchor: 'end', x: plotWidth - 10, y: plotHeight - 8, direction: -1 },
    'bottom-left': { anchor: 'start', x: 10, y: plotHeight - 8, direction: -1 },
  }[position] ?? { anchor: 'end', x: plotWidth - 10, y: 8, direction: 1 };

  return (
    <>
      {items.map((item, i) => {
        const y = cfg.y + i * gap * cfg.direction;
        const swatchX = cfg.anchor === 'end' ? cfg.x - swatchSize : cfg.x;
        const textX = cfg.anchor === 'end' ? cfg.x - swatchSize - 4 : cfg.x + swatchSize + 4;
        return (
          <Fragment key={item.name}>
            <Rect
              x={swatchX}
              y={y - swatchSize / 2}
              width={swatchSize}
              height={swatchSize}
              fill={item.color}
              rx={2}
            />
            <Text
              x={textX}
              y={y + 4}
              text={item.name}
              fontSize={11}
              fontFamily="sans-serif"
              fill={TEXT_COLOR}
              textAlign={cfg.anchor === 'end' ? 'end' : 'start'}
            />
          </Fragment>
        );
      })}
    </>
  );
}

export default Legend;
`;
  fs.writeFileSync(full, content, 'utf8');
  console.log('rewrote Legend.tsx');
}

console.log('done');
