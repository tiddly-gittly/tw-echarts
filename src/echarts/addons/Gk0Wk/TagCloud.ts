import { ECharts } from 'echarts';

export const onMount = (echart: ECharts) => {
  const state = {};
  echart.on('click', function (event: any) {
    $tw.wiki.setText(
      '$:/temp/Gk0Wk/echarts/addons/TagCloud/currentTag',
      'text',
      undefined,
      event.data.name,
      {},
    );
    new ($tw as any).Story().navigateTiddler(
      '$:/plugins/Gk0Wk/echarts/addons/TagCloudTagView',
    );
  });
  return state;
};

export const shouldUpdate = (_: any, changedTiddlers: string[]) => {
  return $tw.utils.count(changedTiddlers) > 0;
};

// See https://github.com/ecomfe/echarts-wordcloud
export const onUpdate = (echart: ECharts) => {
  let previousDarkMode;
  const colorCache = new Map();
  const getColor = (tag: string) => {
    if (!colorCache.get(tag)) {
      const rgb = [];
      for (let i = 0; i < 3; i++) {
        rgb.push(
          isDarkMode
            ? 255 - Math.round(Math.random() * 160)
            : Math.round(Math.random() * 160),
        );
      }
      colorCache.set(tag, `rgb(${rgb.join(',')})`);
    }
    return colorCache.get(tag);
  };
  const chartOptions = echart.getOption();
  const isDarkMode = (chartOptions as any)?.darkMode === true;
  const filter =
    (chartOptions ? (chartOptions as any).filter : '') ||
    '[tags[]!is[system]sort[title]]';
  if (previousDarkMode !== isDarkMode) {
    previousDarkMode = isDarkMode;
    colorCache.clear();
  }
  const data = $tw.wiki.filterTiddlers(filter).map(tag => ({
    name: tag,
    value: Math.sqrt(($tw.wiki as any).getTiddlersWithTag(tag).length),
    textStyle: {
      color: getColor(tag),
    },
  }));
  echart.setOption({
    series: [
      {
        type: 'wordCloud',
        gridSize: 4,
        shape: 'pentagon',
        data,
        layoutAnimation: true,
        textStyle: {
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
        },
        emphasis: {
          focus: 'self',
          textStyle: {
            textShadowBlur: 10,
            textShadowColor: '#333',
          },
        },
      },
    ],
  } as any);
};
