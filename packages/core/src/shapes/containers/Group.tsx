import { pick, shallowMerge } from '../../utils/object';
import { type ReactNode } from 'react';
import { ParentIdContext } from '../../context';
import type { GroupData, Transform } from '../../engine/types';
import type { ShapeEventProps } from '../events';
import {
  resolveShapeProps,
  GROUP_DATA_KEYS,
  GROUP_TRANSFORM_KEYS,
  GROUP_TRANSFORM_DEFAULTS,
  useShapeElement,
} from '../register';

interface GroupProps extends Transform, GroupData, ShapeEventProps {
  id?: string;
  children?: ReactNode;
}

/**
 * Group —— 变换分组 + 事件冒泡节点（递归渲染版）
 *
 * 自身注册为 'group' 节点挂在 SceneTree 中，提供 ParentIdContext 给子节点。
 * transform 写入 data.transform，由渲染器在递归时合成 worldMatrix。
 */
function Group(props: GroupProps) {
  const { id, data, eventProps } = resolveShapeProps(props, GROUP_DATA_KEYS);
  const transform = shallowMerge(
    GROUP_TRANSFORM_DEFAULTS,
    pick(props, GROUP_TRANSFORM_KEYS),
  ) as Required<typeof GROUP_TRANSFORM_DEFAULTS>;

  // 把自己注册为 'group' 节点，data 中带 transform
  const resolvedId = useShapeElement(
    'group',
    id,
    { ...(data as GroupData), transform } as GroupData & { transform: Transform },
    eventProps,
  );

  return (
    <ParentIdContext.Provider value={resolvedId}>
      {props.children}
    </ParentIdContext.Provider>
  );
}

export default Group;
export { Group };
