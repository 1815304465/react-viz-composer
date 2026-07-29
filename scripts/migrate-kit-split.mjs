/**
 * 将 apps/charts 对 @react-viz-composer/kit 的旧导入拆到 kit(Axis/Grid) + ./local
 * 并为 Axis/Grid 补齐 length / crossAt。
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('apps/charts/src');

const LOCAL_NAMES = new Set([
  'scaleLinear', 'scaleBand',
  'CATEGORY_12', 'SEMANTIC_6', 'KLINE_UP', 'KLINE_DOWN',
  'AXIS_COLOR', 'GRID_COLOR', 'TEXT_COLOR', 'TEXT_LIGHT', 'colorAt',
  'easeOutCubic', 'animValue', 'animSize',
  'hoverStrokeWidth', 'hoverOpacity',
  'ChartFrame', 'useChartSize',
  'PLOT_WIDTH', 'PLOT_HEIGHT', 'CHART_WIDTH', 'CHART_HEIGHT',
  'PADDING', 'CHART_DEFAULT_VIEWPORT', 'COLORS',
  'ExplorableChartFrame', 'EXPLORE_WIDTH', 'EXPLORE_HEIGHT',
  'useChartItemHover', 'itemHoverProps',
  'type ChartItemHoverProps', 'type LinearScale', 'type BandScale',
  'ChartItemHoverProps', 'LinearScale', 'BandScale',
]);

const KIT_NAMES = new Set(['Axis', 'Grid', 'Tooltip']);

/**
 * @param {string} file
 * @param {string} content
 */
function rewriteImports(file, content) {
  // merge type imports into value imports handling
  const importRe = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+'@react-viz-composer\/kit';/g;
  let kit = [];
  let local = [];
  let localTypes = [];
  let kitTypes = [];

  let next = content.replace(importRe, (_m, typeKw, body) => {
    const names = body.split(',').map((s) => s.trim()).filter(Boolean);
    for (const raw of names) {
      const isType = Boolean(typeKw) || raw.startsWith('type ');
      const name = raw.replace(/^type\s+/, '');
      if (KIT_NAMES.has(name)) {
        if (isType) kitTypes.push(name);
        else kit.push(name);
      } else if (LOCAL_NAMES.has(name) || LOCAL_NAMES.has(`type ${name}`)) {
        if (isType || raw.startsWith('type ')) localTypes.push(name);
        else local.push(name);
      } else {
        // unknown — keep local by default for charts
        if (isType || raw.startsWith('type ')) localTypes.push(name);
        else local.push(name);
      }
    }
    return '/*__IMPORT_PLACEHOLDER__*/';
  });

  // dedupe
  kit = [...new Set(kit)];
  local = [...new Set(local)];
  localTypes = [...new Set(localTypes)];
  kitTypes = [...new Set(kitTypes)];

  // Always need useChartSize if Axis/Grid used without length yet — add if ChartFrame charts
  if ((kit.includes('Axis') || kit.includes('Grid')) && !local.includes('useChartSize')) {
    local.push('useChartSize');
  }

  const blocks = [];
  if (kit.length) {
    blocks.push(`import {\n  ${kit.join(',\n  ')},\n} from '@react-viz-composer/kit';`);
  }
  if (kitTypes.length) {
    blocks.push(`import type {\n  ${kitTypes.join(',\n  ')},\n} from '@react-viz-composer/kit';`);
  }
  if (local.length) {
    blocks.push(`import {\n  ${local.join(',\n  ')},\n} from './local';`);
  }
  if (localTypes.length) {
    blocks.push(`import type {\n  ${localTypes.join(',\n  ')},\n} from './local';`);
  }

  // replace first placeholder cluster
  next = next.replace(/\/\*__IMPORT_PLACEHOLDER__\*\/\n?/g, '');
  // insert after core imports / first import block
  const insertAt = next.search(/\nexport |\ninterface |\nconst |\nfunction /);
  if (insertAt === -1) {
    next = blocks.join('\n') + '\n' + next;
  } else {
    // find end of leading import section
    const lines = next.split('\n');
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\b/.test(lines[i]) || (lastImport >= 0 && /^\s/.test(lines[i]) && !/^(export|interface|const|function|\/\*)/.test(lines[i]))) {
        if (/^import\b/.test(lines[i])) lastImport = i;
      } else if (lastImport >= 0 && lines[i].trim() === '') {
        lastImport = i;
        break;
      } else if (lastImport >= 0) {
        break;
      }
    }
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, ...blocks.join('\n').split('\n'));
      next = lines.join('\n');
    } else {
      next = blocks.join('\n') + '\n' + next;
    }
  }

  return next;
}

