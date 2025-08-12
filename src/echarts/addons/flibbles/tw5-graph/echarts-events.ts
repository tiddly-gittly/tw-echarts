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

  // click 事件
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
    (chartInstance as any).getZr().on('mousedown', (params: any) => {
      if (params.target) {
        this.onevent?.(
          {
            type: 'drag',
            objectType: params.target.dataType as GraphEventObjectType,
            id: params.target.id,
            event: params.event,
          },
          params as GraphEventVariables,
        );
      }
    });
    (chartInstance as any).getZr().on('mouseup', (params: any) => {
      if (params.target) {
        this.onevent?.(
          {
            type: 'free',
            objectType: params.target.dataType as GraphEventObjectType,
            id: params.target.id,
            event: params.event,
          },
          params as GraphEventVariables,
        );
      }
    });
  }
}
