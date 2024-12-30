/* eslint-disable max-lines */
import type { IParseTreeNode } from 'tiddlywiki';
import type { IScriptAddon } from '../../../scriptAddon';

const colors = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
];
const CategoriesEn = [
  'Focusing',
  'History',
  'Link To',
  'Backlink From',
  'Tag To',
  'Tag By',
  'Transclude',
].map((name, index) => ({
  name,
  itemStyle: { color: colors[index % colors.length] },
}));
const CategoriesZh = [
  '聚焦',
  '历史',
  '链接',
  '反链',
  '标签',
  '作为标签',
  '嵌套',
].map((name, index) => ({
  name,
  itemStyle: { color: colors[index % colors.length] },
}));
const attributes = new Set<string>([
  'focussedTiddler',
  'levels',
  'graphTitle',
  'aliasField',
  'excludeFilter',
  'previewDelay',
  'focusBlur',
  'previewTemplate',
  'zoom',
]);
const getPlatteColor = (name: string) =>
  $tw.wiki.renderText(
    'text/plain',
    'text/vnd.tiddlywiki',
    `<$transclude tiddler={{$:/palette}} index="${name}"><$transclude tiddler="$:/palettes/Vanilla" index="${name}"><$transclude tiddler="$:/config/DefaultColourMappings/${name}"/></$transclude></$transclude>`,
    {},
  );

const findIcon = (title: string) => {
  const fields = $tw.wiki.getTiddler(title)?.fields;
  if (!fields?.icon) {
    return undefined;
  }
  const iconFields = $tw.wiki.getTiddler(fields.icon as string)?.fields;
  if (!iconFields) {
    if (/^https?:\/\//.test(fields.icon as string)) {
      return `image://${fields.icon as string}`;
    }
    return undefined;
  }
  if (iconFields._canonical_uri) {
    return `image://${iconFields._canonical_uri}`;
  } else if (iconFields.title.startsWith('$:/core/images/')) {
    return undefined;
  } else {
    return `image://data:${iconFields.type};base64,${iconFields.text}`;
  }
};
const getAliasOrTitle = (
  tiddlerTitle: string,
  aliasField: string | undefined,
): [string, boolean] => {
  if (aliasField === undefined || aliasField === 'title') {
    return [tiddlerTitle, Boolean($tw.wiki.getTiddler(tiddlerTitle))];
  }
  const tiddler = $tw.wiki.getTiddler(tiddlerTitle);
  if (tiddler) {
    const aliasValue = tiddler.fields[aliasField];
    return [
      typeof aliasValue === 'string'
        ? $tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', aliasValue, {
            variables: { currentTiddler: tiddlerTitle },
          })
        : tiddlerTitle,
      true,
    ];
  } else {
    return [tiddlerTitle, false];
  }
};

interface ITheBrainState {
  currentlyFocused?: Set<string>;
  historyTiddlers: string[];
  viewingTiddlers: Set<string>;
  focusing?: string;
  unmount: () => void;
}

interface ITheBrainAttributes {
  focussedTiddler?: string;
  levels?: string;
  graphTitle?: string;
  aliasField?: string;
  excludeFilter?: string;
  previewDelay?: string;
  focusBlur?: string;
  previewTemplate?: string;
  zoom?: string;
}

