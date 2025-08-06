/*
 * ECharts Engine for TW5-Graph
 * This module provides an ECharts-based rendering engine for TW5-Graph.
 */

import * as Echarts from '$:/plugins/Gk0Wk/echarts/echarts.min.js';
import type { EChartOption } from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

interface GraphObjects {
  graph?: {
    physics?: boolean;
    zoom?: boolean;
    background?: string;
    layout?: string;
    focus?: any;
    blur?: any;
    navigation?: boolean;
    hierarchy?: boolean;
    addNode?: any;
    addEdge?: any;
    graphColor?: string;
    nodeColor?: string;
    fontColor?: string;
    repulsion?: number;
    springLength?: number;
    centralGravity?: number;
  };
  nodes?: Record<string, {
    x?: number;
    y?: number;
    label?: string;
    color?: string;
    size?: number;
    hidden?: boolean;
    image?: string;
    physics?: boolean;
    delete?: any;
    doubleclick?: any;
    hover?: any;
    blur?: any;
    drag?: any;
    free?: any;
    fontColor?: string;
    shape?: string;
  }>;
  edges?: Record<string, {
    from: string;
    to: string;
    label?: string;
    color?: string;
    delete?: any;
    doubleclick?: any;
    hover?: any;
    blur?: any;
    drag?: any;
    free?: any;
  }>;
}

// Define the ECharts adapter as a graphengine module
export const name = "ECharts";

export const properties = {
  graph: {
    physics: { type: "boolean", default: true },
    zoom: { type: "boolean", default: true },
    background: { type: "image" },
    layout: { type: "string", default: "force" },
    focus: { type: "actions" },
    blur: { type: "actions" },
    navigation: { type: "boolean", default: false },
    hierarchy: { type: "boolean", default: false },
    addNode: { type: "actions", variables: ["x", "y"] },
    addEdge: { type: "actions", variables: ["fromTiddler", "toTiddler"] },
  },
  nodes: {
    x: { type: "number" },
    y: { type: "number" },
    label: { type: "string" },
    color: { type: "color", default: "#D2E5FF" },
    size: { type: "number", default: 25 },
    hidden: { type: "boolean" },
    image: { type: "image" },
    physics: { type: "boolean" },
    delete: { type: "actions" },
    doubleclick: { type: "actions", variables: ["x", "y", "xView", "yView"] },
    hover: { type: "actions", variables: ["x", "y", "xView", "yView"] },
    blur: { type: "actions" },
    drag: { type: "actions", variables: ["x", "y"] },
    free: { type: "actions", variables: ["x", "y"] },
    shape: { type: "enum", values: ["circle", "rect", "roundRect", "triangle", "diamond", "pin", "arrow"] }, // ECharts 支持的 symbol
  },
  edges: {
    from: { type: "string" },
    to: { type: "string" },
    label: { type: "string" },
    color: { type: "color" },
    delete: { type: "actions" },
    doubleclick: { type: "actions", variables: ["x", "y", "xView", "yView"] },
    hover: { type: "actions", variables: ["x", "y", "xView", "yView"] },
    blur: { type: "actions" },
    drag: { type: "actions", variables: ["x", "y"] },
    free: { type: "actions", variables: ["x", "y"] },
  },
};

/**
 * Class created by `$tw.modules.createClassesFromModules("graphengine")`
 */
interface EChartsEngineInstance {
  chartInstance: Echarts.ECharts | null;
  eventHandler?: (event: any, variables?: any) => void;
}

export function init(this: EChartsEngineInstance, element: HTMLDivElement, objects: GraphObjects, eventHandler?: (event: any, variables?: any) => void): void {
  element.classList.add('tw5-graph-echarts');
  this.chartInstance = Echarts.init(element);
  this.eventHandler = eventHandler;
  setupEvents.call(this);
  render.call(this, objects);
}

export function update(this: EChartsEngineInstance, objects: GraphObjects): void {
  const option: EChartOption = {
    backgroundColor: undefined,
    series: []
  };
  const fontColor = (objects.graph?.fontColor as string) || getEChartsPaletteColor("font", "#343434");
  let graphSeries: EChartOption.SeriesGraph = {
    type: "graph",
    layout: undefined,
    roam: undefined,
    focusNodeAdjacency: undefined,
    force: undefined,
    data: undefined,
    links: undefined,
    categories: [
      { name: 'default' },
      { name: 'hidden', itemStyle: { opacity: 0.1 } },
    ],
    draggable: true,
  };
  if (objects.graph) {
    graphSeries.layout = objects.graph.hierarchy ? 'circular' : (objects.graph.layout || 'force');
    graphSeries.roam = objects.graph.zoom ?? true;
    graphSeries.focusNodeAdjacency = objects.graph.navigation ?? true;
    graphSeries.force = (objects.graph.layout === 'force' && objects.graph.physics !== false) ? {
      repulsion: objects.graph.repulsion ?? 200,
      edgeLength: objects.graph.springLength ?? 120,
      gravity: objects.graph.centralGravity ?? 0.1,
    } : undefined;
    option.backgroundColor = 'rgba(0,0,0,0)';
  }
  if (objects.nodes) {
    graphSeries.data = Object.values(objects.nodes).map(node => ({
      name: node.label,
      x: node.x,
      y: node.y,
      itemStyle: { color: node.color },
      symbolSize: node.size ?? 40,
      category: node.hidden ? 1 : 0,
      label: { color: node.fontColor },
      symbol: node.shape ? node.shape : 'circle',
      ...(node.image ? { symbol: `image://${node.image}` } : {}),
      ...(node.physics === false ? { fixed: true } : {}),
    }));
  }
  if (objects.edges) {
    graphSeries.links = Object.values(objects.edges).map(edge => ({
      source: edge.from,
      target: edge.to,
      label: { show: !!edge.label, formatter: edge.label, color: fontColor },
      lineStyle: { color: edge.color },
    }));
  }
  option.series = [graphSeries];
  if (this.chartInstance) {
    this.chartInstance.setOption(option, false);
  }
}

