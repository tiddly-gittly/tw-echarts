/* eslint-disable max-lines */
import type { IParseTreeNode } from 'tiddlywiki';
import type { IScriptAddon } from '../../scriptAddon';

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
    let focussedTiddler =
      addonAttributes.focussedTiddler ||
      $tw.wiki.getTiddlerText('$:/temp/focussedTiddler')!;
    state.viewingTiddlers.clear();
    state.focusing = addonAttributes.focussedTiddler;
    state.currentlyFocused = focussedTiddler;
    if (!focussedTiddler) {
      return;
    }
    state.viewingTiddlers.add(focussedTiddler);
    if ($tw.wiki.getTiddler(focussedTiddler)?.fields['draft.of']) {
      focussedTiddler = $tw.wiki.getTiddler(focussedTiddler)!.fields[
        'draft.of'
      ] as string;
    }
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
      const nodeExist: Set<string> = new Set();
      nodeMap.add('');

      // 当前关注的 Tiddler
      nodeMap.add(focussedTiddler);
      nodeExist.add(focussedTiddler);
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

      // Link
      const pushLink = (
        target: string,
        source: string,
        recursiveLevel: number,
      ) => {
        if (
          excludeFilter &&
          excludeFilter.call($tw.wiki, [target]).length > 0
        ) {
          return;
        }
        const newNode = !nodeMap.has(target);
        const [label, exist] = newNode
          ? getAliasOrTitle(target, aliasField)
          : ['', nodeExist.has(target)];
        if (newNode) {
          nodes.push({
            name: target,
            label: { formatter: label },
            itemStyle: { opacity: exist ? 1 : 0.65 },
            symbol: findIcon(target),
            category: 2,
            isTag: false,
          });
          nodeMap.add(target);
          if (exist) {
            nodeExist.add(target);
          }
        }
        edges.push({
          source,
          target,
          lineStyle: {
            color: colors[2],
            type: exist ? 'solid' : 'dashed',
          },
        });
        if (exist && recursiveLevel < levels) {
          $tw.utils.each($tw.wiki.getTiddlerLinks(target), target2 => {
            pushLink(target2, target, recursiveLevel + 1);
          });
        }
      };
      // 链接
      $tw.utils.each($tw.wiki.getTiddlerLinks(focussedTiddler), targetTiddler =>
        pushLink(targetTiddler, focussedTiddler, 1),
      );

      // Backlink
      const pushBackLink = (
        source: string,
        target: string,
        recursiveLevel: number,
      ) => {
        if (
          excludeFilter &&
          excludeFilter.call($tw.wiki, [source]).length > 0
        ) {
          return;
        }
        const newNode = !nodeMap.has(source);
        const [label, exist] = newNode
          ? getAliasOrTitle(source, aliasField)
          : ['', nodeExist.has(source)];
        if (newNode) {
          nodes.push({
            name: source,
            label: { formatter: label },
            itemStyle: { opacity: exist ? 1 : 0.65 },
            symbol: findIcon(source),
            category: 3,
            isTag: false,
          });
          nodeMap.add(source);
          if (exist) {
            nodeExist.add(source);
          }
        }
        edges.push({
          source,
          target,
          lineStyle: {
            color: colors[3],
            type: exist ? 'solid' : 'dashed',
          },
        });
        if (exist && recursiveLevel < levels) {
          $tw.utils.each($tw.wiki.getTiddlerLinks(source), source_ => {
            pushBackLink(source_, source, recursiveLevel + 1);
          });
        }
      };
      $tw.utils.each(
        $tw.wiki.getTiddlerBacklinks(focussedTiddler),
        sourceTiddler => pushBackLink(sourceTiddler, focussedTiddler, 1),
      );

      // 指向哪些tag
      const pushTag = (tag: string, source: string, recursiveLevel: number) => {
        if (excludeFilter && excludeFilter.call($tw.wiki, [tag]).length > 0) {
          return;
        }
        const newNode = !nodeMap.has(tag);
        const [label, exist] = newNode
          ? getAliasOrTitle(tag, aliasField)
          : ['', nodeExist.has(tag)];
        if (newNode) {
          nodes.push({
            name: tag,
            label: { formatter: label },
            itemStyle: { opacity: exist ? 1 : 0.65 },
            symbol: findIcon(tag),
            category: 4,
            isTag: true,
          });
          nodeMap.add(tag);
          if (exist) {
            nodeExist.add(tag);
          }
        }
        edges.push({
          source,
          target: tag,
          lineStyle: {
            color: colors[4],
            type: exist ? 'solid' : 'dashed',
          },
        });
        if (exist && recursiveLevel < levels) {
          $tw.utils.each($tw.wiki.getTiddler(tag)?.fields?.tags ?? [], tag_ => {
            pushTag(tag_, tag, recursiveLevel + 1);
          });
        }
      };
      $tw.utils.each(
        $tw.wiki.getTiddler(focussedTiddler)?.fields?.tags ?? [],
        tiddlerTag => pushTag(tiddlerTag, focussedTiddler, 1),
      );

      // 被谁作为 Tag
      const pushBackTag = (
        tag: string,
        target: string,
        recursiveLevel: number,
      ) => {
        if (excludeFilter && excludeFilter.call($tw.wiki, [tag]).length > 0) {
          return;
        }
        const newNode = !nodeMap.has(tag);
        const [label, exist] = newNode
          ? getAliasOrTitle(tag, aliasField)
          : ['', nodeExist.has(tag)];
        if (newNode) {
          nodes.push({
            name: tag,
            label: { formatter: label },
            itemStyle: { opacity: exist ? 1 : 0.65 },
            symbol: findIcon(tag),
            category: 5,
            isTag: false,
          });
          nodeMap.add(tag);
          if (exist) {
            nodeExist.add(tag);
          }
        }
        edges.push({
          source: tag,
          target,
          lineStyle: {
            color: colors[5],
            type: exist ? 'solid' : 'dashed',
          },
        });
        if (exist && recursiveLevel < levels) {
          $tw.utils.each($tw.wiki.getTiddlersWithTag(tag), tag_ => {
            pushBackTag(tag_, tag, recursiveLevel + 1);
          });
        }
      };
      $tw.utils.each($tw.wiki.getTiddlersWithTag(focussedTiddler), tag => {
        pushBackTag(tag, focussedTiddler, 1);
      });

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
          if (
            excludeFilter &&
            excludeFilter.call($tw.wiki, [transcludeTiddler]).length > 0
          ) {
            continue;
          }
          const newNode = !nodeMap.has(transcludeTiddler);
          const [label, exist] = newNode
            ? getAliasOrTitle(transcludeTiddler, aliasField)
            : ['', nodeExist.has(transcludeTiddler)];
          if (newNode) {
            nodes.push({
              name: transcludeTiddler,
              label: { formatter: label },
              itemStyle: { opacity: exist ? 1 : 0.65 },
              symbol: findIcon(transcludeTiddler),
              category: 6,
              isTag: false,
            });
            nodeMap.add(transcludeTiddler);
            // eslint-disable-next-line max-depth
            if (exist) {
              nodeExist.add(transcludeTiddler);
            }
          }
          edges.push({
            source: focussedTiddler,
            target: transcludeTiddler,
            lineStyle: {
              color: colors[6],
              type: exist ? 'solid' : 'dashed',
            },
          });
        }
      }

      // 历史路径
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
        if (
          excludeFilter &&
          excludeFilter.call($tw.wiki, [tiddlerTitle]).length > 0
        ) {
          continue;
        }
        const newNode = !nodeMap.has(tiddlerTitle);
        const [label, exist] = newNode
          ? getAliasOrTitle(tiddlerTitle, aliasField)
          : ['', nodeExist.has(tiddlerTitle)];
        if (!newNode) {
          break;
        }
        nodes.push({
          name: tiddlerTitle,
          label: { formatter: label, fontSize: '10px' },
          category: 1,
          symbol: findIcon(tiddlerTitle),
          symbolSize: 3,
          itemStyle: { opacity: exist ? 0.65 : 0.4 },
          isTag: false,
        });
        nodeMap.add(tiddlerTitle);
        if (exist) {
          nodeExist.add(tiddlerTitle);
        }
        edges.push({
          source: tiddlerTitle,
          target: nextTiddler,
          lineStyle: {
            color: colors[1],
            type: exist ? 'dashed' : 'dotted',
            opacity: 0.5,
          },
        });
        nextTiddler = tiddlerTitle;
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

    let previewDelay = Number(addonAttributes.previewDelay || '1000');
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
          symbolSize: 6,
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
