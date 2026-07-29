/**
 * 将 `useChartSize()` 误放在 ChartFrame 外的图表，改为 ChartFrame 渲染函数子节点。
 *
 * 转换前:
 *   const { plotWidth, plotHeight } = useChartSize();
 *   ...
 *   return (<ChartFrame>...</ChartFrame>);
 *
 * 转换后:
 *   return (
 *     <ChartFrame>
 *       {({ plotWidth, plotHeight }) => {
 *         ...
 *         return (<>...</>);
 *       }}
 *     </ChartFrame>
 *   );
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('apps/charts/src');

for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('Chart.tsx')) continue;
  const full = path.join(DIR, file);
  let content = fs.readFileSync(full, 'utf8');

  if (!content.includes('useChartSize()')) continue;
  if (!content.includes('<ChartFrame>')) continue;

  // Already using render prop?
  if (/<ChartFrame>\s*\{\s*\(\s*\{\s*plotWidth/.test(content)) continue;

  // Remove top-level useChartSize in component (various destructure forms)
  content = content.replace(
    /\n\s*const \{[^}]*plotWidth[^}]*\} = useChartSize\(\);\n/,
    '\n',
  );

  // Transform return ( <ChartFrame> INNER </ChartFrame> );
  content = content.replace(
    /return\s*\(\s*<ChartFrame>([\s\S]*?)<\/ChartFrame>\s*\);/,
    (_m, inner) => {
      const body = String(inner).trim();
      // If body already starts with fragment or multiple roots, wrap
      const needsFragment = !body.startsWith('<>') && !body.startsWith('<React.Fragment');
      const wrapped = needsFragment ? `<>\n        ${body}\n      </>` : body;
      return `return (
    <ChartFrame>
      {({ plotWidth, plotHeight, chartWidth, chartHeight }) => {
        return (
          ${wrapped}
        );
      }}
    </ChartFrame>
  );`;
    },
  );

  // scales/hooks that used plotWidth need to move inside render prop —
  // if plotWidth is referenced before return, the transform is incomplete; flag it
  const returnIdx = content.search(/return\s*\(\s*<ChartFrame>/);
  const beforeReturn = returnIdx >= 0 ? content.slice(0, returnIdx) : content;
  if (/\bplotWidth\b|\bplotHeight\b|\bchartWidth\b|\bchartHeight\b/.test(beforeReturn)) {
    console.log('NEEDS_MANUAL', file, '- size vars used before return');
  } else {
    console.log('ok', file);
  }

  fs.writeFileSync(full, content, 'utf8');
}

console.log('done');
