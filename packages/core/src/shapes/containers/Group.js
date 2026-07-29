import { jsx as _jsx } from "react/jsx-runtime";
import { pick, merge } from 'lodash-es';
import { ParentIdContext } from '../../context';
import { resolveShapeProps, GROUP_DATA_KEYS, GROUP_TRANSFORM_KEYS, GROUP_TRANSFORM_DEFAULTS, useShapeElement, } from '../register';
/**
 * Group —— 变换分组 + 事件冒泡节点（递归渲染版）
 *
 * 自身注册为 'group' 节点挂在 SceneTree 中，提供 ParentIdContext 给子节点。
 * transform 写入 data.transform，由渲染器在递归时合成 worldMatrix。
 */
function Group(props) {
    const { id, data, eventProps } = resolveShapeProps(props, GROUP_DATA_KEYS);
    const transform = merge({}, GROUP_TRANSFORM_DEFAULTS, pick(props, GROUP_TRANSFORM_KEYS));
    // 把自己注册为 'group' 节点，data 中带 transform
    const resolvedId = useShapeElement('group', id, { ...data, transform }, eventProps);
    return (_jsx(ParentIdContext.Provider, { value: resolvedId, children: props.children }));
}
export default Group;
export { Group };
