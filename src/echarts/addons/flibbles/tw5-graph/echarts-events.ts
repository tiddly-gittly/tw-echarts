import type { EChartsEngineInstance } from './engine';

/**
 * 事件类型和参数严格对齐 graph widget 侧 handleGraphEvent 约定
 */
export type GraphEventType =
  | 'click'
  | 'doubleclick'
  | 'hover'
  | 'blur'
  | 'drag'
  | 'free';
export type GraphEventObjectType = 'graph' | 'nodes' | 'edges';
export interface GraphEvent {
  type: GraphEventType;
  objectType: GraphEventObjectType;
  id?: string | number;
  event?: any;
}
/**
 * 事件参数类型，严格对齐 widget 侧 handleGraphEvent 约定
 * - click/doubleclick/drag/free: 节点/边/graph 事件参数
 *   - 节点: { x, y, xView, yView }
 *   - 边: { xView, yView }
 *   - graph: { x, y, xView, yView }
 * - hover/blur: 直接传 params
 */
export type GraphEventVariables =
  | { x: number; y: number; xView: number; yView: number }
  | { xView: number; yView: number }
  | Record<string, any>;

/*
 * ECharts 事件分发，严格对齐 widget 侧 handleGraphEvent 约定
 */

export function setupEChartsEvents(this: EChartsEngineInstance): void {
  const { chartInstance } = this;
  if (!chartInstance) {
    return;
  }

    // 记录上次节点坐标，便于判断哪些节点被拖动
    let lastNodePositions: Record<string, {x: number, y: number}> = {};
    function isGraphNode(obj: any): obj is { id: string; x: number; y: number } {
      return obj && typeof obj === 'object' && typeof obj.id === 'string' && typeof obj.x === 'number' && typeof obj.y === 'number';
    }
    function updateLastNodePositions() {
      if (!chartInstance) return;
      const option = chartInstance.getOption && chartInstance.getOption();
      const series = option && Array.isArray(option.series) ? option.series[0] : undefined;
      if (series && Array.isArray(series.data)) {
        lastNodePositions = {};
        for (const n of series.data) {
          if (isGraphNode(n)) {
            lastNodePositions[n.id] = { x: n.x, y: n.y };
          }
        }
      }
    }
    updateLastNodePositions();

  // click 事件
  // 节点拖动后同步 x/y（仅 layout: 'none' 有效）
  chartInstance.on('graphRoam', (params: any) => {
    // 只处理节点拖动，不处理缩放/平移
    if (params && params.isNodeDragging) {
      if (!chartInstance) return;
      const option = chartInstance.getOption && chartInstance.getOption();
      const series = option && Array.isArray(option.series) ? option.series[0] : undefined;
      if (series && Array.isArray(series.data)) {
        for (const n of series.data) {
          if (isGraphNode(n)) {
            const prev = lastNodePositions[n.id];
            if (!prev || prev.x !== n.x || prev.y !== n.y) {
              // 节点坐标发生变化，分发 drag/free 事件
              this.onevent?.(
                {
                  type: 'free',
                  objectType: 'nodes',
                  id: n.id,
                  event: params.event,
                },
                {
                  x: n.x,
                  y: n.y,
                  xView: params.event?.offsetX ?? 0,
                  yView: params.event?.offsetY ?? 0,
                },
              );
            }
          }
        }
        updateLastNodePositions();
      }
    }
  });
  chartInstance.on('click', (params: any) => {
    this.onevent?.(
      {
        type: 'click',
        objectType: params.dataType as GraphEventObjectType,
        id: params.data?.id,
        event: params.event,
      },
      params as GraphEventVariables,
    );
  });

  // doubleclick 事件
  chartInstance.on('dblclick', (params: any) => {
    let objectType: GraphEventObjectType;
    if (params.dataType === 'node') {
      objectType = 'nodes';
    } else if (params.dataType === 'edge') {
      objectType = 'edges';
    } else {
      objectType = 'graph';
    }
    const id = params.data?.id;
    let variables: GraphEventVariables = {};
    if (objectType === 'nodes' && params.data) {
      variables = {
        x: params.data.x,
        y: params.data.y,
        xView: params.event?.offsetX ?? 0,
        yView: params.event?.offsetY ?? 0,
      };
    } else if (objectType === 'edges' && params.data) {
      variables = {
        xView: params.event?.offsetX ?? 0,
        yView: params.event?.offsetY ?? 0,
      };
    } else {
      variables = {
        x: params.event?.offsetX ?? 0,
        y: params.event?.offsetY ?? 0,
        xView: params.event?.offsetX ?? 0,
        yView: params.event?.offsetY ?? 0,
      };
    }
    console.log('[ECharts] dblclick event', { params, objectType, id, variables });
    this.onevent?.(
      { type: 'doubleclick', objectType, id, event: params.event },
      variables,
    );
  });

  // hover
  chartInstance.on('mouseover', (params: any) => {
    this.onevent?.(
      {
        type: 'hover',
        objectType: params.dataType as GraphEventObjectType,
        id: params.data?.id,
        event: params.event,
      },
      params as GraphEventVariables,
    );
  });

  // blur
  chartInstance.on('mouseout', (params: any) => {
    this.onevent?.(
      {
        type: 'blur',
        objectType: params.dataType as GraphEventObjectType,
        id: params.data?.id,
        event: params.event,
      },
      params as GraphEventVariables,
    );
  });

  // 拖拽
  if ((chartInstance as any).getZr) {
    function round(number: number) { return Math.round(number * 10) / 10; }
    function makeNodeVariables(params: any): GraphEventVariables {
      // default fallbacks
      let xView = params.event?.offsetX ?? 0;
      let yView = params.event?.offsetY ?? 0;
      let x = xView;
      let y = yView;
      try {
        if (!chartInstance) {
          return { x, y, xView, yView };
        }
        const option = chartInstance.getOption && chartInstance.getOption();
        const series = option && Array.isArray(option.series) ? option.series[0] : undefined;
        if (series && Array.isArray(series.data)) {
          const found = series.data.find((d: any) => d && d.id === params.target.id);
          const node: any = found as any;
          if (node && typeof node === 'object' && typeof node.x === 'number' && typeof node.y === 'number') {
            x = round(node.x);
            y = round(node.y);
          }
        }
      } catch (e) {
        // ignore
      }
      return { x, y, xView, yView };
    }

    (chartInstance as any).getZr().on('mousedown', (params: any) => {
      if (params.target) {
        let variables: GraphEventVariables = params as GraphEventVariables;
        // if it's a node, provide x/y like vis-network
        if (params.target.dataType === 'node' || params.target.dataType === 'nodes') {
          variables = makeNodeVariables(params);
        }
        this.onevent?.(
          {
            type: 'drag',
            objectType: params.target.dataType as GraphEventObjectType,
            id: params.target.id,
            event: params.event,
          },
          variables,
        );
      }
    });
    (chartInstance as any).getZr().on('mouseup', (params: any) => {
      if (params.target) {
        let variables: GraphEventVariables = params as GraphEventVariables;
        if (params.target.dataType === 'node' || params.target.dataType === 'nodes') {
          variables = makeNodeVariables(params);
        }
        this.onevent?.(
          {
            type: 'free',
            objectType: params.target.dataType as GraphEventObjectType,
            id: params.target.id,
            event: params.event,
          },
          variables,
        );
      }
    });
  }
}
