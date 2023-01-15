/* eslint-disable max-lines */
import type { IParseTreeNode } from 'tiddlywiki';
import type { IScriptAddon } from '../../scriptAddon';

const CategoriesEn = [
  'Focusing',
  'History',
  'Link To',
  'Backlink From',
  'Tag To',
  'Tag By',
  'Transclude',
].map(name => ({ name }));
const CategoriesZh = [
  '聚焦',
  '历史',
  '引用',
  '被引用',
  '作为标签',
  '赋予标签',
  '嵌入',
].map(name => ({ name }));
const attributes = new Set<string>([
  'focussedTiddler',
  'levels',
  'graphTitle',
  'aliasField',
  'excludeFilter',
  'previewDelay',
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
    return undefined;
  }
  if (iconFields._canonical_uri) {
    return `image://${iconFields._canonical_uri}`;
  } else {
    return `image://data:${iconFields.type};base64,${iconFields.text}`;
  }
};
const getAliasOrTitle = (
  tiddlerTitle: string,
  aliasField: string | undefined,
) => {
  if (aliasField === undefined || aliasField === 'title') {
    return tiddlerTitle;
  }
  const tiddler = $tw.wiki.getTiddler(tiddlerTitle);
  if (tiddler) {
    const aliasValue = tiddler.fields[aliasField];
    return typeof aliasValue === 'string'
      ? $tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', aliasValue, {
          variables: { currentTiddler: tiddlerTitle },
        })
      : tiddlerTitle;
  } else {
    return tiddlerTitle;
  }
};

interface ITheBrainState {
  currentlyFocused?: string;
  historyTiddlers: string[];
  viewingTiddlers: Set<string>;
  focusing?: string;
}

