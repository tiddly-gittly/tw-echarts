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
    const func = new Function(
      'x',
      `return ${addonAttributes.func};` || 'return x;',
    );

    // 采样
    const points = [];
    const step = (maxX - minX) / Math.min(resolution, 1e5);
    let minY = Infinity;
    let maxY = -Infinity;
    for (let x = minX; x <= maxX; x += step) {
      const y = func(x);
      points.push([x, y]);
      if (!Number.isNaN(y) && Number.isFinite(y)) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    if (!Number.isFinite(minY)) {
      minY = 0;
    }
    if (!Number.isFinite(maxY)) {
      maxY = 0;
    }
    minY -= Math.max(1e-8, maxY - minY) * 5e-3;
    maxY += Math.max(1e-8, maxY - minY) * 5e-3;
    minX -= Math.max(1e-8, maxX - minX) * 5e-3;
    maxX += Math.max(1e-8, maxX - minX) * 5e-3;
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
        min: minX,
        max: maxX,
        minorTick: { show: true },
        minorSplitLine: { show: true },
      },
      yAxis: {
        name: addonAttributes.yaxis || 'f(x)',
        min: minY,
        max: maxY,
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