/**
 * 注入 useChartSize，并给 Axis/Grid 补 length/crossAt
 * @param {string} content
 */
function patchAxisGridUsage(content) {
  if (!content.includes('<Axis') && !content.includes('<Grid')) return content;

  // inject hook in export function if missing call
  if (!content.includes('useChartSize()')) {
    content = content.replace(
      /^export function (\w+)\(props\)\s*\{/m,
      (m) => `${m}\n  const { plotWidth, plotHeight } = useChartSize();\n`,
    );
  } else if (!/plotWidth|plotHeight/.test(content)) {
    // already has hook but maybe wrong destructure — skip
  }

  // Ensure destructure includes plotWidth/plotHeight
  if (content.includes('useChartSize()') && !content.includes('plotWidth')) {
    content = content.replace(
      /const \{([^}]*)\} = useChartSize\(\);/,
      (_m, inner) => {
        const parts = inner.split(',').map((s) => s.trim()).filter(Boolean);
        if (!parts.includes('plotWidth')) parts.push('plotWidth');
        if (!parts.includes('plotHeight')) parts.push('plotHeight');
        return `const { ${parts.join(', ')} } = useChartSize();`;
      },
    );
  }

  // Grid: add length if missing
  content = content.replace(/<Grid\b([^>]*)\/>/g, (m, attrs) => {
    if (/\blength=/.test(attrs)) return m;
    if (/orient=["']x["']/.test(attrs)) {
      return `<Grid${attrs} length={plotHeight} />`;
    }
    if (/orient=["']y["']/.test(attrs)) {
      return `<Grid${attrs} length={plotWidth} />`;
    }
    return `<Grid${attrs} length={plotHeight} />`;
  });

  // Axis multi-line or single-line self-closing
  content = content.replace(/<Axis\b([^>]*)\/>/g, (m, attrs) => {
    let next = attrs;
    if (!/\blength=/.test(next)) {
      if (/orient=["']bottom["']/.test(next) || /orient=["']top["']/.test(next)) {
        next += ' length={plotWidth}';
      } else {
        next += ' length={plotHeight}';
      }
    }
    if (!/\bcrossAt=/.test(next)) {
      if (/orient=["']bottom["']/.test(next)) next += ' crossAt={plotHeight}';
      else if (/orient=["']right["']/.test(next)) next += ' crossAt={plotWidth}';
      else next += ' crossAt={0}';
    }
    return `<Axis${next} />`;
  });

  return content;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.tsx'));

for (const file of files) {
  if (file === 'Legend.tsx') {
    // special: only local TEXT_COLOR + useChartSize from ChartFrame path
  }
  const full = path.join(DIR, file);
  let content = fs.readFileSync(full, 'utf8');
  if (!content.includes('@react-viz-composer/kit')) continue;

  content = rewriteImports(file, content);
  content = patchAxisGridUsage(content);

  // Fix relative local import for files in subdirs — all charts are flat in src/
  fs.writeFileSync(full, content, 'utf8');
  console.log('updated', file);
}

// Legend special case
{
  const full = path.join(DIR, 'Legend.tsx');
  if (fs.existsSync(full)) {
    let content = fs.readFileSync(full, 'utf8');
    content = content.replace(
      /from '@react-viz-composer\/kit'/g,
      "from './local'",
    );
    // Legend needs useChartSize from local
    if (!content.includes('useChartSize')) {
      content = content.replace(
        /import \{([^}]+)\} from '\.\/local';/,
        (m, body) => `import {${body}, useChartSize } from './local';`,
      );
    }
    fs.writeFileSync(full, content, 'utf8');
    console.log('updated Legend.tsx');
  }
}

console.log('done');
