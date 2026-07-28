/**
 * ChartDemos —— App 层图表演示（Hover + 入场动画由图表 progress 驱动）
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
} from '@react-viz-composer/components';
import { forceLayout } from './forceLayout';

/* ==================== 原有 Demo（不变） ==================== */

export function BarChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <BarChart data={barData} onItemEnter={(d, evt) => show(`${d.month}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function LineChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <LineChart data={lineData} categories={lineCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function ScatterChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ScatterChart data={scatterData} onItemEnter={(p, evt) => show(`聚类 ${p.group + 1}\nx: ${p.x.toFixed(1)}\ny: ${p.y.toFixed(1)}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function AreaChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <AreaChart data={areaData} categories={areaCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function PieChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <PieChart data={pieData} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}\n占比: ${d.percent}%`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function RadarChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <RadarChart indicator={radarData.indicator} series={radarData.series} onItemEnter={(d, evt) => show(`${d.series}\n${d.indicator}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function CandlestickChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <CandlestickChart data={klineData} onItemEnter={(d, evt) => show(`日期: ${d.date}\n开: ${d.open} 收: ${d.close}\n高: ${d.high} 低: ${d.low}`, evt)} onItemLeave={hide} />
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
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <HeatmapChart cols={heatmapCols} rows={heatmapRows} data={heatmapData} onItemEnter={(d, evt) => show(`${d.row} · ${d.col}\n强度: ${d.value.toFixed(2)}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function FunnelChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <FunnelChart data={funnelData} onItemEnter={(d, evt) => show(`${d.name}\n数量: ${d.value}`, evt)} onItemLeave={hide} />
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
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ComboChart data={comboData} onItemEnter={(d, evt) => show(`${d.month}\n销量: ${d.sales}\n增长率: ${d.rate}%`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function BubbleChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <BubbleChart data={bubbleData} onItemEnter={(d, evt) => show(`${d.name}\nGMV 指数: ${d.x} / ${d.y}\n规模: ${d.size}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function ExplorableScatterDemo() {
  return <ExplorableScatterChart data={exploreScatterData} />;
}

export function WaterfallChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <WaterfallChart data={waterfallData} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function HistogramChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <HistogramChart data={histogramData} onItemEnter={(d, evt) => show(`${d.bin}\n频次: ${d.count}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function BoxplotChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <BoxplotChart data={boxplotData} onItemEnter={(d, evt) => show(`${d.category}\n最小: ${d.min}\nQ1: ${d.q1}\n中位数: ${d.median}\nQ3: ${d.q3}\n最大: ${d.max}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function RoseChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <RoseChart data={roseData} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
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
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ErrorBarChart data={errorBarData} onItemEnter={(d, evt) => show(`${d.category}\n数值: ${d.value} ± ${d.error}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function GaugeChartDemo() {
  return (
    <GaugeChart
      min={gaugeBaseConfig.min}
      max={gaugeBaseConfig.max}
      value={gaugeValue}
      title="完成率"
    />
  );
}

export function CalendarHeatmapChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <CalendarHeatmapChart data={[]} onItemEnter={(d, evt) => show(`${d.date}\n值: ${d.value}`, evt)} onItemLeave={hide} />
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
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ParallelCoordinatesChart
          axes={parallelCoordinatesData.axes}
          data={parallelCoordinatesData.data}
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
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <EffectScatterChart
          data={effectScatterData}
          onItemEnter={(p, evt) => show(`聚类 ${p.group + 1}\nx: ${p.x.toFixed(1)}\ny: ${p.y.toFixed(1)}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function PolarBarChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <PolarBarChart
          data={polarBarData}
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
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <ThemeRiverChart
          categories={themeRiverCategories}
          series={themeRiverData}
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
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <WordCloudChart
          data={wordCloudData}
          onItemEnter={(d, evt) => show(`${d.text}\n权重: ${d.weight}`, evt)}
          onItemLeave={hide}
        />
      )}
    </ChartHoverShell>
  );
}

export function LiquidFillChartDemo() {
  return (
    <LiquidFillChart
      value={liquidFillData.value}
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
  return <CurvatureCombChart data={curvatureCombData} />;
}

/* ==================== 新增 8 个图表 Demo（batch 4） ==================== */

export function HorizontalBarChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <HorizontalBarChart data={horizontalBarData} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function StackedBarChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <StackedBarChart data={stackedBarData} categories={stackedBarCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function StackedAreaChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <StackedAreaChart data={stackedAreaData} categories={stackedAreaCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function StepLineChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <StepLineChart data={stepLineData} categories={stepLineCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function SmoothLineChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <SmoothLineChart data={smoothLineData} categories={smoothLineCategories} onItemEnter={(d, evt) => show(`${d.series}\n${d.category}: ${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function DoughnutChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <DoughnutChart data={doughnutData} onItemEnter={(d, evt) => show(`${d.name}\n数值: ${d.value}\n占比: ${d.percent}%`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function SingleAxisScatterChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <SingleAxisScatterChart data={singleAxisScatterData} onItemEnter={(p, evt) => show(`值: ${p.value}\n尺寸: ${p.size}\n聚类: ${p.group + 1}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}

export function BidirectionalBarChartDemo() {
  return (
    <ChartHoverShell>
      {({ show, hide }) => (
        <BidirectionalBarChart data={bidirectionalBarData} onItemEnter={(d, evt) => show(`${d.name}\n${d.direction === 'positive' ? '正向: ' : '负向: '}${d.value}`, evt)} onItemLeave={hide} />
      )}
    </ChartHoverShell>
  );
}
