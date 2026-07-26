import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Spin } from 'antd';

interface ViewportRenderProps {
  children: ReactNode;
  /** 占位最小高度，与 DemoBlock 渲染区一致 */
  minHeight?: number;
  /** 提前加载的视口外边距 */
  rootMargin?: string;
  /** 首次进入视口后是否保持挂载 */
  once?: boolean;
  placeholder?: ReactNode;
}

/**
 * 视口懒渲染：元素进入可视区域后才挂载 children
 * @param props.children 进入视口后渲染的内容
 */
function ViewportRender(props: ViewportRenderProps) {
  const {
    children,
    minHeight = 440,
    rootMargin = '160px 0px',
    once = true,
    placeholder,
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || (once && visible)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          if (!once) setVisible(false);
          return;
        }
        setVisible(true);
        if (once) observer.disconnect();
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, once, visible]);

  const fallback = placeholder ?? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        color: '#bfbfbf',
        fontSize: 13,
      }}
    >
      <Spin size="small" />
      <span style={{ marginLeft: 8 }}>滚动到可视区域后加载图表</span>
    </div>
  );

  return (
    <div ref={rootRef} style={{ minHeight, width: '100%' }}>
      {visible ? children : fallback}
    </div>
  );
}

export default ViewportRender;
export { ViewportRender };
