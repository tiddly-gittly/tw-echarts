/*
 * ECharts graph utility functions for TW5-Graph
 */
import { GraphObjects, properties } from './properties';
import type { EChartOption } from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

export function getLayoutType(objects: GraphObjects): string {
  const allowedLayouts = properties.graph.layout.values;
  if (objects.graph?.hierarchy) {
    return 'circular';
  } else if (objects.graph?.layout) {
    if (objects.graph.layout === 'force' && objects.graph.physics === false) {
      return 'none';
    }
    if (allowedLayouts.includes(objects.graph.layout)) {
      return objects.graph.layout;
    } else {
      console.warn(
        '[ECharts engine] Unsupported layout value:',
        objects.graph.layout,
        "- fallback to 'force'",
      );
      return 'force';
    }
  }
  return 'force';
}

export function buildGraphLinks(
  edgeEntries: [string, any][],
  fontColor: string,
  edgeColor: string,
) {
  return edgeEntries.map(([id, edge]) => ({
    id,
    source: edge.from,
    target: edge.to,
    label: {
      show: Boolean(edge.label),
      formatter: edge.label,
      color: fontColor,
    },
    lineStyle: { color: edge.color ?? edgeColor },
  }));
}

export function buildGraphOption(
  objects: GraphObjects,
  nodeColor: string,
  fontColor: string,
  edgeColor: string,
): EChartOption {
  const layoutType = getLayoutType(objects);
  const isForce = layoutType === 'force' && objects.graph?.physics !== false;
  const nodeData = objects.nodes
    ? buildGraphData(Object.entries(objects.nodes), layoutType)
    : [];
  return {
    backgroundColor: 'rgba(0,0,0,0)',
    series: [
      {
        type: 'graph',
        layout: layoutType,
        data: nodeData,
        links: objects.edges
          ? buildGraphLinks(Object.entries(objects.edges), fontColor, edgeColor)
          : [],
        roam: objects.graph?.zoom ?? true,
        focusNodeAdjacency: objects.graph?.navigation ?? true,
        force: isForce
          ? {
              repulsion: objects.graph?.repulsion ?? 200,
              edgeLength: objects.graph?.springLength ?? 120,
              gravity: objects.graph?.centralGravity ?? 0.1,
            }
          : undefined,
        draggable: true,
        categories: [
          { name: 'default' },
          { name: 'hidden', itemStyle: { opacity: 0.1 } },
        ],
      },
    ],
  };
}

/**
 * 构建 ECharts 节点数据，自动分配缺失的 x/y，兼容部分节点有/无坐标。
 */
export function buildGraphData(
  nodeEntries: [string, any][],
  layoutType: string,
) {
  const N = nodeEntries.length;
  return nodeEntries.map(([id, node], i) => {
    let { x } = node;
    let { y } = node;
    if (
      (x === undefined || y === undefined) &&
      layoutType === 'none' &&
      N > 0
    ) {
      const auto = getAutoXYForNode(i, N);
      x = x !== undefined ? x : auto.x;
      y = y !== undefined ? y : auto.y;
    }
    return {
      id,
      name: node.label,
      x,
      y,
      itemStyle: { color: node.color },
      symbolSize: node.size ?? 40,
      category: node.hidden ? 1 : 0,
      label: { color: node.fontColor },
      symbol: node.shape ? node.shape : 'circle',
      ...(node.image ? { symbol: `image://${node.image}` } : {}),
      ...(node.physics === false ? { fixed: true } : {}),
    };
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
