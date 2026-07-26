/**
 * CodeBlock —— 带语法高亮的代码块
 *
 * 包装 prism-react-renderer
 * - 顶部带"复制"按钮 + 语言标签
 * - 显示行号
 * - 自定义 antd 风格配色
 */

import { useState } from 'react';
import { Highlight } from 'prism-react-renderer';
import { Button, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

interface Props {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'tsx' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      message.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      message.error('复制失败');
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        background: '#fafafa',
        border: '1px solid #e8e8e8',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {/* 顶部工具栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 12px',
          background: '#f5f5f5',
          borderBottom: '1px solid #e8e8e8',
        }}
      >
        <span style={{ fontSize: 12, color: '#8c8c8c' }}>{language.toUpperCase()}</span>
        <Button
          size="small"
          type="text"
          icon={<CopyOutlined />}
          onClick={handleCopy}
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </div>

      {/* 代码区 */}
      <Highlight code={code.replace(/\n$/, '')} language={language} theme={customTheme}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={className}
            style={{
              ...style,
              margin: 0,
              padding: '12px 16px',
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
              overflowX: 'auto',
              background: '#fafafa',
            }}
          >
            {tokens.map((line, i) => {
              const lineProps = getLineProps({ line });
              return (
                <div key={i} {...lineProps} style={{ display: 'flex' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 28,
                      flexShrink: 0,
                      color: '#bfbfbf',
                      textAlign: 'right',
                      paddingRight: 12,
                      userSelect: 'none',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ flex: 1 }}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

/* 自定义 antd 风格配色：与 antd 官网代码块一致 */
const customTheme = {
  plain: {
    color: '#262626',
    backgroundColor: 'transparent',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: '#8c8c8c', fontStyle: 'italic' },
    },
    {
      types: ['punctuation'],
      style: { color: '#595959' },
    },
    {
      types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol', 'deleted'],
      style: { color: '#1677ff' },
    },
    {
      types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'],
      style: { color: '#52c41a' },
    },
    {
      types: ['operator', 'entity', 'url', 'variable'],
      style: { color: '#fa8c16' },
    },
    {
      types: ['atrule', 'attr-value', 'function', 'class-name'],
      style: { color: '#722ed1' },
    },
    {
      types: ['keyword', 'regex', 'important'],
      style: { color: '#f5222d', fontWeight: 'bold' },
    },
  ],
} as any;

export default CodeBlock;