export function destroy(this: EChartsEngineInstance): void {
  if (this.chartInstance) {
    this.chartInstance.dispose();
    this.chartInstance = null;
    this.eventHandler = undefined;
  }
}

function setupEvents(this: EChartsEngineInstance): void {
  const chartInstance = this.chartInstance;
  const eventHandler = this.eventHandler;
  if (!chartInstance) return;
  chartInstance.on('click', (params: any) => {
    eventHandler?.({ type: 'click', objectType: params.dataType, id: params.data?.name }, params);
  });
  chartInstance.on('dblclick', (params: any) => {
    // DEBUG: console params
    console.log(`params`, params);
    if (params.dataType === 'node' && params.data?.name) {
      const node = params.data;
      const variables = {
        x: node.x,
        y: node.y,
        xView: params.event?.offsetX ?? 0,
        yView: params.event?.offsetY ?? 0
      };
      if (typeof node.doubleclick === 'function') {
        node.doubleclick(variables);
      }
      eventHandler?.({ type: 'doubleclick', objectType: 'nodes', id: node.name }, variables);
    } else {
      eventHandler?.({ type: 'doubleclick', objectType: params.dataType, id: params.data?.name }, params);
    }
  });
  chartInstance.on('mouseover', (params: any) => {
    eventHandler?.({ type: 'hover', objectType: params.dataType, id: params.data?.name }, params);
  });
  chartInstance.on('mouseout', (params: any) => {
    eventHandler?.({ type: 'blur', objectType: params.dataType, id: params.data?.name }, params);
  });
  // @ts-ignore
  if ((chartInstance as any).getZr) {
    (chartInstance as any).getZr().on('mousedown', (params: any) => {
      if (params.target) {
        eventHandler?.({ type: 'drag', objectType: params.target.dataType, id: params.target.name }, params);
      }
    });
    (chartInstance as any).getZr().on('mouseup', (params: any) => {
      if (params.target) {
        eventHandler?.({ type: 'free', objectType: params.target.dataType, id: params.target.name }, params);
      }
    });
  }
  if (chartInstance.getDom && chartInstance.getDom()) {
    chartInstance.getDom().addEventListener('focus', () => {
      eventHandler?.({ type: 'focus', objectType: 'graph' });
    });
    chartInstance.getDom().addEventListener('blur', () => {
      eventHandler?.({ type: 'blur', objectType: 'graph' });
    });
  }
}

function getEChartsPaletteColor(name: string, fallback: string = "#ffffff"): string {
  if (typeof $tw !== "undefined" && $tw.wiki && $tw.wiki.getTiddlerText) {
    const tiddler = $tw.wiki.getTiddlerText(`$:/config/DefaultColourMappings/echarts-${name}`)
      || $tw.wiki.getTiddlerText(`$:/palette/${name}`);
    if (tiddler) return tiddler.trim();
  }
  return fallback;
}

function render(this: EChartsEngineInstance, objects: GraphObjects): void {
  const chartInstance = this.chartInstance;
  const backgroundColor = 'rgba(0,0,0,0)';
  const nodeColor = (objects.graph?.nodeColor as string)
    || getEChartsPaletteColor("node", "#D2E5FF");
  const fontColor = (objects.graph?.fontColor as string)
    || getEChartsPaletteColor("font", "#343434");
  const edgeColor = getEChartsPaletteColor("edge", nodeColor);

  // 力导向布局开关
  const isForce = objects.graph?.layout === "force" && objects.graph?.physics !== false;
  const layoutType = objects.graph?.hierarchy ? 'circular' : (isForce ? "force" : "none");

  const option = {
    backgroundColor,
    series: [
      {
        type: "graph",
        layout: layoutType,
        data: Object.values(objects.nodes || {}).map(node => ({
          name: node.label,
          x: node.x,
          y: node.y,
          itemStyle: { color: node.color ?? nodeColor },
          symbolSize: node.size ?? 40,
          category: node.hidden ? 'hidden' : 'default',
          label: { color: node.fontColor ?? fontColor },
          symbol: node.shape ? node.shape : "circle",
          ...(node.image ? { symbol: `image://${node.image}` } : {}),
          ...(node.physics === false ? { fixed: true } : {}),
        })),
        links: Object.values(objects.edges || {}).map(edge => ({
          source: edge.from,
          target: edge.to,
          label: { show: !!edge.label, formatter: edge.label, color: fontColor },
          lineStyle: { color: edge.color ?? edgeColor },
        })),
        roam: objects.graph?.zoom ?? true,
        focusNodeAdjacency: objects.graph?.navigation ?? true,
        force: isForce ? {
          repulsion: objects.graph?.repulsion ?? 200,
          edgeLength: objects.graph?.springLength ?? 120,
          gravity: objects.graph?.centralGravity ?? 0.1,
        } : undefined,
        draggable: true,
        categories: [
          { name: 'default' },
          { name: 'hidden', itemStyle: { opacity: 0.1 } },
        ],
      },
    ],
  };

  if (chartInstance) {
    chartInstance.setOption(option, true);
    // focus/blur 事件
    if (objects.graph?.focus) {
      chartInstance.dispatchAction({ type: 'focusNodeAdjacency', seriesIndex: 0 });
    }
    if (objects.graph?.blur) {
      chartInstance.dispatchAction({ type: 'unfocusNodeAdjacency', seriesIndex: 0 });
    }
  }
}
