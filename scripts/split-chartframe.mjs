/**
 * 将图表拆成 ChartFrame 外壳 + Inner（在 Context 内调用 useChartSize）
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('apps/charts/src');

for (const file of fs.readdirSync(DIR)) {
  if (!file.endsWith('Chart.tsx')) continue;
  const full = path.join(DIR, file);
  let content = fs.readFileSync(full, 'utf8');

  if (!content.includes('<ChartFrame')) continue;

  // Match export function Foo(props) or export function Foo(props: Props) or function Foo(props: Props) with later export
  let match = content.match(/^export function (\w+)\((props(?::\s*\w+)?)\)\s*\{/m);
  let isExport = true;
  if (!match) {
    match = content.match(/^function (\w+)\((props(?::\s*\w+)?)\)\s*\{/m);
    isExport = false;
  }
  if (!match) {
    console.log('SKIP', file);
    continue;
  }

  const name = match[1];
  const propsArg = match[2];
  const innerName = `${name}Plot`;

  // Already split?
  if (content.includes(`function ${innerName}`)) {
    console.log('already', file);
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
  const afterFn = after.slice(i); // starts with }
  const before = content.slice(0, match.index);

  // Ensure useChartSize in body
  if (!body.includes('useChartSize()')) {
    const dest = body.match(/\n\s*const \{[^}]+\}\s*=\s*props;\n/);
    const hook = '\n  const { plotWidth, plotHeight } = useChartSize();\n';
    if (dest) body = body.replace(dest[0], `${dest[0]}${hook}`);
    else body = `${hook}${body}`;
  }

  // Replace return <ChartFrame>...</ChartFrame> with fragment of inner content
  body = body.replace(
    /return\s*\(\s*<ChartFrame([^>]*)>([\s\S]*?)<\/ChartFrame>\s*\);/,
    (_m, attrs, inner) => {
      const trimmed = String(inner).trim();
      // drop width/height attrs on ChartFrame — outer keeps defaults
      void attrs;
      if (trimmed.startsWith('<>') || trimmed.startsWith('<React.Fragment')) {
        return `return (\n    ${trimmed}\n  );`;
      }
      return `return (\n    <>\n      ${trimmed}\n    </>\n  );`;
    },
  );

  // Also handle render-prop ChartFrame if previous script partially applied
  body = body.replace(
    /return\s*\(\s*<ChartFrame>\s*\{\(\{[^}]*\}\)\s*=>\s*\{[\s\S]*?return\s*\(([\s\S]*?)\);\s*\}\}\s*<\/ChartFrame>\s*\);/,
    (_m, inner) => `return (\n    ${String(inner).trim()}\n  );`,
  );

  const outer = `export function ${name}(${propsArg}) {
  return (
    <ChartFrame>
      <${innerName} {...props} />
    </ChartFrame>
  );
}

/** @param ${propsArg} 图表 props */
function ${innerName}(${propsArg}) {${body}}
`;

  // Remove duplicate export default / export { name } handling — keep tail after original function
  let tail = afterFn.slice(1); // after closing brace
  // If original was `function X` not export, remove later `export { X }` duplication carefully
  if (!isExport) {
    // remove the old function only; keep export { Name }
  }

  // Strip previous broken render-prop wrappers leftovers in tail? 
  const next = before + outer + tail;

  // Ensure ChartFrame + useChartSize imported from local
  let final = next;
  if (!/useChartSize/.test(final.match(/from '\.\/local'/)?.[0] ? final : '')) {
    final = final.replace(/import\s*\{([^}]+)\}\s*from\s*'\.\/local';/, (m, b) => {
      let names = b;
      if (!names.includes('useChartSize')) names = `${names.trim().replace(/,$/, '')},\n  useChartSize`;
      if (!names.includes('ChartFrame')) names = `${names.trim().replace(/,$/, '')},\n  ChartFrame`;
      return `import {\n  ${names.trim()}\n} from './local';`;
    });
  }

  fs.writeFileSync(full, final, 'utf8');
  console.log('split', file);
}

console.log('done');
