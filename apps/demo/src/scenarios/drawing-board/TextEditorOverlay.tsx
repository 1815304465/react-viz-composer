import { Input } from 'antd';
import type { Viewport } from 'react-viz-composer';
import type { DrawingBoardAction, TextEditSession } from './types';
import { worldToScreen } from './coords';

interface Props {
  session: TextEditSession;
  viewport: Viewport;
  dispatch: React.Dispatch<DrawingBoardAction>;
}

/**
 * 画布文本输入浮层（新建 / 编辑）
 */
function TextEditorOverlay(props: Props) {
  const { session, viewport, dispatch } = props;

  const { x, y } = worldToScreen(session.worldX, session.worldY, viewport);

  return (
    <Input
      autoFocus
      size="small"
      value={session.value}
      onChange={(e) => {
        dispatch({
          type: 'OPEN_TEXT_EDIT',
          session: { ...session, value: e.target.value },
        });
      }}
      onBlur={() => dispatch({ type: 'COMMIT_TEXT', text: session.value })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          dispatch({ type: 'COMMIT_TEXT', text: session.value });
        }
        if (e.key === 'Escape') {
          dispatch({ type: 'CLOSE_TEXT_EDIT' });
        }
      }}
      style={{
        position: 'absolute',
        left: x,
        top: y - 14,
        minWidth: 120,
        zIndex: 10,
        transform: 'translate(-2px, -50%)',
      }}
    />
  );
}

export default TextEditorOverlay;
