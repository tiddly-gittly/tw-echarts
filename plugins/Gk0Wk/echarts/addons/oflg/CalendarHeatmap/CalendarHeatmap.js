/*\
title: $:/plugins/Gk0Wk/echarts/addons/oflg/CalendarHeatmap/CalendarHeatmap.js
type: application/javascript
module-type: library

Calendar Heatmap for TiddlyWiki
\*/
var TIME_OF_DAY = 3600 * 24 * 1000;
exports.shouldUpdate = function (_, changedTiddlers) {
  var shouldRefresh = false;
  $tw.utils.each(changedTiddlers, function (_, key) {
    if (!$tw.wiki.isShadowTiddler(key)) {
      shouldRefresh = true;
      return false;
    }
  });
  return shouldRefresh;
};
exports.onUpdate = function (echart) {
  function getData() {
    var year = new Date().getFullYear();
    var date = echarts.number.parseDate(year + '-01-01');
    var end = echarts.number.parseDate((year + 1) + '-01-01');
    var data = [];
    for (var time = date; time < end; time += TIME_OF_DAY) {
      var twtime = echarts.format.formatTime('yyyy-MM-dd', time).replace(/-/g, "");
      data.push([
        echarts.format.formatTime('yyyy-MM-dd', time),
        $tw.wiki.filterTiddlers('[all[]!is[shadow]sameday:created[' + twtime + ']][all[]!is[shadow]sameday:modified[' + twtime + ']]+[count[]]')
      ]);
    }
    return data;
  }
  echart.setOption({
    tooltip: {
      position: 'top',
      formatter: function (p) {
        var format = echarts.format.formatTime('yyyy-MM-dd', p.data[0]);
        return format + ': ' + p.data[1];
      }
    },
    visualMap: {
      min: 0,
      max: 10,
      calculable: true,
      orient: 'vertical',
      left: 0,
      top: 10
    },
    calendar: [
      {
        left: 90,
        cellSize: 'auto',
        top: 20,
        orient: 'horizontal',
        range: new Date().getFullYear(),
        dayLabel: {
          margin: 5
        }
      }
    ],
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        calendarIndex: 0,
        data: getData()
      }
    ]
  });
};
