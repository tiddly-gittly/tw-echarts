import type { IScriptAddon } from '../../../scriptAddon';

const addon: IScriptAddon<void> = {
  shouldUpdate: (_state, _changedTiddlers, changedAttributes) => {
    return $tw.utils.count(changedAttributes) > 0;
  },
  onUpdate: (myChart, _state, addonAttributes) => {
    // 参数解析
    const resolution = Math.max(
      1,
      Math.min(1e5, parseInt(addonAttributes.res, 10) || 200),
    );
    let minX = Number(addonAttributes.min) || -1;
    let maxX = Number(addonAttributes.max) || 1;
    if (!Number.isFinite(minX)) {
      minX = -1;
    }
    if (!Number.isFinite(maxX)) {
      maxX = 1;
    }
    if (minX > maxX) {
      [maxX, minX] = [minX, maxX];
    }
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const func_ = new Function(
      'x',
      `return ${addonAttributes.func};` || 'return x;',
    );
    const func = (x: number) => Math.max(-9e8, Math.min(9e8, func_(x)));

    // 采样
    const points = [];
    const step = (maxX - minX) / Math.min(resolution, 1e5);
    for (let i = 0, x = minX; i < resolution; i += 1, x += step) {
      points.push([x, func(x)]);
    }
    points.push([maxX, func(maxX)]);

    // 画图
    myChart.setOption({
      animation: false,
      grid: {
        top: 40,
        left: 50,
        right: 40,
        bottom: 50,
      },
      tooltip: { trigger: 'axis' },
      xAxis: {
        name: 'x',
        minorTick: { show: true },
        minorSplitLine: { show: true },
      },
      yAxis: {
        name: addonAttributes.yaxis || 'f(x)',
        minorTick: { show: true },
        minorSplitLine: { show: true },
      },
      dataZoom: [
        {
          show: true,
          type: 'inside',
          filterMode: 'none',
          xAxisIndex: [0],
          startValue: -20,
          endValue: 20,
        },
        {
          show: true,
          type: 'inside',
          filterMode: 'none',
          yAxisIndex: [0],
          startValue: -20,
          endValue: 20,
        },
      ],
      series: [
        {
          type: 'line',
          showSymbol: false,
          clip: true,
          data: points,
        },
      ],
    } as any);
  },
};

export default addon;
