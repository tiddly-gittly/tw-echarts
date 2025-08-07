/*
 * ECharts Engine for TW5-Graph
 * This module provides an ECharts-based rendering engine for TW5-Graph.
 */

import { buildGraphOption } from './graph-util';
import { GraphObjects, properties } from './properties';
import * as Echarts from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

export { properties };

export const name = 'ECharts';

/**
 * Class created by `$tw.modules.createClassesFromModules("graphengine")`
 */
interface EChartsEngineInstance {
  chartInstance: Echarts.ECharts | null;
  onevent?: (event: any, variables?: any) => void;
  _resizeHandler?: () => void;
  _element?: HTMLElement;
}

export function init(
  this: EChartsEngineInstance,
  element: HTMLDivElement,
  objects: GraphObjects,
): void {
  element.classList.add('tw5-graph-echarts');
  this.chartInstance = Echarts.init(element);
  // onevent 由外部挂载
  setupEvents.call(this);
  render.call(this, objects);
}

export function update(
  this: EChartsEngineInstance,
  objects: GraphObjects,
): void {
  // 统一 option 生成
  const nodeColor =
    (objects.graph?.nodeColor as string) ||
    getEChartsPaletteColor('node', '#D2E5FF');
  const fontColor =
    (objects.graph?.fontColor as string) ||
    getEChartsPaletteColor('font', '#343434');
  const edgeColor = getEChartsPaletteColor('edge', nodeColor);
  const option = buildGraphOption(objects, nodeColor, fontColor, edgeColor);
  if (this.chartInstance) {
    const prevOption = this.chartInstance.getOption();
    const currSeries = Array.isArray(option.series)
      ? option.series[0]
      : undefined;
    const prevSeries = Array.isArray(prevOption.series)
      ? prevOption.series[0]
      : undefined;
    if (
      currSeries &&
      prevSeries &&
      currSeries.type === 'graph' &&
      prevSeries.type === 'graph'
    ) {
      // 只在 nodes/edges 缺失时 merge 旧数据
      if (
        (!objects.nodes || Object.keys(objects.nodes).length === 0) &&
        Array.isArray(prevSeries.data)
      ) {
        currSeries.data = prevSeries.data;
      }
      if (
        (!objects.edges || Object.keys(objects.edges).length === 0) &&
        Array.isArray((prevSeries as any).links)
      ) {
        // TS 类型未声明 links，但实际 graph 支持
        (currSeries as { links?: any[] }).links = (
          prevSeries as { links?: any[] }
        ).links;
      }
    }
    this.chartInstance.setOption(option, false);
  }
}

export function destroy(this: EChartsEngineInstance): void {
  if (this._resizeHandler) {
    window.removeEventListener('resize', this._resizeHandler);
    this._resizeHandler = undefined;
  }
  if (this.chartInstance) {
    this.chartInstance.dispose();
    this.chartInstance = null;
    this.onevent = undefined;
  }
  this._element = undefined;
}

function setupEvents(this: EChartsEngineInstance): void {
  const { chartInstance } = this;
  if (!chartInstance) {
    return;
  }
  // click 事件
  chartInstance.on('click', (params: any) => {
    this.onevent?.(
      {
        type: 'click',
        objectType: params.dataType,
        id: params.data?.id,
        event: params.event,
      },
      params,
    );
  });
  // doubleclick 事件
  chartInstance.on('dblclick', (params: any) => {
    // 兼容 vis-network 变量格式
    let objectType: string;
    if (params.dataType === 'node') {
      objectType = 'nodes';
    } else if (params.dataType === 'edge') {
      objectType = 'edges';
    } else {
      objectType = 'graph';
    }
    const id = params.data?.id;
    let variables: any = {};
    if (objectType === 'nodes' && params.data) {
      variables = {
        x: params.data.x,
        y: params.data.y,
        xView: params.event?.offsetX ?? 0,
        yView: params.event?.offsetY ?? 0,
      };
    } else if (objectType === 'edges' && params.data) {
      // edge 没有 x/y
      variables = {
        xView: params.event?.offsetX ?? 0,
        yView: params.event?.offsetY ?? 0,
      };
    } else {
      // graph 区域双击
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
        objectType: params.dataType,
        id: params.data?.id,
        event: params.event,
      },
      params,
    );
  });
  // blur
  chartInstance.on('mouseout', (params: any) => {
    this.onevent?.(
      {
        type: 'blur',
        objectType: params.dataType,
        id: params.data?.id,
        event: params.event,
      },
      params,
    );
  });
  // 拖拽
  if ((chartInstance as any).getZr) {
    (chartInstance as any).getZr().on('mousedown', (params: any) => {
      if (params.target) {
        this.onevent?.(
          {
            type: 'drag',
            objectType: params.target.dataType,
            id: params.target.id,
            event: params.event,
          },
          params,
        );
      }
    });
    (chartInstance as any).getZr().on('mouseup', (params: any) => {
      if (params.target) {
        this.onevent?.(
          {
            type: 'free',
            objectType: params.target.dataType,
            id: params.target.id,
            event: params.event,
          },
          params,
        );
      }
    });
  }
  // focus/blur 事件
  const dom = chartInstance.getDom?.();
  if (dom) {
    dom.addEventListener('focus', () => {
      this.onevent?.({ type: 'focus', objectType: 'graph' });
    });
    dom.addEventListener('blur', () => {
      this.onevent?.({ type: 'blur', objectType: 'graph' });
    });
  }
}

function getEChartsPaletteColor(name: string, fallback = '#ffffff'): string {
  if (typeof $tw !== 'undefined' && $tw.wiki && $tw.wiki.getTiddlerText) {
    const tiddler =
      $tw.wiki.getTiddlerText(
        `$:/config/DefaultColourMappings/echarts-${name}`,
      ) || $tw.wiki.getTiddlerText(`$:/palette/${name}`);
    if (tiddler) {
      return tiddler.trim();
    }
  }
  return fallback;
}

function render(this: EChartsEngineInstance, objects: GraphObjects): void {
  const { chartInstance } = this;
  const nodeColor =
    (objects.graph?.nodeColor as string) ||
    getEChartsPaletteColor('node', '#D2E5FF');
  const fontColor =
    (objects.graph?.fontColor as string) ||
    getEChartsPaletteColor('font', '#343434');
  const edgeColor = getEChartsPaletteColor('edge', nodeColor);
  const option = buildGraphOption(objects, nodeColor, fontColor, edgeColor);
  // DEBUG: console option
  console.log(`option`, option);
  if (chartInstance) {
    chartInstance.setOption(option, false);
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
  } else {
    console.error('TW5-Graph ECharts instance is not initialized.');
  }
}
