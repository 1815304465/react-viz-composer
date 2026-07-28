/**
 * @react-viz-composer/utilities
 *
 * Zero-dependency pure utility functions.
 * All exports are tree-shakeable pure functions and constants — no React, no side effects.
 */

// Scales
export {
  scaleLinear,
  scaleBand,
} from './scales';
export type { LinearScale, BandScale } from './scales';

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
} from './palette';

// Animation helpers
export {
  easeOutCubic,
  animValue,
  animSize,
} from './animation-helpers';

// Chart helpers
export {
  hoverStrokeWidth,
  hoverOpacity,
} from './chart-helpers';
