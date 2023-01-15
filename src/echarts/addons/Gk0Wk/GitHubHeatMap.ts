import { IScriptAddon } from '../../scriptAddon';
import * as ECharts from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

const getFilterByDate = (date: string, subfilter: string) =>
  `[all[tiddlers]sameday:created[${date}]][all[tiddlers]sameday:modified[${date}]] +${subfilter} +[sort[]]`;
const yearDates: Map<number, [string, string][]> = new Map();
const dayTime = 3600 * 24 * 1000;
const getData = (year: number, subfilter: string) => {
  if (!yearDates.has(year)) {
    const startDate = (ECharts as any).number
      .parseDate(`${year}-01-01`)
      .getTime();
    const endDate = (ECharts as any).number
      .parseDate(`${year + 1}-01-01`)
      .getTime();
    const dates: [string, string][] = [];
    for (let time = startDate; time < endDate; time += dayTime) {
      const timeFmt: string = (ECharts as any).format.formatTime(
        'yyyy-MM-dd',
        time,
      );
      const timeTW = timeFmt.replace(/-/g, '');
      dates.push([timeFmt, timeTW]);
    }
    yearDates.set(year, dates);
  }
  let total = 0;
  return [
    yearDates.get(year)!.map(([timeFmt, timeTW]) => {
      const count = $tw.wiki.filterTiddlers(
        getFilterByDate(timeTW, subfilter),
      ).length;
      total += count;
      return [timeFmt, count];
    }),
    total,
  ] as [[string, number][], number];
};

const getPlatteColor = (name: string) =>
  $tw.wiki.renderText(
    'text/plain',
    'text/vnd.tiddlywiki',
    `<$transclude tiddler={{$:/palette}} index="${name}"><$transclude tiddler="$:/palettes/Vanilla" index="${name}"><$transclude tiddler="$:/config/DefaultColourMappings/${name}"/></$transclude></$transclude>`,
    {},
  );

const checkIfChinese = () =>
  $tw.wiki.getTiddlerText('$:/language')?.includes('zh') === true;

const checkIfDarkMode = () =>
  $tw.wiki.getTiddler($tw.wiki.getTiddlerText('$:/palette')!)?.fields?.[
    'color-scheme'
  ] === 'dark';

const GitHubHeatMapAddon: IScriptAddon<any> = {
  shouldUpdate: (_, changedTiddlers) => $tw.utils.count(changedTiddlers) > 0,
  onUpdate: (myChart, _state, addonAttributes) => {
    const year = parseInt(addonAttributes.year, 10) || new Date().getFullYear();
    const subfilter = addonAttributes.subfilter || '[!is[shadow]!prefix[$:/]]';
    const [data, total] = getData(year, subfilter);
    const tooltipFormatter = (dateValue: string, count: number) => {
      if (count === 0) {
        return checkIfChinese()
          ? `${(ECharts as any).format.formatTime(
              'yyyy年M月d日',
              dateValue,
            )} 无条目。`
          : `${$tw.utils.formatDateString(
              $tw.utils.parseDate(dateValue.replace(/-/g, ''))!,
              'MMM DDD, YYYY',
            )} no tiddler.`;
      }
      const p = $tw.utils.domMaker('p', {
        text: checkIfChinese()
          ? `${(ECharts as any).format.formatTime(
              'yyyy年M月d日',
              dateValue,
            )} 共有 ${count} 篇:`
          : `${$tw.utils.formatDateString(
              $tw.utils.parseDate(dateValue.replace(/-/g, ''))!,
              'MMM DDD, YYYY',
            )} ${count} tiddler${count > 1 ? 's' : ''}.`,
      });
      const ul = $tw.utils.domMaker('ul', {});
      const tiddlers = $tw.wiki.filterTiddlers(
        getFilterByDate(dateValue.replace(/-/g, ''), subfilter),
      );
      const len = tiddlers.length;
      for (let i = 0; i < len; i++) {
        const tiddler = tiddlers[i];
        const li = $tw.utils.domMaker('li', {});
        const a = $tw.utils.domMaker('a', {
          text: tiddler,
          class:
            'tc-tiddlylink tc-tiddlylink-resolves tc-popup-handle tc-popup-absolute',
          style: {
            cursor: 'pointer',
          },
        });
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        a.addEventListener('click', () =>
          new $tw.Story().navigateTiddler(tiddler),
        );
        li.appendChild(a);
        ul.appendChild(li);
      }
      return [p, ul];
    };
    let lastDateValue = '';
    let lastCount = 0;
    let cache: Element[] | string | undefined;
    const cachedTooltipFormatter = ({
      value: [dateValue, count],
    }: {
      value: [string, number];
    }) => {
      if (dateValue !== lastDateValue || count !== lastCount || !cache) {
        cache = tooltipFormatter(dateValue, count);
        lastDateValue = dateValue;
        lastCount = count;
      }
      return cache;
    };
    myChart.setOption({
      title: {
        top: 0,
        left: 'center',
        text: checkIfChinese()
          ? `今年产出 ${total} 篇文章`
          : `Produced ${total} tiddlers this year`,
      },
      tooltip: {
        position: 'top',
        formatter: cachedTooltipFormatter,
        triggerOn: 'mousemove|click',
        enterable: true,
        hideDelay: 800,
        backgroundColor: getPlatteColor('page-background'),
        borderColor: getPlatteColor('very-muted-foreground'),
      },
      visualMap: {
        type: 'piecewise',
        orient: 'horizontal',
        calculable: true,
        showLabel: false,
        right: 0,
        top: 175,
        pieces: [
          // 设置分段范围
          { lte: 0, color: checkIfDarkMode() ? '#161B22' : '#EBEDF0' },
          { gt: 0, lte: 3, color: '#0E4429' },
          { gt: 3, lte: 7, color: '#006D32' },
          { gt: 7, lte: 15, color: '#26A641' },
          { gt: 15, color: '#39D353' },
        ],
      },
      calendar: {
        top: 60,
        left: 0,
        right: 0,
        cellSize: 15,
        orient: 'horizontal',
        range: year,
        itemStyle: {
          borderWidth: 3,
          borderCap: 'round',
          borderJoin: 'round',
          borderColor: getPlatteColor('background'),
        },
        splitLine: {
          show: false,
        },
        dayLabel: {
          show: true,
          nameMap: checkIfChinese() ? 'ZH' : 'EN',
        },
        monthLabel: {
          show: true,
          nameMap: checkIfChinese() ? 'ZH' : 'EN',
        },
        yearLabel: {
          show: true,
          position: 'bottom',
          margin: 12,
          verticalAlign: 'top',
        },
      },
      series: {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        calendarIndex: 0,
        data,
      },
    } as any);
  },
};

export default GitHubHeatMapAddon;
