/**
 * ChartDemos —— App 层图表演示（Hover + 可选实时模拟数据压测）
 */

import { useMemo } from 'react';
import { ChartHoverShell } from './ChartHoverShell';
import {
  BarChart, LineChart, ScatterChart, AreaChart, PieChart, RadarChart,
  CandlestickChart, GanttChart, HeatmapChart, FunnelChart, SankeyChart,
  TreeChart, ComboChart, BubbleChart, ExplorableScatterChart,
  WaterfallChart, HistogramChart, BoxplotChart, RoseChart, TreemapChart,
  ErrorBarChart, GaugeChart, CalendarHeatmapChart, TimelineChart,
  ParallelCoordinatesChart, ChordChart, EffectScatterChart, PolarBarChart,
  CircularGraphChart, SunburstChart, ThemeRiverChart, VennChart,
  WordCloudChart, LiquidFillChart, NetworkGraphChart, PictorialBarChart,
  DensityCloudChart, ContourChart, CurvatureCombChart, HorizontalBarChart,
  StackedBarChart, StackedAreaChart, StepLineChart, SmoothLineChart,
  DoughnutChart, SingleAxisScatterChart, BidirectionalBarChart,
  PercentStackedBarChart, PercentStackedAreaChart, RangeAreaChart,
  NestedPieChart, DualAxisChart, LollipopChart, DumbbellChart, SlopeChart,
  BulletChart, PopulationPyramidChart, ParetoChart, ViolinChart,
  RidgelineChart, HexbinChart, WaffleChart, ProgressRingChart, IcicleChart,
  CirclePackingChart, ArcDiagramChart, DendrogramChart, RadialTreeChart,
  AdjacencyMatrixChart, FlightLinesChart,
} from '@react-viz-composer/charts';
import {
  barData, lineData, lineCategories, scatterData,
  areaData, areaCategories, pieData, radarData,
  klineData, ganttData, heatmapCols, heatmapRows, heatmapData,
  funnelData, sankeyNodes, sankeyLinks, treeData,
  comboData, bubbleData, exploreScatterData,
  waterfallData, histogramData, boxplotData, roseData, treemapData,
  errorBarData, gaugeBaseConfig, gaugeValue, timelineData,
  parallelCoordinatesData, chordData, effectScatterData, polarBarData,
  circularGraphData, sunburstData, themeRiverCategories, themeRiverData,
  vennData, wordCloudData, liquidFillData, networkGraphData,
  densityCloudData, contourData, contourRows, contourCols, curvatureCombData,
  horizontalBarData, stackedBarData, stackedBarCategories,
  stackedAreaData, stackedAreaCategories,
  stepLineData, stepLineCategories,
  smoothLineData, smoothLineCategories,
  doughnutData, singleAxisScatterData, bidirectionalBarData,
} from '@react-viz-composer/charts/mockData';
import { forceLayout } from './forceLayout';
import {
  useLiveData,
  jitterValueItems,
  scrollSeries,
  jitterSeries,
  jitterScatterPoints,
  jitterRadarData,
  advanceKline,
  jitterHeatmap,
  jitterCombo,
  jitterBubbles,
  jitterHistogram,
  jitterBoxplot,
  jitterErrorBars,
  oscillateScalar,
  jitterWordCloud,
  jitterBidirectional,
  jitterSingleAxis,
  jitterParallelRows,
  jitterThemeRiver,
} from '../live';

/* ==================== 原有 Demo ==================== */

