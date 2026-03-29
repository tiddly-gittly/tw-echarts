/*
 * ECharts Engine for TW5-Graph
 * This module provides an ECharts-based rendering engine for TW5-Graph.
 */

import { GraphObjects, properties } from './properties';
import { setupEChartsEvents } from './echarts-events';
import { render } from './render';
import * as Echarts from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

export interface EChartsEngineInstance {
  chartInstance: Echarts.ECharts | null;
  /**
   * 事件回调，参数类型严格对齐 widget 侧 handleGraphEvent
   * @param event { type, objectType, id, event }
   * @param variables 额外参数，如 {x, y, xView, yView}
   */
  onevent?: (
    event: import('./echarts-events').GraphEvent,
    variables?: import('./echarts-events').GraphEventVariables,
  ) => void;
  _resizeHandler?: () => void;
  _element?: HTMLElement;
}

export { properties };

export const name = 'ECharts';

/**
 * Class created by `$tw.modules.createClassesFromModules("graphengine")`
 */
export function init(
  this: EChartsEngineInstance,
  element: HTMLDivElement,
  objects: GraphObjects,
): void {
  debugger
  element.classList.add('tw5-graph-echarts');
  this.chartInstance = Echarts.init(element);
  setupEChartsEvents.call(this);
  // 包装 onevent 以 log
  const originOnevent = this.onevent;
  this.onevent = function(event, variables) {
    console.log('[ECharts] onevent', event, variables);
    if (originOnevent) originOnevent(event, variables);
  };
  render.call(this, objects);
}

/**
 * Update the graph with changed data
 * @param objects Partial data 
 */
export function update(
  this: EChartsEngineInstance,
  objects: GraphObjects,
): void {
  debugger
  render.call(this, objects);
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
