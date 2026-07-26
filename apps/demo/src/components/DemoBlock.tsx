/**
 * DemoBlock —— 单个图表演示块（仿 antd 官网）
 *
 * 顶部：标题 + 描述
 * 中部：图表渲染区
 * 底部：可展开的代码块
 */

import { useState, type ReactNode } from 'react';
import { Card, Button, Typography } from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import { CodeBlock } from './CodeBlock';
import { ViewportRender } from './ViewportRender';

const { Title, Paragraph } = Typography;

interface Props {
  id: string;
  title: string;
  description?: string;
  code: string;
  children: ReactNode;
  /** 是否仅在进入视口后渲染图表，默认 true */
  lazy?: boolean;
}

export function DemoBlock(props: Props) {
  const { id, title, description, code, children, lazy = true } = props;
  const [showCode, setShowCode] = useState(false);

  return (
    <div id={id} style={{ marginBottom: 48, scrollMarginTop: 24 }}>
      <Card
        variant="outlined"
        style={{ borderRadius: 8 }}
        title={
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
        }
        extra={
          <Button
            type={showCode ? 'primary' : 'default'}
            icon={<CodeOutlined />}
            onClick={() => setShowCode((v) => !v)}
          >
            {showCode ? '隐藏代码' : '显示代码'}
          </Button>
        }
      >
        {description && (
          <Paragraph type="secondary" style={{ marginTop: 0 }}>
            {description}
          </Paragraph>
        )}

        {/* 渲染区：白底 + 居中 */}
        <div
          style={{
            background: '#fff',
            padding: '24px 0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {lazy ? (
            <ViewportRender minHeight={440}>
              {children}
            </ViewportRender>
          ) : (
            <div style={{ minHeight: 440, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {children}
            </div>
          )}
        </div>

        {/* 代码区 */}
        {showCode && (
          <div style={{ marginTop: 16 }}>
            <CodeBlock code={code} />
          </div>
        )}
      </Card>
    </div>
  );
}

export default DemoBlock;
