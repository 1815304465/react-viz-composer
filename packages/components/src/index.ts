/**
 * @react-viz-composer/components
 *
 * Chart building blocks — ChartFrame, Axis, hooks, and re-exports from utilities.
 */

// ── Re-export pure utilities ──
export {
  scaleLinear,
  scaleBand,
  CATEGORY_12,
  SEMANTIC_6,
  KLINE_UP,
  KLINE_DOWN,
  AXIS_COLOR,
  GRID_COLOR,
  TEXT_COLOR,
  TEXT_LIGHT,
  colorAt,
  easeOutCubic,
  animValue,
  animSize,
  hoverStrokeWidth,
  hoverOpacity,
} from '@react-viz-composer/utilities';
export type { LinearScale, BandScale } from '@react-viz-composer/utilities';

// ── ChartFrame ──
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

// ── ExplorableChartFrame ──
export {
  ExplorableChartFrame,
  EXPLORE_WIDTH,
  EXPLORE_HEIGHT,
} from './shared/ExplorableChartFrame';

// ── Axis & Grid ──
export { Axis, Grid } from './shared/Axis';

// ── Chart events (hover) ──
export {
  useChartItemHover,
  itemHoverProps,
} from './shared/chartEvents';
export type { ChartItemHoverProps } from './shared/chartEvents';

// ── Entry progress ──
export {
  ChartEntryProgressProvider,
  useEntryProgress,
  useEntryAnimation,
  EntryAnimationRegistry,
  createEntryProgressStore,
} from './shared/useEntryProgress';
export type { EntryProgressStore } from './shared/useEntryProgress';

// ── Mock data ──
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
