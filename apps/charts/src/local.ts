/**
 * apps/charts 本地构图辅助（示例专用，不随 @react-viz-composer/kit 发布）
 */

export { scaleLinear, scaleBand } from './utils/scales';
export type { LinearScale, BandScale } from './utils/scales';

export {
  CATEGORY_12,
  SEMANTIC_6,
  KLINE_UP,
  KLINE_DOWN,
  AXIS_COLOR,
  GRID_COLOR,
  TEXT_COLOR,
  TEXT_LIGHT,
  colorAt,
} from './utils/palette';

export { easeOutCubic, animValue, animSize } from './utils/animation-helpers';
export { hoverStrokeWidth, hoverOpacity } from './utils/chart-helpers';

export {
  ChartFrame,
  useChartSize,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  CHART_WIDTH,
  CHART_HEIGHT,
  PADDING,
  CHART_DEFAULT_VIEWPORT,
  COLORS,
} from './shared/ChartFrame';
export type { ChartSize, ChartPadding } from './shared/ChartFrame';

export {
  ExplorableChartFrame,
  EXPLORE_WIDTH,
  EXPLORE_HEIGHT,
} from './shared/ExplorableChartFrame';

export { useChartItemHover, itemHoverProps } from './shared/chartEvents';
export type { ChartItemHoverProps } from './shared/chartEvents';
