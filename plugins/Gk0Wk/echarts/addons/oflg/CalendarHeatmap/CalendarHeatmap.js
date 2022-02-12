/*\
title: $:/plugins/Gk0Wk/echarts/addons/oflg/CalendarHeatmap/CalendarHeatmap.js
type: application/javascript
module-type: echarts-component

Calendar Heatmap for TiddlyWiki
\*/
exports.onUpdate = function (myChart) {
    function getData(year) {
        year = new Date().getFullYear();

        var startDate = +echarts.number.parseDate(year + '-01-01'),
            endDate = +echarts.number.parseDate(+year + 1 + '-01-01');

        var dayTime = 3600 * 24 * 1000;

        var data = [];

        for (var time = startDate; time < endDate; time += dayTime) {
            var twtime = echarts.format.formatTime('yyyy-MM-dd', time).replace(/-/g, "");
            data.push([
                echarts.format.formatTime('yyyy-MM-dd', time),
                $tw.wiki.filterTiddlers('[all[]!is[shadow]sameday:created[' + twtime + ']][all[]!is[shadow]sameday:modified[' + twtime + ']]+[count[]]')
            ]);
        }
        return data;
    }
    var option = {
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
    };

    option && myChart.setOption(option);
};