const TheBrainAddon: IScriptAddon<ITheBrainState> = {
  onMount: (myChart, attributes) => {
    myChart.on('click', { dataType: 'node' }, (event: any) => {
      new $tw.Story().navigateTiddler(event.data.name);
    });
    return {
      historyTiddlers: [],
      viewingTiddlers: new Set(),
      focusing: attributes.focussedTiddler,
    };
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
        $tw.wiki.getTiddlerText('$:/temp/focussedTiddler') !== currentlyFocused)
    );
  },
  // eslint-disable-next-line complexity
  onUpdate: (
    myCharts,
    state,
    addonAttributes: {
      focussedTiddler?: string;
      levels?: number;
      graphTitle?: string;
      aliasField?: string;
      excludeFilter?: string;
      previewDelay?: string;
    },
  ) => {
    /** 参数：focussedTiddler 是图的中央节点 */
    const focussedTiddler =
      addonAttributes.focussedTiddler ||
      $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
    state.viewingTiddlers.clear();
    state.focusing = addonAttributes.focussedTiddler;
    state.currentlyFocused = focussedTiddler;
    if (!focussedTiddler) {
      return;
    }
    state.viewingTiddlers.add(focussedTiddler);
    // 不允许 focussedTiddler 是系统条目，以免产生大量节点
    if (focussedTiddler?.startsWith('$:/')) {
      return;
    }
    const nodes = [];
    const edges = [];
    const ifChinese =
      $tw.wiki.getTiddlerText('$:/language')?.includes('zh') === true;
    /** 参数：levels 指定图向外展开几级 */
    const levels = Number(addonAttributes.levels) || 1;
    /** 参数：graphTitle 指定右下角显示的标题 */
    const graphTitle =
      addonAttributes.graphTitle || ifChinese ? '聚焦' : 'Focusing Map';

    /** 参数：aliasField 用于指定展示为节点标题的字段，例如 caption */
    const aliasField =
      addonAttributes.aliasField === ''
        ? undefined
        : addonAttributes.aliasField;
    /** 参数：excludeFilter 用于排除部分节点 */
    const excludeFilter = addonAttributes.excludeFilter
      ? $tw.wiki.compileFilter(addonAttributes.excludeFilter)
      : undefined;
    if (focussedTiddler && focussedTiddler !== '') {
      const nodeMap: Set<string> = new Set();
      nodeMap.add('');

      // 当前关注的 Tiddler
      nodeMap.add(focussedTiddler);
      nodes.push({
        name: focussedTiddler,
        // fixed: true,
        category: 0,
        label: {
          formatter: getAliasOrTitle(focussedTiddler, aliasField),
        },
        symbol: findIcon(focussedTiddler),
        symbolSize: 15,
        select: {
          disabled: true,
        },
        itemStyle: {
          opacity: 1,
        },
      });

      // 历史路径
      let nextTiddler = focussedTiddler;
      const historyMap: Set<string> = new Set();
      for (let index = state.historyTiddlers.length - 2; index >= 0; index--) {
        const tiddlerTitle = state.historyTiddlers[index];
        if (
          historyMap.add(tiddlerTitle) ||
          tiddlerTitle === nextTiddler ||
          tiddlerTitle.startsWith('$:/')
        ) {
          continue;
        }
        edges.push({
          source: tiddlerTitle,
          target: nextTiddler,
          lineStyle: {
            color: 'source',
            type: 'dashed',
          },
        });
        historyMap.add(tiddlerTitle);
        nextTiddler = tiddlerTitle;
        if (nodeMap.has(tiddlerTitle)) {
          break;
        }
        if (
          !excludeFilter ||
          excludeFilter.call($tw.wiki, [tiddlerTitle]).length === 0
        ) {
          nodes.push({
            name: tiddlerTitle,
            label: { formatter: getAliasOrTitle(tiddlerTitle, aliasField) },
            category: 1,
            symbol: findIcon(tiddlerTitle),
            itemStyle: {
              opacity: 0.5,
            },
          });
        }
        nodeMap.add(tiddlerTitle);
      }

      const pushLink = (
        target: string,
        source: string,
        recursiveLevel: number,
      ) => {
        edges.push({
          source,
          target,
          lineStyle: {
            color: 'target',
          },
        });
        if (nodeMap.has(target)) {
          return;
        }
        if (
          !excludeFilter ||
          excludeFilter.call($tw.wiki, [target]).length === 0
        ) {
          nodes.push({
            name: target,
            label: { formatter: getAliasOrTitle(target, aliasField) },
            symbol: findIcon(target),
            category: 2,
          });
        }
        nodeMap.add(target);
        if (recursiveLevel === levels) {
          return;
        }
        $tw.utils.each($tw.wiki.getTiddlerLinks(target), target2 => {
          pushLink(target2, target, recursiveLevel + 1);
        });
      };
      // 链接
      $tw.utils.each($tw.wiki.getTiddlerLinks(focussedTiddler), targetTiddler =>
        pushLink(targetTiddler, focussedTiddler, 1),
      );

      // 反链
      const pushBackLink = (
        tiddlerTitle: string,
        target: string,
        recursiveLevel: number,
      ) => {
        edges.push({
          source: tiddlerTitle,
          target,
          lineStyle: {
            color: 'source',
          },
        });
        if (nodeMap.has(tiddlerTitle)) {
          return;
        }
        if (
          !excludeFilter ||
          excludeFilter.call($tw.wiki, [tiddlerTitle]).length === 0
        ) {
          nodes.push({
            name: tiddlerTitle,
            symbol: findIcon(tiddlerTitle),
            category: 3,
          });
        }
        nodeMap.add(tiddlerTitle);
        if (recursiveLevel === levels) {
          return;
        }
        $tw.utils.each(
          $tw.wiki.getTiddlerLinks(tiddlerTitle),
          tiddlerTitle2 => {
            pushBackLink(tiddlerTitle2, tiddlerTitle, recursiveLevel + 1);
          },
        );
      };
      $tw.utils.each(
        $tw.wiki.getTiddlerBacklinks(focussedTiddler),
        sourceTiddler => pushBackLink(sourceTiddler, focussedTiddler, 1),
      );

      // 指向哪些tag
      const pushTag = (
        tiddlerTitle: string,
        source: string,
        recursiveLevel: number,
      ) => {
        if (!$tw.wiki.tiddlerExists(tiddlerTitle)) {
          return;
        }
        edges.push({
          source,
          target: tiddlerTitle,
          lineStyle: {
            color: 'source',
          },
        });
        if (nodeMap.has(tiddlerTitle)) {
          return;
        }
        if (
          !excludeFilter ||
          excludeFilter.call($tw.wiki, [tiddlerTitle]).length === 0
        ) {
          nodes.push({
            name: tiddlerTitle,
            label: { formatter: getAliasOrTitle(tiddlerTitle, aliasField) },
            symbol: findIcon(tiddlerTitle),
            category: 4,
          });
        }
        nodeMap.add(tiddlerTitle);
        if (recursiveLevel === levels) {
          return;
        }
        $tw.utils.each(
          $tw.wiki.getTiddler(tiddlerTitle)?.fields?.tags ?? [],
          tiddlerTag2 => {
            pushBackLink(tiddlerTag2, tiddlerTitle, recursiveLevel + 1);
          },
        );
      };
      $tw.utils.each(
        $tw.wiki.getTiddler(focussedTiddler)?.fields?.tags ?? [],
        tiddlerTag => pushTag(tiddlerTag, focussedTiddler, 1),
      );

      // 被谁作为 Tag
      const pushBackTag = (
        tiddlerTitle: string,
        target: string,
        recursiveLevel: number,
      ) => {
        edges.push({
          source: tiddlerTitle,
          target,
          lineStyle: {
            color: 'target',
          },
        });
        if (nodeMap.has(tiddlerTitle)) {
          return;
        }
        if (
          !excludeFilter ||
          excludeFilter.call($tw.wiki, [tiddlerTitle]).length === 0
        ) {
          nodes.push({
            name: tiddlerTitle,
            label: { formatter: getAliasOrTitle(tiddlerTitle, aliasField) },
            symbol: findIcon(tiddlerTitle),
            category: 5,
          });
        }
        nodeMap.add(tiddlerTitle);
        if (recursiveLevel === levels) {
          return;
        }
        $tw.utils.each(
          $tw.wiki.getTiddlersWithTag(tiddlerTitle),
          tiddlerTitle2 => {
            pushBackTag(tiddlerTitle2, tiddlerTitle, recursiveLevel + 1);
          },
        );
      };
      $tw.utils.each(
        $tw.wiki.getTiddlersWithTag(focussedTiddler),
        tiddlerTitle => {
          pushBackTag(tiddlerTitle, focussedTiddler, 1);
        },
      );

      // 嵌入
      const type =
        $tw.wiki.getTiddler(focussedTiddler)!.fields?.type ||
        'text/vnd.tiddlywiki';
      if (type === 'text/vnd.tiddlywiki' || type === 'text/x-markdown') {
        const transcluded: Set<string> = new Set();
        const findTransclude = (children: IParseTreeNode[]) => {
          const { length } = children;
          for (let i = 0; i < length; i++) {
            const node = children[i];
            if (node.type === 'tiddler') {
              const title = node.attributes!.tiddler?.value as
                | string
                | undefined;
              if (title) {
                transcluded.add(title);
              }
            } else if (Array.isArray((node as any).children)) {
              findTransclude((node as any).children);
            }
          }
        };
        findTransclude($tw.wiki.parseTiddler(focussedTiddler).tree);
        for (const transcludeTiddler of transcluded) {
          edges.push({
            source: focussedTiddler,
            target: transcludeTiddler,
            lineStyle: {
              color: 'target',
            },
          });
          if (nodeMap.has(transcludeTiddler)) {
            continue;
          }
          if (
            !excludeFilter ||
            excludeFilter.call($tw.wiki, [transcludeTiddler]).length === 0
          ) {
            nodes.push({
              name: transcludeTiddler,
              label: {
                formatter: getAliasOrTitle(transcludeTiddler, aliasField),
              },
              symbol: findIcon(transcludeTiddler),
              category: 6,
            });
          }
          nodeMap.add(transcludeTiddler);
        }
      }
    }

    // 更新历史
    const historyIndex = state.historyTiddlers.indexOf(focussedTiddler);
    if (historyIndex > -1) {
      state.historyTiddlers.splice(historyIndex, 1);
    }
    state.historyTiddlers.push(focussedTiddler);
    state.historyTiddlers.slice(-10);

    let lastTitle = '';
    let cache: Element[] | undefined;
    const cachedTooltipFormatter = ({
      data: { name },
      dataType,
    }: {
      data: { name: string };
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
        // 不可以直接 renderText, 那种是 headless 渲染
        $tw.wiki
          .makeWidget(
            $tw.wiki.parseTiddler(
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
        lastTitle = name;
      }
      return cache;
    };

    let previewDelay = Number(addonAttributes.previewDelay || '1200');
    if (!Number.isSafeInteger(previewDelay)) {
      previewDelay = -1;
    }
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
        hideDelay: 800,
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
          draggable: true,
          zoom: 4,
          label: {
            position: 'right',
            show: true,
            backgroundColor: 'transparent',
          },
          labelLayout: {
            moveOverlap: true,
          },
          force: {
            repulsion: 50,
          },
          cursor: 'pointer',
          symbolSize: 5,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: [4, 10],
          lineStyle: {
            width: 1,
            opacity: 0.75,
            curveness: 0.15,
          },
          itemStyle: {
            opacity: 0.9,
          },
        },
      ],
    } as any);
  },
};

export default TheBrainAddon;
/* eslint-enable max-lines */
