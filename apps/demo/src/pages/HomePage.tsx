/**
 * HomePage —— ReactVizComposer 首页
 *
 * 展示组件哲学、核心特性、快速上手指引。
 */

import { useState } from 'react';
import { Button } from 'antd';
import {
  ThunderboltOutlined,
  ApartmentOutlined,
  EyeOutlined,
  RocketOutlined,
  ExperimentOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { CodeBlock } from '../components/CodeBlock';

const QUICK_START_CODE = `import { ReactVizComposer, Rect, Text } from '@react-viz-composer/core';

export default function HelloViz() {
  return (
    <ReactVizComposer width={600} height={300} engine="svg">
      <Rect x={50} y={80} width={120} height={100} rx={8}
            fill="#1677ff" stroke="#0958d9" strokeWidth={2} />
      <Text x={110} y={140} text="Hello Viz!"
            fontSize={18} fill="#fff" fontWeight="bold"
            textAlign="middle" textBaseline="middle" />
    </ReactVizComposer>
  );
}`;

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const features: FeatureCard[] = [
  {
    icon: <ApartmentOutlined />,
    title: '声明式数据驱动',
    desc: '将图表拆解为 Rect、Ellipse、Line、Path、Text 等底层形状，用 JSX 描述视觉，引擎统一渲染。',
  },
  {
    icon: <ThunderboltOutlined />,
    title: '双引擎渲染',
    desc: '同时支持 SVG（增量 DOM 更新）和 Canvas（全量重绘 + 视口裁剪），按场景自由切换。',
  },
  {
    icon: <EyeOutlined />,
    title: '统一事件系统',
    desc: 'React 风格事件 props（onClick / onMouseEnter ...），引擎层统一命中检测 + 冒泡分发。',
  },
  {
    icon: <ExperimentOutlined />,
    title: '动画 & 特效',
    desc: '声明式 Tween 动画（<Animation playbook>），支持 ClipPath / Filter / Mask 容器。',
  },
  {
    icon: <ToolOutlined />,
    title: '半成品工具集',
    desc: '提供 Axis、Grid、Tooltip、Legend、Crosshair、Brush 等即用组件，样式全 props 可控。',
  },
  {
    icon: <RocketOutlined />,
    title: '47 种图表参考',
    desc: '覆盖 ECharts 全品类，每种图表均可独立渲染，附带 mock 数据 + Tooltip 示例。',
  },
];

export interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px' }}>
      {/* ─── Hero ─── */}
      <section style={{ paddingTop: 72, paddingBottom: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, color: '#141414', margin: '0 0 20px', lineHeight: 1.25 }}>
          React 声明式可视化框架
        </h1>
        <p style={{ fontSize: 20, color: '#595959', maxWidth: 640, margin: '0 auto 32px', lineHeight: 1.6 }}>
          ReactVizComposer 将可视化拆解为底层图形元素，
          <br />
          用 JSX 描述视觉，由引擎统一渲染。
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button type="primary" size="large" onClick={() => onNavigate('examples')}>
            浏览示例
          </Button>
          <Button size="large" onClick={() => onNavigate('docs')}>
            阅读文档
          </Button>
        </div>
      </section>

      {/* ─── 哲学 ─── */}
      <section style={{ paddingTop: 40, paddingBottom: 40 }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, color: '#141414', margin: '0 0 8px', textAlign: 'center' }}>
          设计哲学
        </h2>
        <p style={{ fontSize: 15, color: '#8c8c8c', margin: '0 auto 40px', textAlign: 'center', maxWidth: 520 }}>
          你的可视化，不应该被图表库的配置项束缚。
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          <PhilosophyCard
            title="图形即组件"
            desc="图表不是配置项的组合，而是 Rect、Line、Path 等基本图形的有机排列。每个图形就是一个 React 组件，用你最熟悉的 JSX 描述你想要的任何可视化。"
          />
          <PhilosophyCard
            title="数据与渲染分离"
            desc='React 组件负责"声明"，引擎负责"执行"。形状组件不渲染任何 DOM，只将 props 转为 JSON 数据，通过 Context 投递给纯 TypeScript 渲染引擎。'
          />
          <PhilosophyCard
            title="渐进式复杂度"
            desc="从最简单的柱状图到复杂的弦图，核心 API 始终保持一致。没有陡峭的学习曲线——你只需要理解基本图形和组合的方式。"
          />
        </div>
      </section>

      {/* ─── 特性卡片 ─── */}
      <section style={{ paddingTop: 40, paddingBottom: 40 }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, color: '#141414', margin: '0 0 32px', textAlign: 'center' }}>
          核心特性
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: 24,
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ fontSize: 28, color: '#1677ff', marginBottom: 16 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: '#141414', margin: '0 0 8px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: '#595959', margin: 0, lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 快速上手 ─── */}
      <section style={{ paddingTop: 40, paddingBottom: 80 }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, color: '#141414', margin: '0 0 24px', textAlign: 'center' }}>
          快速上手
        </h2>
        <div style={{ background: '#fafafa', borderRadius: 8, padding: 4, marginBottom: 16 }}>
          <CodeBlock code={QUICK_START_CODE} language="tsx" />
        </div>

        {!expanded ? (
          <div style={{ textAlign: 'center' }}>
            <Button type="link" onClick={() => setExpanded(true)}>
              查看更多入门指南 →
            </Button>
          </div>
        ) : (
          <div style={{ marginTop: 32 }}>
            <QuickStartSection
              title="安装"
              content={`npm install @react-viz-composer/core @react-viz-composer/kit`}
              lang="bash"
            />
            <QuickStartSection
              title="使用半成品坐标轴"
              content={`import { ReactVizComposer, Rect } from '@react-viz-composer/core';
import { Axis, Grid } from '@react-viz-composer/kit';

export function MyBarChart() {
  return (
    <ReactVizComposer width={600} height={400} engine="svg">
      <Grid scale={xScale} orient="x" />
      <Axis scale={xScale} orient="bottom" length={400} crossAt={0} />
      <Axis scale={yScale} orient="left" length={300} crossAt={0} />
      {data.map(d => (
        <Rect key={d.name} x={0} y={yScale(d.name)}
              width={xScale(d.value)} height={yScale.bandwidth}
              fill="#1677ff" />
      ))}
    </ReactVizComposer>
  );
}`}
            />
            <QuickStartSection
              title="添加动画"
              content={`import { Animation, Rect } from '@react-viz-composer/core';

<Animation playbook={[
  { attribute: 'width', from: 0, duration: 600,
    easing: 'easeOutCubic', targets: 'children', stagger: 40 },
]}>
  {bars.map((bar) => (
    <Rect key={bar.id} x={0} y={bar.y}
          width={bar.w} height={bar.h} fill="#1677ff" />
  ))}
</Animation>`}
            />
            <QuickStartSection
              title="绑定事件"
              content={`<Rect x={50} y={50} width={100} height={80} fill="blue"
  onClick={(evt) => console.log('点击了矩形', evt)}
  onMouseEnter={(evt) => console.log('鼠标进入')}
  onMouseLeave={(evt) => console.log('鼠标离开')}
/>`}
            />
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Button type="primary" onClick={() => onNavigate('docs')}>
                查看完整文档 →
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── 哲学卡片 ─── */

function PhilosophyCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ padding: '24px 20px' }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#141414', margin: '0 0 10px' }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: '#595959', margin: 0, lineHeight: 1.7 }}>
        {desc}
      </p>
    </div>
  );
}

/* ─── 快速上手段落 ─── */

function QuickStartSection({ title, content, lang = 'tsx' }: { title: string; content: string; lang?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 17, fontWeight: 600, color: '#141414', margin: '0 0 10px' }}>
        {title}
      </h3>
      <div style={{ background: '#fafafa', borderRadius: 8, padding: 4 }}>
        <CodeBlock code={content} language={lang} />
      </div>
    </div>
  );
}

export default HomePage;
