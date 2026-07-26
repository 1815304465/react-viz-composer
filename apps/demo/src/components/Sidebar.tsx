/**
 * Sidebar —— 右侧锚点导航
 */

import { Anchor, Typography } from 'antd';

const { Title } = Typography;

const items: any[] = [
  {
    key: 'showcase',
    href: '#group-showcase',
    title: '特色能力',
    children: [
      { key: 'combo', href: '#chart-combo', title: '柱线混合' },
      { key: 'bubble', href: '#chart-bubble', title: '气泡图' },
      { key: 'explore', href: '#chart-explore', title: '可探索散点' },
    ],
  },
  {
    key: 'basic',
    href: '#group-basic',
    title: '基础图表',
    children: [
      { key: 'bar', href: '#chart-bar', title: '柱状图' },
      { key: 'line', href: '#chart-line', title: '折线图' },
      { key: 'scatter', href: '#chart-scatter', title: '散点图' },
    ],
  },
  {
    key: 'advanced',
    href: '#group-advanced',
    title: '进阶图表',
    children: [
      { key: 'area', href: '#chart-area', title: '面积图' },
      { key: 'pie', href: '#chart-pie', title: '饼图' },
      { key: 'radar', href: '#chart-radar', title: '雷达图' },
    ],
  },
  {
    key: 'business',
    href: '#group-business',
    title: '业务图表',
    children: [
      { key: 'kline', href: '#chart-candlestick', title: 'K线图' },
      { key: 'gantt', href: '#chart-gantt', title: '甘特图' },
      { key: 'heatmap', href: '#chart-heatmap', title: '热力图' },
    ],
  },
  {
    key: 'others',
    href: '#group-others',
    title: '其他图表',
    children: [
      { key: 'funnel', href: '#chart-funnel', title: '漏斗图' },
      { key: 'sankey', href: '#chart-sankey', title: '桑基图' },
      { key: 'tree', href: '#chart-tree', title: '树图' },
    ],
  },
];

export function Sidebar() {
  return (
    <div style={{ padding: '24px 0 24px 24px' }}>
      <Title level={5} style={{ marginTop: 0 }}>
        图表目录
      </Title>
      <Anchor
        items={items}
        affix={false}
        offsetTop={80}
        targetOffset={80}
      />
    </div>
  );
}

export default Sidebar;
