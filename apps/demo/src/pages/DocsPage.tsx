/**
 * DocsPage —— ReactVizComposer 文档页
 *
 * 包含：快速开始、核心概念、形状组件 API、容器与特效、引擎 API。
 */

import { CodeBlock } from '../components/CodeBlock';

/* ─── 章节组件 ─── */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 48, scrollMarginTop: 72 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, color: '#141414', margin: '0 0 16px', paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.75, color: '#434343' }}>
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#141414', margin: '0 0 12px' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function CodeExample({ code, lang = 'tsx' }: { code: string; lang?: string }) {
  return (
    <div style={{ margin: '16px 0', background: '#fafafa', borderRadius: 8, padding: 4 }}>
      <CodeBlock code={code} language={lang} />
    </div>
  );
}

/* ─── 目录 ─── */

function TocItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li style={{ fontSize: 14, lineHeight: 2.2 }}>
      <a href={href} style={{ color: '#1677ff', textDecoration: 'none' }}>
        {children}
      </a>
    </li>
  );
}

/* ════════════════════════════════════════════════════════════ */

export function DocsPage() {
  return (
    <div style={{ display: 'flex', maxWidth: 1080, margin: '0 auto', padding: '0 32px' }}>
      {/* 左侧目录 */}
      <nav style={{
        width: 200,
        flexShrink: 0,
        position: 'sticky',
        top: 72,
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        paddingTop: 40,
        paddingRight: 24,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#8c8c8c', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          目录
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <TocItem href="#getting-started">快速开始</TocItem>
          <TocItem href="#root-component">根组件</TocItem>
          <TocItem href="#shapes">形状组件</TocItem>
          <TocItem href="#containers">容器与特效</TocItem>
          <TocItem href="#events">事件系统</TocItem>
          <TocItem href="#animation">动画</TocItem>
          <TocItem href="#engine">渲染引擎</TocItem>
          <TocItem href="#viewport">视口裁剪</TocItem>
          <TocItem href="#components">半成品工具 (components)</TocItem>
          <TocItem href="#patterns">图表开发模式</TocItem>
          <TocItem href="#types">类型导出</TocItem>
        </ul>
      </nav>

      {/* 右侧内容 */}
      <main style={{ flex: 1, minWidth: 0, paddingTop: 40, paddingBottom: 80 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#141414', margin: '0 0 32px' }}>
          📖 使用文档
        </h1>

        {/* ── 快速开始 ── */}
        <Section id="getting-started" title="快速开始">
          <SubSection title="安装">
            <CodeExample
              code="npm install react-viz-composer"
              lang="bash"
            />
            <p style={{ marginTop: 12 }}>
              从 <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 3, fontSize: 13, fontFamily: 'monospace' }}>react-viz-composer</code> 一次安装即可获得引擎、形状与 Axis / Grid / Tooltip 等半成品组件。
            </p>
          </SubSection>

          <SubSection title="最小示例">
            <CodeExample code={`import { ReactVizComposer, Rect, Text } from 'react-viz-composer';

export default function App() {
  return (
    <ReactVizComposer width={600} height={400} engine="svg">
      <Rect x={50} y={80} width={120} height={100} rx={8} fill="#1677ff" />
      <Text x={110} y={140} text="Hello" fontSize={18} fill="#fff"
            textAlign="middle" textBaseline="middle" />
    </ReactVizComposer>
  );
}`} />
            <p style={{ marginTop: 12 }}>
              <strong>关键点：</strong>形状组件不渲染任何 DOM，它们只是将 props 转为 JSON 投递给渲染引擎。
              你可以在 JSX 中自由嵌套 Group，就像写 React 组件一样。
            </p>
          </SubSection>

          <SubSection title="你的第一个图表">
            <CodeExample code={`import { ReactVizComposer, Rect, Animation } from 'react-viz-composer';
import { Axis, Grid } from 'react-viz-composer';

const data = [
  { name: 'A', value: 40 },
  { name: 'B', value: 70 },
  { name: 'C', value: 55 },
];

export function BarChart() {
  const yScale = (i: number) => i * 80 + 40;
  const xScale = (v: number) => v * 4;

  return (
    <ReactVizComposer width={600} height={400} engine="svg">
      {/* 网格线 */}
      <Grid scale={/* your scale */} orient="x" />
      <Axis scale={/* your scale */} orient="bottom" />
      <Axis scale={/* your scale */} orient="left" />

      {/* 带入场动画的柱状图 */}
      <Animation playbook={[
        { attribute: 'width', from: 0, duration: 600,
          easing: 'easeOutCubic', targets: 'children', stagger: 40 },
      ]}>
        {data.map((d, i) => (
          <Rect key={d.name} x={0} y={yScale(i)}
                width={xScale(d.value)} height={50} rx={4}
                fill="#1677ff" />
        ))}
      </Animation>
    </ReactVizComposer>
  );
}`} />
          </SubSection>
        </Section>

        {/* ── 根组件 ── */}
        <Section id="root-component" title="根组件 ReactVizComposer">
          <p>
            根组件是渲染的起点。它创建一个画布并管理渲染引擎的生命周期。
          </p>
          <h4 style={{ fontSize: 15, fontWeight: 600, margin: '16px 0 8px' }}>Props</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>属性</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>类型</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>默认值</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>说明</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['engine', `'svg' | 'canvas'`, `'svg'`, '渲染引擎：SVG 增量 DOM 或 Canvas 全量重绘'],
                  ['width', 'number | string', `'100%'`, '画布宽度'],
                  ['height', 'number | string', `'100%'`, '画布高度'],
                  ['viewport', '{ x, y, scale }', '—', '受控视口（缩放/平移）'],
                  ['interactiveViewport', 'boolean', 'false', '启用滚轮缩放 + 拖拽平移'],
                  ['onViewportChange', '(v: Viewport) => void', '—', '视口变化回调'],
                  ['autoSize', 'boolean', 'true', '启用 ResizeObserver 自动跟随容器'],
                  ['debounceWait', 'number', '120', 'resize 防抖毫秒数'],
                  ['cullMargin', 'object', '见下方', '视口裁剪边距，默认四边各 20%'],
                  ['canvasEventProps', 'ShapeEventProps', '—', '根画布事件（空白区域点击等）'],
                  ['className', 'string', '—', '最外层容器 className'],
                  ['style', 'CSSProperties', '—', '最外层容器 style'],
                ].map(([prop, type, def, desc]) => (
                  <tr key={prop} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, color: '#141414' }}>{prop}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, color: '#722ed1' }}>{type}</td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#8c8c8c' }}>{def}</td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#434343' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── 形状组件 ── */}
        <Section id="shapes" title="形状组件">
          <p>
            所有形状组件都是<strong>纯代理</strong>——它们 <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 3, fontSize: 13 }}>return null</code>，
            只把 props 转为 JSON 投递到渲染引擎。这意味着你可以像普通 React 组件一样自由组合它们。
          </p>

          <SubSection title="几何形状">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>组件</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>关键属性</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Rect', 'x, y, width, height, rx, ry, fill, stroke, strokeWidth, opacity', '矩形（支持圆角）'],
                    ['Ellipse', 'cx, cy, rx, ry, fill, stroke', '椭圆'],
                    ['Line', 'points: {x,y}[], stroke, strokeWidth, closed', '折线（closed 控制闭合）'],
                    ['Path', 'd: string（SVG path 命令）, fill, stroke', '任意路径'],
                    ['Text', 'x, y, text, fontSize, fontFamily, fontWeight, fill, textAlign, textBaseline', '文本'],
                    ['Image', 'x, y, width, height, src', '图片'],
                    ['Points', 'cx: number[], cy: number[], rx?, ry?, fill?, stroke?', '批量圆点（高性能）'],
                  ].map(([comp, props, desc]) => (
                    <tr key={comp} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, color: '#1677ff' }}>{comp}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: '#595959' }}>{props}</td>
                      <td style={{ padding: '8px 12px', fontSize: 13, color: '#434343' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SubSection>

          <SubSection title="容器">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>组件</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Group', '分组容器，支持 x, y, rotation, scaleX, scaleY, opacity'],
                  ].map(([comp, desc]) => (
                    <tr key={comp} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, color: '#1677ff' }}>{comp}</td>
                      <td style={{ padding: '8px 12px', fontSize: 13, color: '#434343' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SubSection>

          <SubSection title="渐变定义">
            <CodeExample code={`{/* LinearGradient 需要用户指定 id */}
<LinearGradient id="myGrad" x1={0} y1={0} x2={1} y2={1}
  stops={[
    { offset: 0, color: '#1677ff' },
    { offset: 1, color: '#52c41a' },
  ]} />
<Rect x={50} y={50} width={200} height={100} fill="url(#myGrad)" />

{/* RadialGradient 同理 */}
<RadialGradient id="radial" cx={0.5} cy={0.5} r={0.5}
  stops={[
    { offset: 0, color: '#fff' },
    { offset: 1, color: '#1677ff' },
  ]} />
<Ellipse cx={150} cy={100} rx={80} ry={60} fill="url(#radial)" />`} />
          </SubSection>
        </Section>

        {/* ── 容器与特效 ── */}
        <Section id="containers" title="容器与特效">
          <SubSection title="ClipPath（裁剪容器）">
            <p>声明式硬裁剪容器，<code>clip</code> 传入几何形状，作用范围为全部 children。</p>
            <CodeExample code={`<ClipPath clip={<Ellipse cx={100} cy={100} rx={50} ry={50} />}>
  <Path d="M50,50 L200,50 L200,200 L50,200 Z" fill="blue" />
</ClipPath>`} />
          </SubSection>

          <SubSection title="Filter（滤镜容器）">
            <p>声明式滤镜容器，对标 Canvas 2D <code>ctx.filter</code>（CSS filter 字符串）。</p>
            <CodeExample code={`<Filter effects={[{ type: 'blur', value: 3 }]}>
  <Rect x={50} y={50} width={200} height={200} fill="blue" />
</Filter>

{/* 组合滤镜 */}
<Filter effects={[
  { type: 'dropShadow', value: 4, offsetX: 2, offsetY: 2, color: 'rgba(0,0,0,0.3)' },
  { type: 'grayscale', value: 50 },
]}>
  <Rect x={50} y={50} width={200} height={200} fill="blue" />
</Filter>`} />
            <p style={{ marginTop: 12 }}>
              支持的效果类型：<code>blur</code>、<code>brightness</code>、<code>contrast</code>、<code>dropShadow</code>、
              <code>grayscale</code>、<code>opacity</code>、<code>saturate</code>、<code>sepia</code>、<code>hueRotate</code>。
            </p>
          </SubSection>

          <SubSection title="Mask（遮罩容器）">
            <p>声明式软遮罩容器（通过透明度/亮度控制可见程度），区别于 ClipPath 的硬裁剪。</p>
            <CodeExample code={`<Mask mask={<Ellipse cx={100} cy={100} rx={50} ry={50} />} maskMode="alpha">
  <Rect x={50} y={50} width={200} height={200} fill="blue" />
</Mask>`} />
            <p style={{ marginTop: 12 }}>
              <code>maskMode</code> 支持 <code>"alpha"</code>（默认）和 <code>"luminance"</code> 两种模式。
            </p>
          </SubSection>
        </Section>

        {/* ── 事件 ── */}
        <Section id="events" title="事件系统">
          <p>
            所有形状组件（包括 Group）支持 React 风格事件 props，由引擎层 EventSystem 统一处理。
          </p>
          <p style={{ marginTop: 8 }}>
            支持的事件：<code>onClick</code>、<code>onDoubleClick</code>、<code>onContextMenu</code>、
            <code>onMouseDown</code>、<code>onMouseUp</code>、<code>onMouseMove</code>、
            <code>onMouseEnter</code>、<code>onMouseLeave</code>、<code>onPointerDown</code>、
            <code>onPointerUp</code>、<code>onPointerMove</code>、<code>onPointerEnter</code>、
            <code>onPointerLeave</code>、<code>onTouchStart</code>、<code>onTouchEnd</code>、
            <code>onTouchMove</code>、<code>onWheel</code>、<code>onDragStart</code>、
            <code>onDrag</code>、<code>onDragEnd</code>。
          </p>
          <CodeExample code={`<Rect x={50} y={50} width={100} height={80} fill="blue"
  onClick={(evt) => {
    console.log('点击位置:', evt.offsetX, evt.offsetY);
    evt.stopPropagation(); // 阻止事件冒泡
  }}
  onMouseEnter={() => console.log('鼠标进入')}
  onMouseLeave={() => console.log('鼠标离开')}
/>`} />
          <p style={{ marginTop: 12 }}>
            事件通过 parentId 链自动冒泡，支持 <code>stopPropagation()</code> 和 <code>preventDefault()</code>。
          </p>
        </Section>

        {/* ── 动画 ── */}
        <Section id="animation" title="动画">
          <p>
            <code>Animation</code> 容器提供声明式 Tween 动画。通过 playbook 定义动画步骤，
            支持分组并行/串行、循环、watch 监听触发。
          </p>
          <CodeExample code={`<Animation
  playbook={[
    { attribute: 'height', from: 0, duration: 600, easing: 'easeOutCubic', targets: 'children', stagger: 40 },
    { attribute: 'scaleX', from: 1, to: 1.5, duration: 400, group: 1 },
  ]}
  onComplete={() => console.log('动画完成')}
>
  <Rect x={50} y={50} width={100} height={200} fill="blue" />
</Animation>`} />
          <p style={{ marginTop: 12 }}>
            <strong>可动画属性：</strong>
            <code>x</code>、<code>y</code>、<code>rotation</code>、<code>scaleX</code>、<code>scaleY</code>（transform 类）
            和 <code>width</code>、<code>height</code>、<code>opacity</code>、<code>rx</code>、<code>ry</code>、
            <code>cx</code>、<code>cy</code>、<code>strokeWidth</code>、<code>fill</code>、<code>stroke</code>、
            <code>fontSize</code>（形状属性类）。
          </p>
          <p style={{ marginTop: 8 }}>
            <strong>targets</strong> 支持：
            <code>'children'</code>（穿透 ClipPath/Filter/Mask 作用到真实子形状）、
            命名 <code>id</code>（与效果容器混用时推荐）。
          </p>
          <p style={{ marginTop: 8 }}>
            子节点写<strong>最终视觉 props</strong>（<code>to</code> 可省略，默认取自当前 props），<code>from</code> 表示入场起点。
          </p>
          <CodeExample code={`{/* animate 方法：用 compute 自由控制任意属性 */}
<Animation playbook={[
  {
    duration: 900, easing: 'easeOutCubic', targets: 'progress-arc',
    compute: ({ progress }) => ({
      d: arcPath(arcCenterR, 0, valueRatio * progress),
    }),
  },
]}>
  <Path id="progress-arc" d={arcPath(arcCenterR, 0, valueRatio)}
        fill="none" stroke="#1677ff" strokeWidth={20} />
</Animation>`} />
        </Section>

        {/* ── 渲染引擎 ── */}
        <Section id="engine" title="渲染引擎">
          <SubSection title="SVG 模式">
            <p>
              默认渲染引擎。采用增量 DOM 更新策略：首次渲染创建完整 DOM，后续渲染只更新变化的属性。
              适合节点数较少、需要 SEO 友好或与其他 HTML 元素混合的场景。
            </p>
            <CodeExample code={`<ReactVizComposer engine="svg" width={600} height={400}>
  {/* 子组件 */}
</ReactVizComposer>`} />
          </SubSection>
          <SubSection title="Canvas 模式">
            <p>
              全量重绘 + 视口裁剪。每一帧重新绘制所有可见元素。适合大数据量、频繁更新的场景。
              支持 <code>cullMargin</code> 跳过视口外的节点绘制。
            </p>
            <CodeExample code={`<ReactVizComposer engine="canvas" width={600} height={400}>
  {/* 子组件 */}
</ReactVizComposer>`} />
          </SubSection>
        </Section>

        {/* ── 视口裁剪 ── */}
        <Section id="viewport" title="视口裁剪">
          <p>
            减少大数据量时的渲染压力。在 Canvas 和 SVG 模式下生效：节点在视口外（含边距扩展）→ 跳过绘制。
          </p>
          <CodeExample code={`<ReactVizComposer
  engine="canvas"
  width={800}
  height={600}
  cullMargin={{ top: 50, right: 50, bottom: 50, left: 50 }}
>
  {/* 大量节点 */}
</ReactVizComposer>`} />
          <p style={{ marginTop: 12 }}>
            不传 <code>cullMargin</code> 时默认启用四边各 20% 的裁剪边距。Path 节点不做裁剪（保守策略）。
          </p>
        </Section>

        {/* ── components ── */}
        <Section id="components" title="半成品工具 (components)">
          <p>
            <code>react-viz-composer</code> 的 <code>components/</code> 提供即用的可视化辅助组件，样式全部通过 props 控制。
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>组件</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#595959' }}>说明</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Axis', '坐标轴（length / crossAt / 颜色 / 字号均通过 props 控制）'],
                  ['Grid', '网格线（length / stroke 均 props）'],
                  ['Tooltip', '浮层（位置 / 样式均 props）'],
                  ['Legend', '图例（items + onItem* 事件，自行对接系列显隐）'],
                  ['MarkLine', '阈值线'],
                  ['MarkPoint', '标注点'],
                  ['MarkArea', '区间阴影'],
                  ['Crosshair', '十字准星（受控 x/y，配合 onMouseMove）'],
                  ['Brush', '框选矩形（受控几何，配合拖拽事件）'],
                ].map(([comp, desc]) => (
                  <tr key={comp} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, color: '#1677ff' }}>{comp}</td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#434343' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── 图表开发模式 ── */}
        <Section id="patterns" title="图表开发模式">
          <p>所有图表遵循统一模式，以 HorizontalBarChart 为例：</p>
          <CodeExample code={`import { Animation, Rect, Text } from 'react-viz-composer';
import { Axis, Grid } from 'react-viz-composer';

export function HorizontalBarChart(props: Props) {
  const { data, color = '#1677ff', onItemEnter, onItemLeave } = props;
  const dataset = data ?? [/* 默认数据 */];
  const categories = dataset.map(d => d.name);
  const yScale = scaleBand(categories, [0, plotHeight], 0.3);
  const xScale = scaleLinear([0, maxValue * 1.1], [0, plotWidth]);

  return (
    <ReactVizComposer width={width} height={height}>
      <Grid scale={xScale} orient="x" />
      <Animation playbook={[
        { attribute: 'width', from: 0, duration: 600,
          easing: 'easeOutCubic', targets: 'children', stagger: 40 },
      ]}>
        {dataset.map(d => (
          <Rect key={d.name} x={0} y={yScale(d.name)}
                width={xScale(d.value)} height={yScale.bandwidth}
                fill={color} />
        ))}
      </Animation>
      <Axis scale={xScale} orient="bottom" />
      <Axis scale={yScale} orient="left" />
    </ReactVizComposer>
  );
}`} />
          <h4 style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 8px' }}>关键约定</h4>
          <ol style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>形状写<strong>最终视觉 props</strong>，入场动画用 <code>&lt;Animation playbook&gt;</code></li>
            <li><code>targets: 'children'</code> 可穿透 ClipPath / Filter / Mask，也可用命名 id</li>
            <li>所有 <code>data</code> prop 可选，缺失时使用内置默认数据确保可独立渲染</li>
            <li>Named + Default 导出：<code>export function ChartName</code> + <code>export default ChartName</code></li>
            <li>mock 数据集中管理：<code>apps/charts/src/mockData.ts</code></li>
          </ol>
        </Section>

        {/* ── 类型导出 ── */}
        <Section id="types" title="类型导出">
          <p>以下类型可以从 <code>react-viz-composer</code> 导入：</p>
          <CodeExample code={`import type {
  // 渲染上下文
  VizRenderer,

  // 形状数据
  RectData, EllipseData, LineData, PathData, TextData,
  ImageData, PointsData, GroupData,

  // 事件
  VizEvent, ShapeEventProps,

  // 动画
  AnimStep, WatchConfig,

  // 渐变
  GradientStop, LinearGradientData, RadialGradientData,

  // 滤镜
  FilterEffect, FilterType,

  // 根组件
  ReactVizComposerProps, Viewport, CullMargin,
} from 'react-viz-composer';`} />
        </Section>

        <div style={{
          marginTop: 32,
          padding: '24px 32px',
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: 8,
          fontSize: 14,
          color: '#389e0d',
          lineHeight: 1.7,
        }}>
          <strong>💡 提示：</strong> 更多完整示例请查看{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo(0, 0); }} style={{ color: '#1677ff' }}>
            示例画廊
          </a>{' '}
          中 47 种参考实现。每个图表均可独立运行，附带 Tooltip 和 mock 数据。
        </div>
      </main>
    </div>
  );
}

export default DocsPage;