const TheBrainAddon: IScriptAddon<ITheBrainState, ITheBrainAttributes> = {
  onMount: (myChart, attributes) => {
    myChart.on('click', { dataType: 'node' }, (event: any) => {
      new $tw.Story().navigateTiddler(event.data.name);
    });
    // 缩放检测
    let fontScale = 4;
    let originTriggerOn: string | undefined;
    let originShowDelay: number | undefined;
    const timer = setInterval(() => {
      const option = myChart.getOption() as any;
      const zoom = option?.series?.[0]?.zoom;
      if (typeof zoom !== 'number') {
        return;
      }
      if (!originTriggerOn) {
        originTriggerOn = option.tooltip.triggerOn;
        originShowDelay = option.tooltip.showDelay;
      }
      let needUpdate = false;
      const newFontScale = Math.floor(zoom * 4);
      const newShow = zoom >= 2.5;
      const newShowDelay = zoom >= 3 ? originShowDelay : 2 * originShowDelay!;
      if (option.series[0].label.show !== newShow) {
        option.series[0].label.show = newShow;
        option.tooltip.triggerOn = newShow ? originTriggerOn! : 'none';
        needUpdate = true;
      }
      if (option.tooltip.showDelay !== newShowDelay) {
        option.tooltip.showDelay = newShowDelay;
        needUpdate = true;
      }
      if (newFontScale !== fontScale) {
        fontScale = newFontScale;
        option.series[0].label.fontSize = `${Math.min(
          0.5 * fontScale + 2,
          24,
        )}px`;
        option.series[0].lineStyle.width = Math.min(
          Math.max(0.0625 * fontScale, 0.5),
          6,
        );
        if (newFontScale > 160) {
          option.series[0].label.position = 'inside';
        } else if (newFontScale > 24) {
          option.series[0].label.position = 'bottom';
        } else {
          option.series[0].label.position = 'right';
        }
        const rootBorderWidth = Math.min(0.75 * fontScale + 3, 30);
        const rootFontSize = `${rootBorderWidth}px`;
        for (const root of option.series[0].nodes) {
          if (root.category === 0) {
            root.label.fontSize = rootFontSize;
            root.itemStyle.borderWidth = rootBorderWidth;
          } else {
            break;
          }
        }
        needUpdate = true;
      }
      if (needUpdate) {
        myChart.setOption(option);
      }
    }, 200);

    return {
      historyTiddlers: [],
      viewingTiddlers: new Set(),
      focusing: attributes.focussedTiddler,
      unmount: () => {
        clearInterval(timer);
      },
    };
  },
  onUnmount: ({ unmount }) => {
    unmount();
  },
  shouldUpdate: (
    { viewingTiddlers, focusing, currentlyFocused },
    changedTiddlers,
    changedAttributes,
  ) => {
    return (
      Object.keys(changedTiddlers).some(title => viewingTiddlers.has(title)) ||
      Object.keys(changedAttributes).some(attribute =>
        attributes.has(attribute),
      ) ||
      (focusing === undefined &&
        currentlyFocused?.has(
          $tw.wiki.getTiddlerText('$:/temp/focussedTiddler') ?? '',
        ) !== true)
    );
  },
  // eslint-disable-next-line complexity
  onUpdate: (myCharts, state, addonAttributes) => {
    /** 参数：focussedTiddler 是图的中央节点 */
    let focussedTiddlers = new Set<string>();
    const titles = addonAttributes.focussedTiddler
      ? $tw.wiki.filterTiddlers(addonAttributes.focussedTiddler)
      : [$tw.wiki.getTiddlerText('$:/temp/focussedTiddler') ?? ''];
    for (const title of titles) {
      // 跳过正在编辑的条目
      if ($tw.wiki.getTiddler(title)?.fields?.['draft.of']) {
        continue;
      }
      focussedTiddlers.add(title);
    }

    if (focussedTiddlers.size === 0) {
      return;
    }
    // draft
    const t = new Set<string>();
    for (const title of focussedTiddlers) {
      const draftOf = $tw.wiki.getTiddler(title)?.fields['draft.of'];
      if (draftOf) {
        t.add(draftOf as string);
      } else {
        t.add(title);
      }
    }
    focussedTiddlers = t;

    // State
    state.focusing = addonAttributes.focussedTiddler;
    state.currentlyFocused = focussedTiddlers;
    state.viewingTiddlers.clear();
    for (const tiddler of focussedTiddlers) {
      state.viewingTiddlers.add(tiddler);
    }

    const nodes: any[] = [];
    const edges: any[] = [];
    const ifChinese =
      $tw.wiki.getTiddlerText('$:/language')?.includes('zh') === true;
    /** 参数：levels 指定图向外展开几级 */
    let levels = Number(addonAttributes.levels);
    if (Number.isNaN(levels)) {
      levels = 1;
    }
    levels = Math.max(levels, -1);
    /** 参数：graphTitle 指定右下角显示的标题 */
    const graphTitle =
      addonAttributes.graphTitle || (ifChinese ? '聚焦' : 'Focusing Map');
    /** 参数：aliasField 用于指定展示为节点标题的字段，例如 caption */
    const aliasField = addonAttributes.aliasField || 'caption';
    /** 参数：excludeFilter 用于排除部分节点 */
    const excludeFilter =
      addonAttributes.excludeFilter === ''
        ? undefined
        : $tw.wiki.compileFilter(
            addonAttributes.excludeFilter ?? '[prefix[$:/]] [is[draft]]',
          );
    const nodeMap: Map<string, boolean> = new Map();

    // 聚焦点
    for (const focussedTiddler of focussedTiddlers) {
      nodes.push({
        name: focussedTiddler,
        // fixed: true,
        category: 0,
        label: {
          formatter: getAliasOrTitle(focussedTiddler, aliasField)[0],
          fontWeight: 'bold',
          fontSize: '15px',
        },
        symbol: findIcon(focussedTiddler),
        symbolSize: 15,
        select: {
          disabled: true,
        },
        itemStyle: {
          opacity: 1,
          borderColor: `${colors[0]}66`,
          borderWidth: 15,
        },
        isTag: false,
        tooltip: {
          show: false,
        },
      });
    }

    // 初始化：当前关注的 Tiddler
    let tiddlerQueue: string[] = [];
    nodeMap.set('', false);
    for (const tiddler of focussedTiddlers) {
      tiddlerQueue.push(tiddler);
      nodeMap.set(tiddler, true);
    }
    if (excludeFilter) {
      const tiddlers = new Set<string>(tiddlerQueue);
      for (const excluded of excludeFilter.call($tw.wiki, tiddlerQueue)) {
        tiddlers.delete(excluded);
      }
      tiddlerQueue = Array.from(tiddlers);
    }

    const tryPush = (
      title: string,
      node: (label: string, exist: boolean) => any,
      edge: (exist: boolean) => any,
    ) => {
      if (excludeFilter && excludeFilter.call($tw.wiki, [title]).length > 0) {
        return false;
      }
      const nodeState = nodeMap.get(title);
      const [label, exist] =
        nodeState === undefined
          ? getAliasOrTitle(title, aliasField)
          : ['', nodeState];
      if (nodeState === undefined) {
        nodes.push(node(label, exist));
        nodeMap.set(title, exist);
        if (exist) {
          tiddlerQueue.push(title);
        }
      }
      edges.push(edge(exist));
      return exist;
    };

    // 广搜 levels 层
    while (tiddlerQueue.length && levels-- > 0) {
      const tiddlers = tiddlerQueue;
      tiddlerQueue = [];
      for (const tiddler of tiddlers) {
        // 链接
        for (const linksTo of $tw.wiki.getTiddlerLinks(tiddler)) {
          tryPush(
            linksTo,
            (label, exist) => ({
              name: linksTo,
              label: { formatter: label },
              itemStyle: { opacity: exist ? 1 : 0.5 },
              symbol: findIcon(linksTo),
              category: 2,
              isTag: false,
            }),
            exist => ({
              source: tiddler,
              target: linksTo,
              lineStyle: {
                color: colors[2],
                type: exist ? 'solid' : 'dashed',
              },
            }),
          );
        }
        // 反链
        for (const backlinksFrom of $tw.wiki.getTiddlerBacklinks(tiddler)) {
          tryPush(
            backlinksFrom,
            (label, exist) => ({
              name: backlinksFrom,
              label: { formatter: label },
              itemStyle: { opacity: exist ? 1 : 0.5 },
              symbol: findIcon(backlinksFrom),
              category: 3,
              isTag: false,
            }),
            exist => ({
              source: backlinksFrom,
              target: tiddler,
              lineStyle: {
                color: colors[3],
                type: exist ? 'solid' : 'dashed',
              },
            }),
          );
        }
        // 标签
        for (const tag of $tw.wiki.getTiddler(tiddler)?.fields?.tags ?? []) {
          tryPush(
            tag,
            (label, exist) => ({
              name: tag,
              label: { formatter: label },
              itemStyle: { opacity: exist ? 1 : 0.5 },
              symbol: findIcon(tag),
              category: 4,
              isTag: true,
            }),
            exist => ({
              source: tiddler,
              target: tag,
              lineStyle: {
                color: colors[4],
                type: exist ? 'solid' : 'dashed',
              },
            }),
          );
        }
        // 作为标签
        for (const tagBy of $tw.wiki.getTiddlersWithTag(tiddler)) {
          tryPush(
            tagBy,
            (label, exist) => ({
              name: tagBy,
              label: { formatter: label },
              itemStyle: { opacity: exist ? 1 : 0.5 },
              symbol: findIcon(tagBy),
              category: 5,
              isTag: false,
            }),
            exist => ({
              source: tagBy,
              target: tiddler,
              lineStyle: {
                color: colors[5],
                type: exist ? 'solid' : 'dashed',
              },
            }),
          );
        }
        // 嵌入
        for (const transcludeTiddler of $tw.wiki.getTiddlerBacktranscludes(tiddler)) {
          tryPush(
            transcludeTiddler,
            (label, exist) => ({
              name: transcludeTiddler,
              label: { formatter: label },
              itemStyle: { opacity: exist ? 1 : 0.5 },
              symbol: findIcon(transcludeTiddler),
              category: 6,
              isTag: false,
            }),
            exist => ({
              source: transcludeTiddler,
              target: tiddler,
              lineStyle: {
                color: colors[6],
                type: exist ? 'solid' : 'dashed',
              },
            }),
          );
        }
      }
    }

    // 历史路径
    if (focussedTiddlers.size === 1) {
      const focussedTiddler = focussedTiddlers.values().next().value;
      let nextTiddler = focussedTiddler;
      const historyMap: Set<string> = new Set();
      for (let index = state.historyTiddlers.length - 2; index >= 0; index--) {
        const tiddlerTitle = state.historyTiddlers[index];
        if (
          historyMap.has(tiddlerTitle) ||
          tiddlerTitle === nextTiddler ||
          tiddlerTitle.startsWith('$:/')
        ) {
          continue;
        }
        tryPush(
          tiddlerTitle,
          (label, exist) => ({
            name: tiddlerTitle,
            label: { formatter: label },
            category: 1,
            symbol: findIcon(tiddlerTitle),
            symbolSize: 3,
            itemStyle: { opacity: exist ? 0.65 : 0.4 },
            isTag: false,
          }),
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          exist => ({
            source: tiddlerTitle,
            target: nextTiddler,
            lineStyle: {
              color: colors[1],
              type: exist ? 'dashed' : 'dotted',
              opacity: 0.5,
            },
          }),
        );
        nextTiddler = tiddlerTitle;
      }
      // 更新历史
      const historyIndex = state.historyTiddlers.indexOf(focussedTiddler);
      if (historyIndex > -1) {
        state.historyTiddlers.splice(historyIndex, 1);
      }
      state.historyTiddlers.push(focussedTiddler);
      state.historyTiddlers.slice(-10);
    }

    let lastTitle = '';
    let cache: Element[] | undefined;
    const cachedTooltipFormatter = ({
      data: { name, isTag },
      dataType,
    }: {
      data: { name: string; isTag: boolean };
      dataType: string;
    }) => {
      if (dataType !== 'node') {
        return [];
      }
      if (name !== lastTitle || !cache) {
        const container = $tw.utils.domMaker('div', {
          style: {
            maxWidth: '40vw',
            maxHeight: '50vh',
            overflowY: 'auto',
            whiteSpace: 'normal',
          },
          class: 'gk0wk-echarts-thebrain-popuptiddler-container',
        });
        if (isTag) {
          const ul = $tw.utils.domMaker('ul', {});
          const tiddlers = $tw.wiki.getTiddlersWithTag(name);
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
          cache = [ul];
        } else {
          // 不可以直接 renderText, 那种是 headless 渲染
          $tw.wiki
            .makeWidget(
              $tw.wiki.parseTiddler(
                addonAttributes.previewTemplate ||
                  '$:/plugins/Gk0Wk/echarts/addons/TheBrainPopup',
              ),
              {
                document,
                parseAsInline: true,
                variables: { currentTiddler: name },
              } as any,
            )
            .render(container, null);
          cache = [
            container,
            $tw.utils.domMaker('style', {
              innerHTML: `.gk0wk-echarts-thebrain-popuptiddler-container::-webkit-scrollbar {display: none;} .gk0wk-echarts-thebrain-popuptiddler-container .tc-tiddler-controls { display: none; }`,
            }),
          ];
        }
        lastTitle = name;
      }
      return cache;
    };

    let zoom = Number(addonAttributes.zoom);
    if (Number.isNaN(zoom) || Number.isFinite(zoom) || zoom <= 0) {
      zoom = 4;
    }
    let previewDelay = Number(addonAttributes.previewDelay || '1000');
    if (!Number.isSafeInteger(previewDelay)) {
      previewDelay = -1;
    }
    const focusBlur = addonAttributes.focusBlur?.toLowerCase?.() !== 'false';
    myCharts.setOption({
      backgroundColor: 'transparent',
      legend: [
        {
          data: (ifChinese ? CategoriesZh : CategoriesEn).map(a => {
            return a.name;
          }),
          icon: 'circle',
        },
      ],
      title: {
        text: graphTitle,
        show: true,
        top: 'bottom',
        left: 'right',
      },
      toolbox: {
        show: true,
        left: 0,
        bottom: 0,
        feature: {
          restore: {},
          saveAsImage: {},
        },
      },
      tooltip: {
        position: 'top',
        formatter: cachedTooltipFormatter,
        triggerOn: previewDelay >= 0 ? 'mousemove' : 'none',
        enterable: true,
        showDelay: Math.max(0, previewDelay),
        hideDelay: 200,
        confine: true,
        textStyle: {
          color: 'inherit',
          fontFamily: 'inherit',
          fontSize: 'inherit',
        },
        appendToBody: true,
        backgroundColor: getPlatteColor('page-background'),
        borderColor: getPlatteColor('very-muted-foreground'),
      },
      series: [
        {
          name: graphTitle,
          type: 'graph',
          layout: 'force',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          height: '100%',
          width: '100%',
          nodes,
          edges,
          categories: ifChinese ? CategoriesZh : CategoriesEn,
          roam: true,
          draggable: false,
          zoom,
          label: {
            position: 'right',
            show: true,
            fontSize: '10px',
            backgroundColor: 'transparent',
          },
          labelLayout: {
            moveOverlap: true,
          },
          edgeLabel: {
            show: false,
          },
          force: {
            repulsion: 50,
          },
          cursor: 'pointer',
          symbolSize: 6,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [0, 5],
          lineStyle: {
            width: 1,
            opacity: 0.75,
            curveness: 0.15,
          },
          itemStyle: {
            opacity: 0.9,
          },
          // 高亮聚焦
          emphasis: {
            disabled: !focusBlur,
            focus: 'adjacency',
            scale: 1.2,
          },
          blur: {
            itemStyle: { opacity: 0.3 },
            lineStyle: { opacity: 0.3 },
          },
        },
      ],
    } as any);
  },
};

export default TheBrainAddon;
/* eslint-enable max-lines */
