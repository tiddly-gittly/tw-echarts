(function () {
  'use strict';
  const Widget = require('$:/core/modules/widgets/widget.js').widget;
  const EchartsJS = require('$:/plugins/Gk0Wk/echarts/echarts.min.js');
  const Function_ = Function;
  if ($tw.browser) {
    // 总算明白了，node启动时，这个会被调用一遍，在浏览器又会调用一遍
    // 两边不是一个概念
    window.echarts = EchartsJS;
    try {
      // 注册各种扩展
      $tw.modules.forEachModuleOfType('echarts-extension', function (title, exportModules) {
        if (title === '$:/plugins/Gk0Wk/echarts-stat/ecStat.min.js') {
          EchartsJS.registerTransform(exportModules.transform.histogram);
          EchartsJS.registerTransform(exportModules.transform.clustering);
          EchartsJS.registerTransform(exportModules.transform.regression);
          window.EChartsStat = exportModules.statistics;
        }
      });
    } catch (error) {
      console.error(error);
    }
  }
  const unmountAddon = function (title, state, echartsInstance) {
    new Promise(function (resolve) {
      try {
        echartsInstance.off('restore');
        if (title && $tw.wiki.getTiddler(title) && $tw.wiki.getTiddler(title).fields.type === 'application/javascript') {
          const addon = require(title);
          const onUnmount = addon.onUnmount;
          if (typeof onUnmount === 'function') {
            onUnmount(state);
          }
        }
      } catch (error) {
        console.error(error);
      }
      resolve();
    });
  };
  const EChartsWidget = function (parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
  };
  EChartsWidget.prototype = new Widget();
  EChartsWidget.prototype.render = function (parent, nextSibling) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const currentTiddler = this.getVariable('currentTiddler');
    this.uuid = 'echarts-' + (currentTiddler ? $tw.utils.hashString(this.getVariable('currentTiddler')) + '-' : '') + Date.now();
    this.containerDom = document.createElement('div');
    this.containerDom.id = this.uuid;
    this.containerDom.className = this.class;
    this.containerDom.style.width = this.width;
    this.containerDom.style.height = this.height;
    parent.insertBefore(this.containerDom, nextSibling);
    this.domNodes.push(this.containerDom);
    if ($tw.browser) {
      this.rebuildInstance();
      this.initState();
      this.generateOption();
      var that = this;
      var timer = setInterval(function () {
        if (!document.contains(that.containerDom)) {
          unmountAddon(that.tiddlerTitle, that.state, that.echartsInstance);
          clearInterval(timer);
          that.clearInstance();
        }
      }, 1000);
    } else if ((this.tiddlerTitle !== undefined && this.tiddlerTitle !== '' && $tw.wiki.getTiddler(this.tiddlerTitle)) || this.text !== undefined) {
      // 如果是非浏览器环境，就直接导出渲染脚本
      try {
        const scriptDom = this.document.createElement('script');
        let scriptText =
          "var chartDom = document.querySelector('#" +
            this.uuid +
            "');\nif (chartDom && typeof window !== 'undefiend' && window.echarts) {\n" +
            '  var myChart = window.echarts.init(chartDom, ' +
            this.theme ===
          'dark'
            ? "'dark'"
            : 'undefined' +
              ", { renderer: '" +
              this.renderer +
              "' });\n" +
              '  myChart.setOption(' +
              JSON.stringfy({ darkMode: this.theme === 'dark', backgroundColor: 'transparent' }) +
              ');\n' +
              '  myChart.showLoading();\n' +
              '  new Promise(function (resolve) {\n' +
              '    try {\n';
        if (this.text === undefined) {
          const tiddler = $tw.wiki.getTiddler(that.tiddlerTitle).fields;
          if (!tiddler.type || tiddler.type === '' || tiddler.type === 'text/vnd.tiddlywiki') {
            scriptText +=
              '      myChart.setOption(' +
              JSON.stringfy(JSON.parse($tw.wiki.renderTiddler('text/plain', this.tiddlerTitle, { variables: Object.assign({}, this.addonAttributes) }))) +
              ');\n';
          } else if (tiddler.type === 'application/json') {
            scriptText += '      myChart.setOption(' + JSON.stringfy(JSON.parse($tw.wiki.getTiddlerText(this.tiddlerTitle))) + ');\n';
          } else if (tiddler.type === 'application/javascript') {
            scriptText +=
              '      var exports = {};\n' +
              $tw.wiki.getTiddlerText(this.tiddlerTitle) +
              '\n' +
              '      var state = exports.onMount ? exports.onMount(myChart, ' +
              JSON.stringfy(this.addonAttributes) +
              ', undefined) : {};\n' +
              '      var attrs = ' +
              JSON.stringfy(this.addonAttributes) +
              ';\n' +
              '      if (exports.onUpdate) exports.onUpdate(myChart, state, attrs);\n' +
              "      if (exports.onUpdate) myChart.on('restore', function () { exports.onUpdate(myChart, state, attrs); });\n";
          }
        } else {
          scriptText += '      var option;\n' + this.text + ';\n' + '      if (option instanceof Object) myChart.setOption(option);\n';
        }
        scriptText +=
          '    catch (e) { console.error(e); }\n' +
          '    finally { resolve(); }\n' +
          '  }).then(function () { myChart.hideLoading(); });\n' +
          '  var timer;' +
          '  if (!window.ResizeObserver) return;' +
          '  var resizeObserver = new ResizeObserver(function (entries) {\n' +
          '    if (timer) clearTimeout(timer);' +
          '    timer = setTimeout(function () {' +
          "      var sidebar = document.querySelector('.tc-sidebar-scrollable');\n" +
          '      var height = entries[0].contentRect.height;\n' +
          '      if (' +
          this.fillSidebar.toString() +
          ' && sidebar && sidebar.contains && sidebar.contains(chartDom)) {\n' +
          "        height = window.innerHeight - chartDom.parentNode.getBoundingClientRect().top - parseInt(getComputedStyle(sidebar).paddingBottom.replace('px', ''));\n" +
          '      }\n' +
          '      myChart.resize({\n' +
          '        width: entries[0].contentRect.width,\n' +
          '        height: height\n' +
          '      });\n' +
          '    }, 25);' +
          '  });\n' +
          '  resizeObserver.observe(chartDom);\n' +
          '}';
        scriptDom.innerText = scriptText;
        this.insertBefore(scriptDom, nextSibling);
      } catch (error) {
        this.containerDom.innerText = error.toString();
      }
    }
  };
  EChartsWidget.prototype.execute = function () {
    this.tiddlerTitle = this.getAttribute('$tiddler', '');
    if (this.tiddlerTitle === '') this.tiddlerTitle = undefined;
    this.width = this.getAttribute('$width', '100%');
    this.height = this.getAttribute('$height', '300px');
    this.class = this.getAttribute('$class', 'gk0wk-echarts-body');
    this.fillSidebar = this.getAttribute('$fillSidebar', 'true') === 'true';
    this.theme = this.getAttribute('$theme', 'auto');
    if (this.theme === 'light') this.theme = undefined;
    else if (this.theme === 'dark');
    else {
      if ($tw.wiki.filterTiddlers('[{$:/palette}field:color-scheme[dark]]').length > 0) this.theme = 'dark';
      else this.theme = undefined;
    }
    this.renderer = this.getAttribute('$renderer', 'canvas') === 'svg' ? 'svg' : 'canvas';
    this.addonAttributes = Object.assign({}, this.attributes);
    this.text = this.getAttribute('$text', '');
    if (this.text.trim().length === 0) this.text = undefined;
  };
  EChartsWidget.prototype.askForAddonUpdate = function (changedTiddlers) {
    try {
      if (!this.tiddlerTitle || !$tw.wiki.getTiddler(this.tiddlerTitle)) return false;
      const tiddler = $tw.wiki.getTiddler(this.tiddlerTitle).fields;
      if (!tiddler.type || tiddler.type === '' || tiddler.type === 'text/vnd.tiddlywiki' || tiddler.type === 'application/json') {
        this._state = JSON.stringify($tw.wiki.filterTiddlers(tiddler['echarts-refresh-trigger']));
        return this._state !== this.state;
      } else if (tiddler.type === 'application/javascript') {
        const addon = require(this.tiddlerTitle);
        let shouldUpdate = addon.shouldUpdate;
        if (shouldUpdate === undefined) shouldUpdate = addon.shouldRefresh;
        if (shouldUpdate === undefined) return true;
        if (typeof shouldUpdate === 'string') {
          this._state = JSON.stringify($tw.wiki.filterTiddlers(tiddler['echarts-refresh-trigger']));
          return this._state !== this.state;
        }
        if (typeof shouldUpdate === 'function') {
          return shouldUpdate(this.state, changedTiddlers);
        }
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }
  };
  // 计算this.state
  EChartsWidget.prototype.initState = function () {
    try {
      if (this.text === undefined) {
        if (!this.tiddlerTitle || !$tw.wiki.getTiddler(this.tiddlerTitle)) return;
        const tiddler = $tw.wiki.getTiddler(this.tiddlerTitle).fields;
        if (!tiddler.type || tiddler.type === '' || tiddler.type === 'text/vnd.tiddlywiki' || tiddler.type === 'application/json') {
          if (this._state) {
            this.state = this._state;
            this._state = undefined;
          } else {
            this.state = JSON.stringify($tw.wiki.filterTiddlers(tiddler['echarts-refresh-trigger']));
          }
        } else if (tiddler.type === 'application/javascript') {
          const addon = require(this.tiddlerTitle);
          let onMount = addon.onMount;
          if (onMount === undefined) onMount = addon.onInit;
          if (typeof onMount === 'function') {
            this.state = onMount(this.echartsInstance, this.addonAttributes, this);
          }
        } else return;
      }
      const that = this;
      this.echartsInstance.on('restore', function () {
        that.generateOption();
      });
    } catch (error) {
      console.error(error);
    }
  };
  EChartsWidget.prototype.clearInstance = function () {
    let oldOptions;
    if (this.echartsInstance) {
      oldOptions = this.echartsInstance.getOption();
      if (!this.echartsInstance.isDisposed()) this.echartsInstance.dispose();
      this.echartsInstance = undefined;
    }
    this.containerDom.innerHTML = '';
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
    return oldOptions;
  };
  EChartsWidget.prototype.rebuildInstance = function () {
    const oldOptions = this.clearInstance();
    // 新建实例
    const instance = (this.echartsInstance = EchartsJS.init(this.containerDom, this.theme, {
      renderer: this.renderer,
    }));
    instance.setOption({
      darkMode: this.theme === 'dark',
      backgroundColor: 'transparent',
    });
    // 监听大小变更
    const that = this;
    let timer; // 去抖
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(function (entries) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          const sidebar = document.querySelector('.tc-sidebar-scrollable');
          let height = entries[0].contentRect.height;
          if (that.fillSidebar && sidebar && !that.parentDomNode.isTiddlyWikiFakeDom && sidebar.contains(that.containerDom)) {
            height =
              window.innerHeight - that.parentDomNode.getBoundingClientRect().top - Number.parseInt(getComputedStyle(sidebar).paddingBottom.replace('px', ''));
          }
          instance.resize({
            width: entries[0].contentRect.width,
            height,
          });
        }, 25);
      });
      this.resizeObserver.observe(this.containerDom);
    }
    return oldOptions;
  };
  // 异步更新
  EChartsWidget.prototype.generateOption = function () {
    const that = this;
    this.echartsInstance.showLoading();
    new Promise(function (resolve) {
      try {
        if (that.text === undefined) {
          if (!that.tiddlerTitle || !$tw.wiki.getTiddler(that.tiddlerTitle)) {
            resolve();
            return;
          }
          const tiddler = $tw.wiki.getTiddler(that.tiddlerTitle).fields;
          if (!tiddler.type || tiddler.type === '' || tiddler.type === 'text/vnd.tiddlywiki') {
            that.echartsInstance.setOption(
              JSON.parse(
                $tw.wiki.renderTiddler('text/plain', that.tiddlerTitle, {
                  variables: Object.assign({}, that.addonAttributes),
                }),
              ),
            );
          } else if (tiddler.type === 'application/json') {
            that.echartsInstance.setOption(JSON.parse($tw.wiki.getTiddlerText(that.tiddlerTitle)));
          } else if (tiddler.type === 'application/javascript') {
            require(that.tiddlerTitle).onUpdate(that.echartsInstance, that.state, that.addonAttributes);
          }
        } else {
          const addon = new Function_(
            'myChart',
            'chartDom',
            'echarts',
            '$tw',
            'var option;' + that.text + ';if (option instanceof Object) myChart.setOption(option);',
          );
          addon(that.echartsInstance, that.containerDom, EchartsJS, $tw);
        }
      } catch (error) {
        console.error(error);
      } finally {
        resolve();
      }
    }).then(function () {
      that.echartsInstance.hideLoading();
    });
  };
  EChartsWidget.prototype.makeRefresh = function (changedTiddlers) {
    const oldAddon = this.tiddlerTitle;
    const changedAttributes = this.computeAttributes();
    let refreshFlag = 0; // 0: 不需要任何变更   1: 需要重新生成Option   2: 需要重新渲染
    // 先看一下参数的变化，这里分为几种：
    // $tiddler变化的，说明要重新生成Option
    // $theme、$fillSidebar 和 $renderer需要重新初始化实例
    // $class、$width 和 $height 只需要修改容器的尺寸就好了
    // 剩下的就是传给插件的参数了
    if ($tw.utils.count(changedAttributes) > 0) {
      let counter = 0;
      $tw.utils.each(['$theme', '$fillSidebar', '$renderer'], function (key) {
        if (changedAttributes[key] !== undefined) counter++;
      });
      if (counter > 0) refreshFlag |= 2;
      if (changedAttributes.$class) {
        counter++;
        this.containerDom.className = this.getAttribute('$class', 'gk0wk-echarts-body');
      }
      if (changedAttributes.$width) {
        counter++;
        this.containerDom.style.width = this.getAttribute('$width', '100%');
      }
      if (changedAttributes.$height) {
        counter++;
        this.containerDom.style.height = this.getAttribute('$height', '300px');
      }
      if ($tw.utils.count(changedAttributes) > counter) refreshFlag |= 1;
    }
    if (
      this.text === undefined &&
      !(refreshFlag & 1) &&
      ((this.tiddlerTitle && changedTiddlers[this.tiddlerTitle]) || this.askForAddonUpdate(changedTiddlers))
    ) {
      refreshFlag |= 1;
    }
    this.execute();
    if (refreshFlag & 2) {
      const oldOption = this.rebuildInstance();
      if (!oldOption || refreshFlag & 1) {
        unmountAddon(this.text !== undefined ? undefined : oldAddon, this.state, this.echartsInstance);
        this.initState();
        this.generateOption();
      } else {
        this.echartsInstance.setOption(oldOption);
      }
    } else if (refreshFlag & 1) {
      this.generateOption();
    }
  };
  EChartsWidget.prototype.refresh = function (changedTiddlers) {
    if (!$tw.browser) return false;
    // 去抖
    const that = this;
    if (this.timer2) clearTimeout(this.timer2);
    this.timer2 = setTimeout(function () {
      that.timer2 = undefined;
      that.makeRefresh(changedTiddlers);
    }, 100);
    return false;
  };
  exports.echarts = EChartsWidget;
})();
