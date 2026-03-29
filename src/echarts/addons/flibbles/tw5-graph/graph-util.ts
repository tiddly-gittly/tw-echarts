/*
 * ECharts graph utility functions for TW5-Graph
 */
import { GraphObjects, NodeObject, EdgeObject } from './properties';
import { getEChartsPaletteColor } from './style';
import type { EChartOption } from '$:/plugins/Gk0Wk/echarts/echarts.min.js';
import type * as EchartsNS from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

function handleSource(e: Record<string, unknown>): string | undefined {
  return typeof e.source === 'string' ? e.source : (typeof e.from === 'string' ? e.from : undefined);
}
function handleTarget(e: Record<string, unknown>): string | undefined {
  return typeof e.target === 'string' ? e.target : (typeof e.to === 'string' ? e.to : undefined);
}
function handleEdgeValue(e: Record<string, unknown>): number | undefined {
  return typeof e.value === 'number' ? e.value : undefined;
}
function handleLineStyle(e: Record<string, unknown>): EChartOption.SeriesGraph.LinkObject['lineStyle'] {
  if (typeof e.lineStyle === 'object' && e.lineStyle !== null) return e.lineStyle as any;
  if (e.color) return { color: String(e.color) };
  return undefined;
}
function handleEdgeLabel(e: Record<string, unknown>): EChartOption.SeriesGraph.LinkObject['label'] {
  return typeof e.label === 'object' && e.label !== null ? e.label as any : undefined;
}
function handleEdgeEmphasis(e: Record<string, unknown>): EChartOption.SeriesGraph.LinkObject['emphasis'] {
  return typeof e.emphasis === 'object' && e.emphasis !== null ? e.emphasis as any : undefined;
}
function handleEdgeSymbol(e: Record<string, unknown>): string | undefined {
  return typeof e.symbol === 'string' ? e.symbol : undefined;
}
function handleEdgeSymbolSize(e: Record<string, unknown>): string | number[] | undefined {
  if (typeof e.symbolSize === 'string') return e.symbolSize;
  if (Array.isArray(e.symbolSize)) return e.symbolSize as number[];
  return undefined;
}
// 字段处理函数
function handleName(n: NodeObject): string | undefined {
  if (typeof n.label === 'string') return n.label;
  return undefined;
}
function handleX(n: NodeObject): number | undefined {
  return typeof n.x === 'number' ? n.x : undefined;
}
function handleY(n: NodeObject): number | undefined {
  return typeof n.y === 'number' ? n.y : undefined;
}
function handleValue(n: NodeObject): number | number[] | undefined {
  return typeof n.value === 'number' || Array.isArray(n.value) ? n.value as number | number[] : undefined;
}
function handleCategory(n: NodeObject): number | undefined {
  return typeof n.category === 'number' ? n.category : undefined;
}
function handleSymbol(n: NodeObject): string | undefined {
  if (typeof n.symbol === 'string') return n.symbol;
  if (typeof n.image === 'string') return `image://${n.image}`;
  if (typeof n.shape === 'string') return n.shape;
  return undefined;
}
function handleSymbolSize(n: NodeObject): number | number[] | undefined {
  if (typeof n.symbolSize === 'number') return n.symbolSize;
  if (Array.isArray(n.symbolSize)) return n.symbolSize as number[];
  if (typeof n.size === 'number') return n.size;
  return undefined;
}
function handleSymbolRotate(n: NodeObject): number | undefined {
  return typeof n.symbolRotate === 'number' ? n.symbolRotate : undefined;
}
function handleSymbolKeepAspect(n: NodeObject): boolean | undefined {
  return typeof n.symbolKeepAspect === 'boolean' ? n.symbolKeepAspect : undefined;
}
function handleSymbolOffset(n: NodeObject): number[] | undefined {
  return Array.isArray(n.symbolOffset) ? n.symbolOffset as number[] : undefined;
}
function handleItemStyle(n: NodeObject): EChartOption.SeriesGraph.DataObject['itemStyle'] {
  if (n.color && !n.itemStyle) return { color: String(n.color) };
  if (typeof n.itemStyle === 'object' && n.itemStyle !== null) return n.itemStyle as any;
  return undefined;
}
function handleLabel(n: NodeObject): EChartOption.SeriesGraph.DataObject['label'] {
  return typeof n.label === 'object' && n.label !== null ? n.label as any : undefined;
}
function handleEmphasis(n: NodeObject): EChartOption.SeriesGraph.DataObject['emphasis'] {
  return typeof n.emphasis === 'object' && n.emphasis !== null ? n.emphasis as any : undefined;
}
function handleDraggable(n: NodeObject): boolean {
  return typeof n.draggable === 'boolean' ? n.draggable : true;
}

