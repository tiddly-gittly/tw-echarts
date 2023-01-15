import type { IScriptAddon } from '../../scriptAddon';

const getPlatteColor = (name: string) =>
  $tw.wiki.renderText(
    'text/plain',
    'text/vnd.tiddlywiki',
    `<$transclude tiddler={{$:/palette}} index="${name}"><$transclude tiddler="$:/palettes/Vanilla" index="${name}"><$transclude tiddler="$:/config/DefaultColourMappings/${name}"/></$transclude></$transclude>`,
    {},
  );
const addon: IScriptAddon<any> = {
  shouldUpdate: (_state, changedTiddlers) => {
    return $tw.utils.count(changedTiddlers) > 0;
  },
  // See https://github.com/ecomfe/echarts-wordcloud
  onUpdate: myChart => {
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
    const tooltipFormatter = (tag: string) => {
      const ul = $tw.utils.domMaker('ul', {});
      const tiddlers = $tw.wiki.getTiddlersWithTag(tag);
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
      return [ul];
    };
    let lastTag = '';
    let cache: Element[] | string | undefined;
    const cachedTooltipFormatter = ({
      data: { name },
    }: {
      data: { name: string };
    }) => {
      if (name !== lastTag || !cache) {
        cache = tooltipFormatter(name);
        lastTag = name;
      }
      return cache;
    };
    const chartOptions = myChart.getOption();
    const isDarkMode = (chartOptions as any).darkMode === true;
    const filter =
      (chartOptions as any).filter || '[tags[]!is[system]sort[title]]';
    if (previousDarkMode !== isDarkMode) {
      previousDarkMode = isDarkMode;
      colorCache.clear();
    }
    const data = $tw.wiki.filterTiddlers(filter).map(tag => ({
      name: tag,
      value: Math.sqrt($tw.wiki.getTiddlersWithTag(tag).length),
      textStyle: {
        color: getColor(tag),
      },
    }));
    myChart.setOption({
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
      tooltip: {
        position: 'top',
        formatter: cachedTooltipFormatter,
        triggerOn: 'mousemove|click',
        enterable: true,
        hideDelay: 800,
        textStyle: {
          color: 'inherit',
          fontFamily: 'inherit',
          fontSize: 'inherit',
        },
        backgroundColor: getPlatteColor('page-background'),
        borderColor: getPlatteColor('very-muted-foreground'),
      },
    } as any);
  },
};

export default addon;
