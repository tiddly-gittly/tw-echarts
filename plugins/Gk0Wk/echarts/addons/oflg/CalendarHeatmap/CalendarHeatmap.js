/* \
title: $:/plugins/Gk0Wk/echarts/addons/oflg/CalendarHeatmap/CalendarHeatmap.js
type: application/javascript
module-type: echarts-component

Calendar Heatmap for TiddlyWiki
\ */

exports.onMount = function (echart) {
  const state = {};
  return state;
};

exports.shouldUpdate = function (_, changedTiddlers) {
  return $tw.utils.count(changedTiddlers) > 0;
};

exports.onUpdate = function (myChart, state, addonAttributes) {
  const year = Number(addonAttributes.year) || new Date().getFullYear();

  function getData(year) {
    const startDate = +echarts.number.parseDate(year + '-01-01');
    const endDate = +echarts.number.parseDate(+year + 1 + '-01-01');

    const dayTime = 3600 * 24 * 1000;

    const data = [];

    for (let time = startDate; time < endDate; time += dayTime) {
      const twtime = echarts.format.formatTime('yyyy-MM-dd', time).replace(/-/g, '');
      data.push([
        echarts.format.formatTime('yyyy-MM-dd', time),
        $tw.wiki.filterTiddlers(
          '[all[tiddlers]!is[shadow]!prefix[$:/state/]!prefix[$:/temp/]sameday:created[' +
            twtime +
            ']][all[tiddlers]!is[shadow]!prefix[$:/state/]!prefix[$:/temp/]sameday:modified[' +
            twtime +
            ']]+[count[]]',
        ),
      ]);
    }

    return data;
  }

  const option = {
    tooltip: {
      position: 'top',
      formatter: function (p) {
        const format = echarts.format.formatTime('yyyy-MM-dd', p.data[0]);
        return format + ': ' + p.data[1];
      },
    },
    visualMap: {
      min: 0,
      max: 10,
      calculable: true,
      orient: 'vertical',
      left: 0,
      top: 10,
    },
    calendar: {
      left: 90,
      cellSize: 'auto',
      top: 20,
      orient: 'horizontal',
      range: year,
      dayLabel: {
        margin: 5,
      },
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      calendarIndex: 0,
      data: getData(year),
    },
  };

  option && myChart.setOption(option);

  myChart.on('click', 'series', function (parameters) {
    if (parameters.data[1] > 0) {
      const day = parameters.data[0].replace(/-/g, '');

      const filter =
        '[all[tiddlers]!is[shadow]!prefix[$:/state/]!prefix[$:/temp/]sameday:created[' +
        day +
        ']][all[tiddlers]!is[shadow]!prefix[$:/state/]!prefix[$:/temp/]sameday:modified[' +
        day +
        ']]+[sort[]]';

      $tw.rootWidget.invokeActionString(
        '<$action-setfield $tiddler="$:/temp/advancedsearch" text="""' +
          filter +
          '"""/><$action-setfield $tiddler="$:/temp/advancedsearch/input" text="""' +
          filter +
          '"""/><$action-setfield $tiddler="$:/temp/advancedsearch/refresh" text="yes"/><$action-setfield $tiddler="$:/state/tab--1498284803" text="$:/core/ui/AdvancedSearch/Filter"/>',
      );

      new $tw.Story().navigateTiddler('$:/AdvancedSearch');
    }
  });
};
