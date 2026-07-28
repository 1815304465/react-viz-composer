/**
 * @react-viz-composer/components
 *
 * Chart building blocks — ChartFrame, Axis, scales, palette, entry progress helpers.
 */

// ChartFrame
export {
  ChartFrame,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  CHART_WIDTH,
  CHART_HEIGHT,
  PADDING,
  CHART_DEFAULT_VIEWPORT,
  COLORS,
} from './shared/ChartFrame';

// ExplorableChartFrame
export {
  ExplorableChartFrame,
  EXPLORE_WIDTH,
  EXPLORE_HEIGHT,
} from './shared/ExplorableChartFrame';

// Axis & Grid
export { Axis, Grid } from './shared/Axis';

// Scales
export {
  scaleLinear,
  scaleBand,
} from './shared/scales';
export type { LinearScale, BandScale } from './shared/scales';

// Palette
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
} from './shared/palette';

// Chart events (hover)
export {
  useChartItemHover,
  hoverStrokeWidth,
  hoverOpacity,
  itemHoverProps,
} from './shared/chartEvents';
export type { ChartItemHoverProps } from './shared/chartEvents';

// Entry progress
export {
  ChartEntryProgressProvider,
  useEntryProgress,
  animValue,
  animSize,
  easeOutCubic,
  createEntryProgressStore,
} from './shared/useEntryProgress';
export type { EntryProgressStore } from './shared/useEntryProgress';

// Mock data
export {
  barData,
  lineData,
  lineCategories,
  scatterData,
  areaData,
  areaCategories,
  pieData,
  radarData,
  klineData,
  ganttData,
  heatmapCols,
  heatmapRows,
  heatmapData,
  funnelData,
  sankeyNodes,
  sankeyLinks,
  treeData,
  comboData,
  bubbleData,
  exploreScatterData,
  waterfallData,
  histogramData,
  boxplotData,
  roseData,
  treemapData,
  errorBarData,
  gaugeBaseConfig,
  gaugeValue,
  timelineData,
  parallelCoordinatesData,
  chordData,
  effectScatterData,
  polarBarData,
  circularGraphData,
  sunburstData,
  themeRiverCategories,
  themeRiverData,
  vennData,
  wordCloudData,
  liquidFillData,
  networkGraphData,
  densityCloudData,
  contourData,
  contourRows,
  contourCols,
  curvatureCombData,
  horizontalBarData,
  stackedBarData,
  stackedBarCategories,
  stackedAreaData,
  stackedAreaCategories,
  stepLineData,
  stepLineCategories,
  smoothLineData,
  smoothLineCategories,
  doughnutData,
  singleAxisScatterData,
  bidirectionalBarData,
} from './shared/mockData';
