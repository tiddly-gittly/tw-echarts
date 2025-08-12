
import { buildNodesData, buildGraphLinks, getLayoutType } from './graph-util';
import type { EChartsEngineInstance } from './engine';
import type { GraphObjects } from './properties';
import type { EChartOption } from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

export function render(
  this: EChartsEngineInstance,
  objects: GraphObjects,
): void {
  const { chartInstance } = this;
  if (!chartInstance) {
    console.error('TW5-Graph ECharts instance is not initialized.');
    return;
  }

  const layoutType = getLayoutType(objects);
  // 合并更新的数据到当前数据里。Echarts 没法合并更新 series 字段，需要我们自己合并再提交。
  const option = chartInstance.getOption && chartInstance.getOption();
  let currentSeries: unknown = undefined;
  if (option && Array.isArray(option.series) && option.series.length > 0) {
    currentSeries = option.series[0];
  }
  let graphSeries: Partial<EChartOption.SeriesGraph> = { type: 'graph' };
  if (
    currentSeries &&
    typeof currentSeries === 'object' &&
    'type' in currentSeries &&
    (currentSeries as { type?: string }).type === 'graph'
  ) {
    const g = currentSeries as Partial<EChartOption.SeriesGraph>;
    graphSeries = {
      type: 'graph',
      layout: g.layout,
      roam: g.roam,
      force: g.force,
      data: g.data,
      links: g.links,
      ...g,
    };
  }

  // 合并 graph 属性
  if (objects.graph) {
    graphSeries.layout = layoutType;
    graphSeries.roam = typeof objects.graph.zoom === 'boolean' ? objects.graph.zoom : true;
    if (layoutType === 'force') graphSeries.force = graphSeries.force || {};
    Object.assign(graphSeries, objects.graph);
    chartInstance.setOption({
      backgroundColor: objects.graph.background ?? 'rgba(0,0,0,0)',
    }, false);
  }

  // 合并 nodes
  const nodeData = buildNodesData(objects, layoutType, chartInstance);
  if (nodeData !== undefined) {
    graphSeries.data = nodeData;
  }

  // 合并 edges
  const edgeData = buildGraphLinks(objects, chartInstance);
  if (edgeData !== undefined) {
    graphSeries.links = edgeData;
  }

  // 最后一次性 setOption
  chartInstance.setOption({ series: [graphSeries] }, false);

  // focus/blur 事件
  if (objects.graph?.focus) {
    chartInstance.dispatchAction({
      type: 'focusNodeAdjacency',
      seriesIndex: 0,
    });
  }
  if (objects.graph?.blur) {
    chartInstance.dispatchAction({
      type: 'unfocusNodeAdjacency',
      seriesIndex: 0,
    });
  }
}
