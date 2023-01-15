import type { ECharts } from 'echarts';
import type { Widget } from 'tiddlywiki';

export interface IScriptAddon<
  StateType = any,
  AttributesType = Record<string, string>,
> {
  /**
   * 当组件第一次初始化时调用的函数(可选)
   * @param {ECharts} myChart echarts实例，详见echarts的API文档
   * @param {AttributesType} addonAttributes <$echarts> 控件传入的的所有参数，是object
   * @param {Widget} [echartsWidget] <$echarts> 控件实例，可能为undefiend
   * @return {StateType} 初始化的组件状态，用于状态管理(可选)
   */
  onMount?: (
    myChart: ECharts,
    addonAttributes: AttributesType,
    echartsWidget?: Widget | undefined,
  ) => StateType;
  /**
   * 判断是否需要刷新组建(可选)
   * @param {StateType} state 组件的状态，就是onMount返回的那个
   * @param {IChangedTiddlers} changedTiddlers 刷新是由TW系统监听到有条目发生变化才会触发的，这是一个包含所有变更条目标题的字符串数组
   * @param {Record<string, true>} changedAttributes 哪些参数被改变了，包括$开头的参数
   * @return {boolean} 如果需要刷新就返回true，反之
   *
   * shouldRefresh 也可以是一个字符串，那就和 echarts-refresh-trigger 字段一样
   */
  shouldUpdate?:
    | ((
        state: StateType,
        changedTiddlers: IChangedTiddlers,
        changedAttributes: Record<string, true>,
      ) => boolean)
    | boolean;
  /**
   * 当组件被更新时调用的函数
   * @param {ECharts} myChart echarts实例，详见echarts的API文档
   * @param {StateType} state 组件的状态，就是onMount返回的那个
   * @param {AttributesType} addonAttributes <$echarts> 控件传入的所有参数
   */
  onUpdate: (
    myChart: ECharts,
    state: StateType,
    addonAttributes: AttributesType,
  ) => void;
  /**
   * 当组件被卸载时调用的函数(可选)
   * 注意：如果浏览器页面被直接关闭，可能就没法调用这个函数了
   * @param {StateType} state 组件的状态，就是onMount返回的那个
   */
  onUnmount?: (state: StateType) => void;
}