export function BarChartDemo() {
  const data = useLiveData(barData, (prev) => jitterValueItems(prev, 22));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <BarChart data={data} onItemEnter={(d, evt) => show(`${d.month}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function LineChartDemo() {
  const data = useLiveData(lineData, (prev) => scrollSeries(prev, 22));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <LineChart data={data} categories={lineCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function ScatterChartDemo() {
  const data = useLiveData(scatterData, (prev) => jitterScatterPoints(prev, 2.2));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ScatterChart data={data} onItemEnter={(p, evt) => show(`聚类 ${p.group + 1}\nx: ${p.x.toFixed(1)}\ny: ${p.y.toFixed(1)}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function AreaChartDemo() {
  const data = useLiveData(areaData, (prev) => scrollSeries(prev, 20));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <AreaChart data={data} categories={areaCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function PieChartDemo() {
  const data = useLiveData(pieData, (prev) => jitterValueItems(prev, 28, 20));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <PieChart data={data} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}\n占比: ${d.percent}%`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function RadarChartDemo() {
  const live = useLiveData(radarData, jitterRadarData);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <RadarChart indicator={live.indicator} series={live.series} onItemEnter={(d, evt) => show(`${d.series}\n${d.indicator}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function CandlestickChartDemo() {
  const data = useLiveData(klineData, advanceKline);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <CandlestickChart data={data} onItemEnter={(d, evt) => show(`日期: ${d.date}\n开: ${d.open} 收: ${d.close}\n高: ${d.high} 低: ${d.low}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function GanttChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <GanttChart data={ganttData} onItemEnter={(t, evt) => show(`${t.name}\n开始: 第 ${t.start} 天\n工期: ${t.duration} 天`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function HeatmapChartDemo() {
  const data = useLiveData(heatmapData, (prev) => jitterHeatmap(prev, 0.1));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <HeatmapChart cols={heatmapCols} rows={heatmapRows} data={data} onItemEnter={(d, evt) => show(`${d.row} · ${d.col}\n强度: ${d.value.toFixed(2)}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function FunnelChartDemo() {
  const data = useLiveData(funnelData, (prev) => jitterValueItems(prev, 20, 10));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <FunnelChart data={data} onItemEnter={(d, evt) => show(`${d.name}\n数量: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function SankeyChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <SankeyChart nodes={sankeyNodes} links={sankeyLinks} onItemEnter={(n, evt) => show(`${n.name}\n流入: ${n.inValue}\n流出: ${n.outValue}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function TreeChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <TreeChart data={treeData} onItemEnter={(n, evt) => show(`${n.name}\n深度: ${n.depth}\n子节点: ${n.childCount}\n叶子: ${n.leafCount}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function ComboChartDemo() {
  const data = useLiveData(comboData, jitterCombo);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ComboChart data={data} onItemEnter={(d, evt) => show(`${d.month}\n销量: ${d.sales}\n增长率: ${d.rate}%`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function BubbleChartDemo() {
  const data = useLiveData(bubbleData, jitterBubbles);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <BubbleChart data={data} onItemEnter={(d, evt) => show(`${d.name}\nGMV 指数: ${d.x} / ${d.y}\n规模: ${d.size}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function ExplorableScatterDemo() {
  return <ExplorableScatterChart data={exploreScatterData} />;
}

export function WaterfallChartDemo() {
  const data = useLiveData(waterfallData, (prev) =>
    prev.map((d, i) => (i === 0 || i === prev.length - 1
      ? d
      : { ...d, value: d.value >= 0
        ? Math.max(5, d.value + (Math.random() - 0.5) * 24)
        : Math.min(-5, d.value + (Math.random() - 0.5) * 24) })),
  );
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <WaterfallChart data={data} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function HistogramChartDemo() {
  const data = useLiveData(histogramData, jitterHistogram);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <HistogramChart data={data} onItemEnter={(d, evt) => show(`${d.bin}\n频次: ${d.count}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function BoxplotChartDemo() {
  const data = useLiveData(boxplotData, jitterBoxplot);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <BoxplotChart data={data} onItemEnter={(d, evt) => show(`${d.category}\n最小: ${d.min}\nQ1: ${d.q1}\n中位数: ${d.median}\nQ3: ${d.q3}\n最大: ${d.max}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function RoseChartDemo() {
  const data = useLiveData(roseData, (prev) => jitterValueItems(prev, 18, 10));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <RoseChart data={data} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function TreemapChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <TreemapChart data={treemapData} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function ErrorBarChartDemo() {
  const data = useLiveData(errorBarData, jitterErrorBars);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ErrorBarChart data={data} onItemEnter={(d, evt) => show(`${d.category}\n数值: ${d.value} ± ${d.error}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function GaugeChartDemo() {
  const value = useLiveData(gaugeValue, (prev) =>
    oscillateScalar(prev, gaugeBaseConfig.min, gaugeBaseConfig.max, 6),
  );
  return (
    <GaugeChart
      min={gaugeBaseConfig.min}
      max={gaugeBaseConfig.max}
      value={value}
      title="完成率"
    />
  );
}

export function CalendarHeatmapChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <CalendarHeatmapChart onItemEnter={(d, evt) => show(`${d.date}\n值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function TimelineChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <TimelineChart data={timelineData} onItemEnter={(d, evt) => show(`${d.time}\n${d.label}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

/* ==================== 新增图表 Demo（batch 1 + batch 2） ==================== */

export function ParallelCoordinatesChartDemo() {
  const live = useLiveData(parallelCoordinatesData, jitterParallelRows);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ParallelCoordinatesChart
          axes={live.axes}
          data={live.data}
          onItemEnter={(d, evt) => show(`第${d.row + 1}行\n${d.axes.map((a: string, i: number) => `${a}: ${d.values[i]}`).join('\n')}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function ChordChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ChordChart
          nodes={chordData.nodes}
          links={chordData.links}
          onItemEnter={(d, evt) => show(`${d.name}\n总流量: ${d.value}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function EffectScatterChartDemo() {
  const data = useLiveData(effectScatterData, (prev) => jitterScatterPoints(prev, 2));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <EffectScatterChart
          data={data}
          onItemEnter={(p, evt) => show(`聚类 ${p.group + 1}\nx: ${p.x.toFixed(1)}\ny: ${p.y.toFixed(1)}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function PolarBarChartDemo() {
  const data = useLiveData(polarBarData, (prev) => jitterValueItems(prev, 16, 5));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <PolarBarChart
          data={data}
          onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function CircularGraphChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <CircularGraphChart
          nodes={circularGraphData.nodes}
          edges={circularGraphData.edges}
          onItemEnter={(d, evt) => show(`${d.label}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function SunburstChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <SunburstChart
          data={sunburstData}
          onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function ThemeRiverChartDemo() {
  const series = useLiveData(themeRiverData, jitterThemeRiver);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ThemeRiverChart
          categories={themeRiverCategories}
          series={series}
          onItemEnter={(d, evt) => show(`${d.name}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function VennChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <VennChart
          sets={vennData}
          onItemEnter={(d, evt) => show(`${d.name}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function WordCloudChartDemo() {
  const data = useLiveData(wordCloudData, jitterWordCloud);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <WordCloudChart
          data={data}
          onItemEnter={(d, evt) => show(`${d.text}\n权重: ${d.weight}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function LiquidFillChartDemo() {
  const value = useLiveData(liquidFillData.value, (prev) =>
    oscillateScalar(prev, 10, liquidFillData.max ?? 100, 5),
  );
  return (
    <LiquidFillChart
      value={value}
      max={liquidFillData.max ?? 100}
    />
  );
}

export function NetworkGraphChartDemo() {
  const nodesWithPos = useMemo(
    () => forceLayout(networkGraphData.nodes, networkGraphData.edges),
    [],
  );
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <NetworkGraphChart
          nodes={nodesWithPos}
          edges={networkGraphData.edges}
          onItemEnter={(d, evt) => show(`${d.label}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function PictorialBarChartDemo() {
  return (
    <PictorialBarChart />
  );
}

/* ==================== 高级图表（batch 3） ==================== */

export function DensityCloudChartDemo() {
  return <DensityCloudChart data={densityCloudData} />;
}

export function ContourChartDemo() {
  return (
    <ContourChart
      data={contourData}
      rows={contourRows}
      cols={contourCols}
    />
  );
}

export function CurvatureCombChartDemo() {
  return <CurvatureCombChart data={curvatureCombData} animate />;
}

/* ==================== 新增 8 个图表 Demo（batch 4） ==================== */

export function HorizontalBarChartDemo() {
  const data = useLiveData(horizontalBarData, (prev) => jitterValueItems(prev, 20));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <HorizontalBarChart data={data} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function StackedBarChartDemo() {
  const data = useLiveData(stackedBarData, (prev) => jitterSeries(prev, 14));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <StackedBarChart data={data} categories={stackedBarCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function StackedAreaChartDemo() {
  const data = useLiveData(stackedAreaData, (prev) => scrollSeries(prev, 16));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <StackedAreaChart data={data} categories={stackedAreaCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function StepLineChartDemo() {
  const data = useLiveData(stepLineData, (prev) => scrollSeries(prev, 18));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <StepLineChart data={data} categories={stepLineCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function SmoothLineChartDemo() {
  const data = useLiveData(smoothLineData, (prev) => scrollSeries(prev, 18));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <SmoothLineChart data={data} categories={smoothLineCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function DoughnutChartDemo() {
  const data = useLiveData(doughnutData, (prev) => jitterValueItems(prev, 24, 20));
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <DoughnutChart data={data} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}\n占比: ${d.percent}%`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function SingleAxisScatterChartDemo() {
  const data = useLiveData(singleAxisScatterData, jitterSingleAxis);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <SingleAxisScatterChart data={data} onItemEnter={(p, evt) => show(`值: ${p.value}\n尺寸: ${p.size}\n聚类: ${p.group + 1}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function BidirectionalBarChartDemo() {
  const data = useLiveData(bidirectionalBarData, jitterBidirectional);
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <BidirectionalBarChart data={data} onItemEnter={(d, evt) => show(`${d.name}\n${d.direction === 'positive' ? '正向: ' : '负向: '}${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

/* ==================== 新增二维图表 Demo ==================== */

export function PercentStackedBarChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <PercentStackedBarChart onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}%`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function PercentStackedAreaChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <PercentStackedAreaChart onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}%`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function RangeAreaChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <RangeAreaChart onItemEnter={(d, evt) => show(`${d.name}\n${d.low} ~ ${d.high}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function NestedPieChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <NestedPieChart onItemEnter={(d, evt) => show(`${d.ring}: ${d.name}\n数值: ${d.value}\n占比: ${d.percent}%`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function DualAxisChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <DualAxisChart onItemEnter={(d, evt) => show(`${d.category}\n柱: ${d.bar}\n线: ${d.line}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function LollipopChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <LollipopChart onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function DumbbellChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <DumbbellChart onItemEnter={(d, evt) => show(`${d.name}\n${d.start} → ${d.end}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function SlopeChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <SlopeChart onItemEnter={(d, evt) => show(`${d.name}\n${d.left} → ${d.right}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function BulletChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <BulletChart onItemEnter={(d, evt) => show(`${d.name}\n实际: ${d.value}\n目标: ${d.target}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function PopulationPyramidChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <PopulationPyramidChart onItemEnter={(d, evt) => show(`${d.age}\n${d.gender === 'male' ? '男' : '女'}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function ParetoChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ParetoChart onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function ViolinChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ViolinChart onItemEnter={(d, evt) => show(`${d.name}\n中位数: ${d.median}\nn=${d.count}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function RidgelineChartDemo() {
  return <RidgelineChart />;
}

export function HexbinChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <HexbinChart onItemEnter={(d, evt) => show(`计数: ${d.count}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function WaffleChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <WaffleChart onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function ProgressRingChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ProgressRingChart onItemEnter={(d, evt) => show(`${d.name}\n${d.value}/${d.max} (${d.percent}%)`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function IcicleChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <IcicleChart onItemEnter={(d, evt) => show(`${d.name}\n深度: ${d.depth}\n${d.value ?? ''}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function CirclePackingChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <CirclePackingChart onItemEnter={(d, evt) => show(`${d.name}\n深度: ${d.depth}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function ArcDiagramChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ArcDiagramChart
          onItemEnter={(d, evt) => {
            const text = 'id' in d ? `${d.id}\n度数: ${d.degree}` : `${d.source} → ${d.target}\n${d.value}`;
            show(text, evt);
          }}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function DendrogramChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <DendrogramChart onItemEnter={(d, evt) => show(`${d.name}\n深度: ${d.depth}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function RadialTreeChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <RadialTreeChart onItemEnter={(d, evt) => show(`${d.name}\n深度: ${d.depth}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function AdjacencyMatrixChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <AdjacencyMatrixChart onItemEnter={(d, evt) => show(`${d.row} → ${d.col}\n${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function FlightLinesChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <FlightLinesChart
          onItemEnter={(d, evt) => {
            const text = 'id' in d ? `${d.name || d.id}\n度数: ${d.degree}` : `${d.from} → ${d.to}\n${d.value}`;
            show(text, evt);
          }}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}
