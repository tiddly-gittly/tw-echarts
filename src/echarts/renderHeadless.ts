export const renderHeadless = (
  text: string | undefined,
  title: string | undefined,
  attributes: Record<string, string>,
  theme: undefined | 'dark',
  id: string,
  renderer: 'canvas' | 'svg',
  fillSidebar: boolean,
  document: any,
) => {
  const scriptText = [
    `var chartDom = document.querySelector('#${id}');`,
    "if (chartDom && typeof window !== 'undefiend' && window.echarts) {",
    `  var myChart = window.echarts.init(chartDom, ${
      theme === undefined ? 'undefined' : "'dark'"
    }, { renderer: '${renderer}' });`,
    ", { renderer: '",
    `  myChart.setOption(${JSON.stringify({
      darkMode: theme === 'dark',
      backgroundColor: 'transparent',
    })});`,
    '  myChart.showLoading();',
    '  new Promise(function (resolve) {',
    '    try {',
  ];
  if (text === undefined) {
    if (!title) {
      return null;
    }
    const tiddler = $tw.wiki.getTiddler(title)?.fields;
    if (!tiddler) {
      return null;
    }
    switch (tiddler.type) {
      case 'application/json': {
        scriptText.push(
          `      myChart.setOption(${JSON.stringify(
            JSON.parse(tiddler.text),
          )});`,
        );
        break;
      }
      case 'application/javascript': {
        scriptText.push(
          '      var exports = {};',
          tiddler.text,
          `      var attrs = ${JSON.stringify(attributes)};`,
          '      var state = exports.onMount ? exports.onMount(myChart, attrs, undefined) : {};',
          '      if (exports.onUpdate) exports.onUpdate(myChart, state, attrs);',
          "      if (exports.onUpdate) myChart.on('restore', function () { exports.onUpdate(myChart, state, attrs); });",
        );
        break;
      }
      case 'text/vnd.tiddlywiki':
      default: {
        scriptText.push(
          `      myChart.setOption(${JSON.stringify(
            JSON.parse(
              $tw.wiki.renderTiddler('text/plain', title, {
                variables: attributes,
              }),
            ),
          )});`,
        );
      }
    }
  } else {
    scriptText.push(
      '      var option;',
      `${text};`,
      '      if (option instanceof Object) myChart.setOption(option);',
    );
  }
  scriptText.push(
    '    catch (e) { console.error(e); }',
    '    finally { resolve(); }',
    '  }).then(function () { myChart.hideLoading(); });',
    '  var timer;',
    '  if (!window.ResizeObserver) return;',
    '  var resizeObserver = new ResizeObserver(function (entries) {',
    '    if (timer) clearTimeout(timer);',
    '    timer = setTimeout(function () {',
    "      var sidebar = document.querySelector('.tc-sidebar-scrollable');",
    '      var height = entries[0].contentRect.height;',
    `      if (${String(
      fillSidebar,
    )} && sidebar && sidebar.contains && sidebar.contains(chartDom)) {`,
    "        height = window.innerHeight - chartDom.parentNode.getBoundingClientRect().top - parseInt(getComputedStyle(sidebar).paddingBottom.replace('px', ''));",
    '      }',
    '      myChart.resize({',
    '        width: entries[0].contentRect.width,',
    '        height: height',
    '      });',
    '    }, 25);',
    '  });',
    '  resizeObserver.observe(chartDom);',
    '}',
  );
  const scriptNode = $tw.utils.domMaker('script', {
    document,
  });
  scriptNode.textContent = scriptText.join('\n');
  return scriptNode;
};
