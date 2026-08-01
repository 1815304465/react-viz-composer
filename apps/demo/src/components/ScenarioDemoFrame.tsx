import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Size {
  width: number;
  height: number;
}

interface Props {
  /** 占位高度（同时作为渲染高度） */
  height: number;
  /** 根据实测尺寸渲染场景 */
  children: (size: Size) => ReactNode;
}

/**
 * 场景演示容器：按父级宽度铺满，并把实测宽高交给子场景
 */
function ScenarioDemoFrame(props: Props) {
  const { height, children } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const next = Math.max(320, Math.floor(el.clientWidth));
      setWidth((prev) => (prev === next ? prev : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: '100%', height, minHeight: height }}>
      {width > 0 ? children({ width, height }) : null}
    </div>
  );
}

export default ScenarioDemoFrame;
export { ScenarioDemoFrame };
