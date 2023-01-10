/* eslint-disable no-inner-declarations */
const Categories = [
  {
    name: 'Focusing',
  },
  {
    name: 'History',
  },
  {
    name: 'Link To',
  },
  {
    name: 'Backlink From',
  },
  {
    name: 'Tag To',
  },
  {
    name: 'Tag By',
  },
  {
    name: 'Parent',
  },
];

exports.onMount = function (echart) {
  const state = {
    historyTiddlers: [],
  };
  echart.on('click', function (event) {
    if (event.dataType === 'node') {
      new $tw.Story().navigateTiddler(event.data.name);
    } // else if (event.dataType === "edge") { }
  });
  return state;
};

exports.shouldUpdate = function (_, changedTiddlers) {
  return $tw.utils.count(changedTiddlers) > 0;
};

function getAliasOrTitle(tiddlerTitle, aliasField) {
  const tiddler = $tw.wiki.getTiddler(tiddlerTitle);
  if (tiddler) {
    const aliasValue = tiddler.fields[aliasField];
    return aliasValue && typeof aliasValue === 'string'
      ? $tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', aliasValue, {
          variables: { currentTiddler: tiddlerTitle },
        })
      : tiddlerTitle;
  } else {
    return tiddlerTitle;
  }
}

exports.onUpdate = function onUpdate(echart, state, addonAttributes) {
  /** 参数：focussedTiddler 是图的中央节点 */
  const focussedTiddler = addonAttributes.focussedTiddler || $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
  /** 参数：levels 指定图向外展开几级 */
  const levels = addonAttributes.levels ? Number.parseInt(addonAttributes.levels) : 1;
  /** 参数：graphTitle 指定右下角显示的标题 */
  const graphTitle = addonAttributes.graphTitle || 'The Brain View';
  // 不允许 focussedTiddler 是系统条目，以免产生大量节点
  if (focussedTiddler && focussedTiddler.startsWith('$:/')) return;
  const nodes = [];
  const edges = [];
  /** 参数：aliasField 用于指定展示为节点标题的字段，例如 caption */
  const aliasField = addonAttributes.aliasField === '' ? undefined : addonAttributes.aliasField;
  /** 参数：excludeFilter 用于排除部分节点 */
  const excludeFilter =
    addonAttributes.excludeFilter === ''
      ? undefined
      : addonAttributes.excludeFilter === undefined
      ? undefined
      : $tw.wiki.compileFilter(addonAttributes.excludeFilter);
  if (focussedTiddler && focussedTiddler !== '') {
    const nodeMap = {};
    nodeMap[''] = true;

    // 当前关注的 Tiddler
    nodeMap[focussedTiddler] = true;
    nodes.push({
      name: focussedTiddler,
      // fixed: true,
      category: 0,
      label: {
        formatter: getAliasOrTitle(focussedTiddler, aliasField),
      },
    });

    // 历史路径
    let nextTiddler = focussedTiddler;
    const historyMap = {};
    for (let index = state.historyTiddlers.length - 2; index >= 0; index--) {
      const tiddlerTitle = state.historyTiddlers[index];
      if (historyMap[tiddlerTitle]) continue;
      if (tiddlerTitle === nextTiddler) continue;
      if (tiddlerTitle.startsWith('$:/')) continue;
      edges.push({
        source: tiddlerTitle,
        target: nextTiddler,
        label: {
          show: true,
          formatter: 'history',
        },
      });
      historyMap[tiddlerTitle] = true;
      nextTiddler = tiddlerTitle;
      if (nodeMap[tiddlerTitle]) break;
      if (!excludeFilter || excludeFilter.call($tw.wiki, [tiddlerTitle]).length === 0)
        nodes.push({
          name: tiddlerTitle,
          label: { formatter: getAliasOrTitle(tiddlerTitle, aliasField) },
          category: 1,
        });
      nodeMap[tiddlerTitle] = true;
    }

    function pushLink(target, source, recursiveLevel) {
      edges.push({
        source,
        target,
        label: {
          show: true,
          formatter: 'link',
        },
      });
      if (nodeMap[target]) return;
      if (!excludeFilter || excludeFilter.call($tw.wiki, [target]).length === 0) {
        nodes.push({
          name: target,
          label: { formatter: getAliasOrTitle(target, aliasField) },
          category: 2,
        });
      }
      nodeMap[target] = true;
      if (recursiveLevel === levels) return;
      $tw.utils.each($tw.wiki.getTiddlerLinks(target), (target2) => {
        pushLink(target2, target, recursiveLevel + 1);
      });
    }
    // 链接
    $tw.utils.each($tw.wiki.getTiddlerLinks(focussedTiddler), (targetTiddler) => pushLink(targetTiddler, focussedTiddler, 1));

    // 反链
    function pushBackLink(tiddlerTitle, target, recursiveLevel) {
      edges.push({
        source: tiddlerTitle,
        target,
        label: {
          show: true,
          formatter: 'backlink',
        },
      });
      if (nodeMap[tiddlerTitle]) return;
      if (!excludeFilter || excludeFilter.call($tw.wiki, [tiddlerTitle]).length === 0) {
        nodes.push({
          name: tiddlerTitle,
          category: 3,
        });
      }
      nodeMap[tiddlerTitle] = true;
      if (recursiveLevel === levels) return;
      $tw.utils.each($tw.wiki.getTiddlerLinks(tiddlerTitle), (tiddlerTitle2) => {
        pushBackLink(tiddlerTitle2, tiddlerTitle, recursiveLevel + 1);
      });
    }
    $tw.utils.each($tw.wiki.getTiddlerBacklinks(focussedTiddler), (sourceTiddler) => pushBackLink(sourceTiddler, focussedTiddler, 1));

    // 指向哪些tag
    function pushTag(tiddlerTitle, source, recursiveLevel) {
      if (!$tw.wiki.tiddlerExists(tiddlerTitle)) return;
      edges.push({
        source,
        target: tiddlerTitle,
        label: {
          show: true,
          formatter: 'tag',
        },
      });
      if (nodeMap[tiddlerTitle]) return;
      if (!excludeFilter || excludeFilter.call($tw.wiki, [tiddlerTitle]).length === 0) {
        nodes.push({
          name: tiddlerTitle,
          label: { formatter: getAliasOrTitle(tiddlerTitle, aliasField) },
          category: 4,
        });
      }
      nodeMap[tiddlerTitle] = true;
      if (recursiveLevel === levels) return;
      $tw.utils.each($tw.wiki.getTiddler(tiddlerTitle).fields.tags, (tiddlerTag2) => {
        pushBackLink(tiddlerTag2, tiddlerTitle, recursiveLevel + 1);
      });
    }
    $tw.utils.each($tw.wiki.getTiddler(focussedTiddler).fields.tags, (tiddlerTag) => pushTag(tiddlerTag, focussedTiddler, 1));

    // 被谁作为 Tag
    function pushBackTag(tiddlerTitle, target, recursiveLevel) {
      edges.push({
        source: tiddlerTitle,
        target,
        label: {
          show: true,
          formatter: 'tag',
        },
      });
      if (nodeMap[tiddlerTitle]) return;
      if (!excludeFilter || excludeFilter.call($tw.wiki, [tiddlerTitle]).length === 0) {
        nodes.push({
          name: tiddlerTitle,
          label: { formatter: getAliasOrTitle(tiddlerTitle, aliasField) },
          category: 5,
        });
      }
      nodeMap[tiddlerTitle] = true;
      if (recursiveLevel === levels) return;
      $tw.utils.each($tw.wiki.getTiddlersWithTag(tiddlerTitle), (tiddlerTitle2) => {
        pushBackTag(tiddlerTitle2, tiddlerTitle, recursiveLevel + 1);
      });
    }
    $tw.utils.each($tw.wiki.getTiddlersWithTag(focussedTiddler), (tiddlerTitle) => {
      pushBackTag(tiddlerTitle, focussedTiddler, 1);
    });

    // 父条目
    const focussedTiddlerPath = focussedTiddler.split('/');
    if (focussedTiddlerPath.length > 1) {
      const parentTiddler = focussedTiddlerPath.slice(0, -1).join('/');
      $tw.utils.each([parentTiddler, parentTiddler + '/'], function (tiddlerTitle) {
        edges.push({
          source: tiddlerTitle,
          target: focussedTiddler,
          label: {
            show: true,
            formatter: 'parent',
          },
        });
        if (nodeMap[tiddlerTitle]) return;
        if (!excludeFilter || excludeFilter.call($tw.wiki, [tiddlerTitle]).length === 0)
          nodes.push({
            name: tiddlerTitle,
            label: { formatter: getAliasOrTitle(tiddlerTitle, aliasField) },
            category: 6,
          });
        nodeMap[tiddlerTitle] = true;
      });
    }
  }
  const historyIndex = state.historyTiddlers.indexOf(focussedTiddler);
  if (historyIndex > -1) state.historyTiddlers.splice(historyIndex, 1);
  state.historyTiddlers.push(focussedTiddler);
  state.historyTiddlers.slice(-10);
  echart.setOption({
    legend: [
      {
        data: Categories.map(function (a) {
          return a.name;
        }),
      },
    ],
    title: {
      text: graphTitle,
      show: true,
      top: 'bottom',
      left: 'right',
    },
    series: [
      {
        name: graphTitle,
        type: 'graph',
        layout: 'force',
        nodes,
        edges,
        categories: Categories,
        roam: true,
        draggable: true,
        zoom: 4,
        label: {
          position: 'right',
          show: true,
        },
        force: {
          repulsion: 50,
        },
        edgeSymbol: ['circle', 'arrow'],
        edgeSymbolSize: [4, 10],
        edgeLabel: {
          fontSize: 5,
        },
        lineStyle: {
          opacity: 0.9,
          width: 2,
          curveness: 0,
        },
      },
    ],
  });
};
