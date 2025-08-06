/*
 * ECharts Engine for TW5-Graph
 * This module provides an ECharts-based rendering engine for TW5-Graph.
 */

import * as Echarts from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

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

let chartInstance: Echarts.ECharts | null = null;
let onevent: ((event: any, variables?: any) => void) | null = null;

export function init(element: HTMLDivElement, objects: GraphObjects, eventHandler?: (event: any, variables?: any) => void): void {
  chartInstance = Echarts.init(element);
  if (eventHandler) onevent = eventHandler;
  setupEvents();
  render(objects);
}

export function update(objects: GraphObjects): void {
  render(objects);
}

export function destroy(): void {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
    onevent = null;
  }
}

function setupEvents() {
  if (!chartInstance) return;
  chartInstance.on('click', (params: any) => {
    if (onevent) {
      onevent({ type: 'click', objectType: params.dataType, id: params.data?.name }, params);
    }
  });
  chartInstance.on('dblclick', (params: any) => {
    if (onevent) {
      onevent({ type: 'doubleclick', objectType: params.dataType, id: params.data?.name }, params);
    }
  });
  chartInstance.on('mouseover', (params: any) => {
    if (onevent) {
      onevent({ type: 'hover', objectType: params.dataType, id: params.data?.name }, params);
    }
  });
  chartInstance.on('mouseout', (params: any) => {
    if (onevent) {
      onevent({ type: 'blur', objectType: params.dataType, id: params.data?.name }, params);
    }
  });
  // @ts-ignore
  (chartInstance as any).getZr().on('mousedown', (params: any) => {
    if (onevent && params.target) {
      onevent({ type: 'drag', objectType: params.target.dataType, id: params.target.name }, params);
    }
  });
  // @ts-ignore
  (chartInstance as any).getZr().on('mouseup', (params: any) => {
    if (onevent && params.target) {
      onevent({ type: 'free', objectType: params.target.dataType, id: params.target.name }, params);
    }
  });
  // focus/blur 事件模拟
  if (chartInstance.getDom()) {
    chartInstance.getDom().addEventListener('focus', () => {
      if (onevent) onevent({ type: 'focus', objectType: 'graph' });
    });
    chartInstance.getDom().addEventListener('blur', () => {
      if (onevent) onevent({ type: 'blur', objectType: 'graph' });
    });
  }
}

function getEChartsPaletteColor(name: string, fallback: string = "#ffffff"): string {
  if (typeof $tw !== "undefined" && $tw.wiki && $tw.wiki.getTiddlerText) {
    // 优先查找 ECharts 专用调色板字段
    const tiddler = $tw.wiki.getTiddlerText(`$:/config/DefaultColourMappings/echarts-${name}`)
      || $tw.wiki.getTiddlerText(`$:/palette/${name}`);
    if (tiddler) return tiddler.trim();
  }
  return fallback;
}

function render(objects: GraphObjects): void {
  // 优先使用 graph.nodeColor、fontColor、graphColor，否则自动获取 ECharts 专用调色板
  const backgroundColor = objects.graph?.background
    || objects.graph?.graphColor
    || getEChartsPaletteColor("background", "#ffffff");
  const nodeColor = (objects.graph?.nodeColor as string)
    || getEChartsPaletteColor("node", "#D2E5FF");
  const fontColor = (objects.graph?.fontColor as string)
    || getEChartsPaletteColor("font", "#343434");
  const edgeColor = getEChartsPaletteColor("edge", nodeColor);

  const option = {
    backgroundColor,
    series: [
      {
        type: "graph",
        layout: objects.graph?.hierarchy ? 'circular' : (objects.graph?.layout || "force"),
        data: Object.values(objects.nodes || {}).map(node => ({
          name: node.label,
          x: node.x,
          y: node.y,
          itemStyle: { color: node.color || nodeColor },
          symbolSize: node.size,
          category: node.hidden ? 'hidden' : 'default',
          label: { color: node.fontColor || fontColor },
          ...(node.image ? { symbol: `image://${node.image}` } : {}),
          ...(node.physics === false ? { fixed: true } : {}),
        })),
        links: Object.values(objects.edges || {}).map(edge => ({
          source: edge.from,
          target: edge.to,
          label: { show: !!edge.label, formatter: edge.label, color: fontColor },
          lineStyle: { color: edge.color || edgeColor },
        })),
        roam: objects.graph?.zoom,
        focusNodeAdjacency: objects.graph?.navigation || false,
        force: {
          repulsion: objects.graph?.physics === false ? 0 : 100,
        },
        categories: [
          { name: 'default' },
          { name: 'hidden', itemStyle: { opacity: 0.1 } },
        ],
      },
    ],
  };

  chartInstance?.setOption(option);

  // focus/blur 事件
  if (objects.graph?.focus && chartInstance) {
    chartInstance.dispatchAction({ type: 'focusNodeAdjacency', seriesIndex: 0 });
  }
  if (objects.graph?.blur && chartInstance) {
    chartInstance.dispatchAction({ type: 'unfocusNodeAdjacency', seriesIndex: 0 });
  }

  // addNode/addEdge 仅做演示，ECharts 不支持直接动态添加节点/边，需外部数据驱动
  // if (objects.graph?.addNode && chartInstance) {
  //   // chartInstance.dispatchAction({ type: 'addNode', ...objects.graph.addNode });
  // }
  // if (objects.graph?.addEdge && chartInstance) {
  //   // chartInstance.dispatchAction({ type: 'addEdge', ...objects.graph.addEdge });
  // }
  // delete 由外部数据驱动
  // doubleclick/drag/free/hover 由 setupEvents 处理
}
