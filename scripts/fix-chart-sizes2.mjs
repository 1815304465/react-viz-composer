/**
 * 为带 TS props 注解的图表注入 useChartSize，并替换组件体内布局常量。
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('apps/charts/src');

for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('.tsx')) continue;
  const full = path.join(DIR, file);
  let content = fs.readFileSync(full, 'utf8');
  if (!content.includes('ChartFrame') && !content.includes('<Axis') && !content.includes('<Grid')) {
    continue;
  }

  const exportRe = /^export function (\w+)\(props(?::\s*\w+)?\)\s*\{/m;
  const match = content.match(exportRe);
  if (!match) {
    console.log('NO MATCH', file);
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
    if (dest) body = body.replace(dest[0], `${dest[0]}${hook}`);
    else body = `${hook}${body}`;
  }

  body = body
    .replace(/\bPLOT_WIDTH\b/g, 'plotWidth')
    .replace(/\bPLOT_HEIGHT\b/g, 'plotHeight')
    .replace(/\bCHART_WIDTH\b/g, 'chartWidth')
    .replace(/\bCHART_HEIGHT\b/g, 'chartHeight');

  if (/\bchartWidth\b|\bchartHeight\b/.test(body)) {
    body = body.replace(
      /const \{ plotWidth, plotHeight \} = useChartSize\(\);/,
      'const { plotWidth, plotHeight, chartWidth, chartHeight } = useChartSize();',
    );
  }

  let next = before + body + rest;

  if (!next.includes('useChartSize')) {
    next = next.replace(/import\s*\{([^}]+)\}\s*from\s*'\.\/local';/, (m, b) => {
      if (b.includes('useChartSize')) return m;
      const trimmed = b.trim().replace(/,$/, '');
      return `import {\n  ${trimmed},\n  useChartSize,\n} from './local';`;
    });
  }

  // Axis/Grid length if still missing
  next = next.replace(/<Grid\b([^>]*)\/>/g, (m, attrs) => {
    if (/\blength=/.test(attrs)) return m;
    if (/orient=["']x["']/.test(attrs)) return `<Grid${attrs} length={plotHeight} />`;
    return `<Grid${attrs} length={plotWidth} />`;
  });
  next = next.replace(/<Axis\b([^>]*)\/>/g, (m, attrs) => {
    let a = attrs;
    if (!/\blength=/.test(a)) {
      a += (/orient=["'](bottom|top)["']/.test(a)) ? ' length={plotWidth}' : ' length={plotHeight}';
    }
    if (!/\bcrossAt=/.test(a)) {
      if (/orient=["']bottom["']/.test(a)) a += ' crossAt={plotHeight}';
      else if (/orient=["']right["']/.test(a)) a += ' crossAt={plotWidth}';
      else a += ' crossAt={0}';
    }
    return `<Axis${a} />`;
  });

  fs.writeFileSync(full, next, 'utf8');
  console.log('fixed', file);
}

console.log('done');