function handleXY(
  n: NodeObject,
  id: string,
  index: number,
  layoutType: string,
  allNodes: Record<string, NodeObject>,
  chartInstance?: EchartsNS.ECharts | null,
): { x: number | undefined; y: number | undefined } {
  // 优先使用节点自己的 x/y
  if (typeof n.x === 'number' && typeof n.y === 'number') {
    return { x: n.x, y: n.y };
  }
  
  // layout:none 且缺少 x/y 时自动分配
  if (layoutType === 'none') {
    const nodeKeys = Object.keys(allNodes);
    const xy = getAutoXYForNode(index, nodeKeys.length);
    return { x: xy.x, y: xy.y };
  }
  
  // 其他情况返回原值
  return { x: handleX(n), y: handleY(n) };
}

export function getLayoutType(objects: GraphObjects): string {
  // 兼容 vis 的 hierarchy，ECharts 只支持 force/circular/none
  if (objects.graph?.hierarchy) {
    return 'circular';
  }
  // physics=false 显式禁用物理引擎，ECharts 用 layout: 'none'
  if (objects.graph?.physics === false) {
    return 'none';
  }
  // 默认 force
  return 'force';
}


export function buildNodesData(
  objects: GraphObjects,
  layoutType: string,
  chartInstance?: EchartsNS.ECharts | null,
): EChartOption.SeriesGraph.DataObject[] | undefined {
  let nodes = objects.nodes;
  // 仅在 layoutType==='none' 且 nodes 未定义时才从 chartInstance 取
  if (!nodes) {
    if (layoutType === 'none' && chartInstance) {
      const option = chartInstance.getOption && chartInstance.getOption();
      const series = option && Array.isArray(option.series) ? option.series[0] as EChartOption.SeriesGraph : undefined;
      if (series && series.layout !== 'none' && Array.isArray(series.data)) {
        nodes = {};
        (series.data as EChartOption.SeriesGraph.DataObject[]).forEach((n, i) => {
          // 用 ECharts data[i].name 作为稳定 key；label 通常是对象而不是名称
          const name = (n as any).name;
          const key = typeof name === 'string' ? name : String(i);
          const node: NodeObject = {
            // 回填 label 为 name，确保 handleName(n) 返回稳定名称
            label: typeof name === 'string' ? name : undefined,
            x: typeof n.x === 'number' ? n.x : undefined,
            y: typeof n.y === 'number' ? n.y : undefined,
            value: n.value,
            category: n.category as number,
            symbol: n.symbol as string,
            symbolSize: n.symbolSize,
            symbolRotate: n.symbolRotate,
            symbolKeepAspect: n.symbolKeepAspect,
            symbolOffset: n.symbolOffset as number[],
            itemStyle: n.itemStyle,
            emphasis: n.emphasis,
          };
          nodes![key] = node;
        });
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  nodes = nodes || {};
  return Object.entries(nodes).map(([id, node], i) => {
    const n = node as NodeObject;
    const { x, y } = handleXY(n, id, i, layoutType, nodes, chartInstance);
    const item: EChartOption.SeriesGraph.DataObject & { draggable?: boolean; id: string } = {
      // 确保始终有 name，优先 label，否则回退到 id，避免边无法匹配
      name: handleName(n) ?? id,
      id, // 补充 id 字段，便于事件 params.data.id 能正确获取
      x,
      y,
      value: handleValue(n),
      category: handleCategory(n),
      symbol: handleSymbol(n),
      symbolSize: handleSymbolSize(n),
      symbolRotate: handleSymbolRotate(n),
      symbolKeepAspect: handleSymbolKeepAspect(n),
      symbolOffset: handleSymbolOffset(n),
      itemStyle: handleItemStyle(n),
      label: handleLabel(n),
      emphasis: handleEmphasis(n),
      draggable: handleDraggable(n),
    };
    return item;
  });
}

// 构建边数据，自动兼容 vis 旧属性，严格按 schema 传递

export function buildGraphLinks(
  objects: GraphObjects,
  chartInstance?: EchartsNS.ECharts | null,
): EChartOption.SeriesGraph.LinkObject[] | undefined {
  let edges = objects.edges;
  if (!edges) return undefined;
  const edgeEntries = Object.entries(edges);
  return edgeEntries.map(([id, edge]) => {
    const e = edge as Record<string, unknown>;
    const item: EChartOption.SeriesGraph.LinkObject = {
      source: handleSource(e),
      target: handleTarget(e),
      value: handleEdgeValue(e),
      lineStyle: handleLineStyle(e),
      label: handleEdgeLabel(e),
      emphasis: handleEdgeEmphasis(e),
      symbol: handleEdgeSymbol(e),
      symbolSize: handleEdgeSymbolSize(e),
    };
    return item;
  });
}

/**
 * 为单个节点分配静态坐标，兼容 vis-network 静态布局。
 */
export function getAutoXYForNode(
  i: number,
  N: number,
): { x: number; y: number } {
  const R = N + 50;
  function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  const angle = 2 * Math.PI * seededRandom(i + 1); // i+1 保证不为0
  return {
    x: Math.round(R * Math.cos(angle)),
    y: Math.round(R * Math.sin(angle)),
  };
}
