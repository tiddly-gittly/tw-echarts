(function () {
  "use strict";
  var Widget = require("$:/core/modules/widgets/widget.js").widget;
  var EchartsJS = require("$:/plugins/Gk0Wk/echarts/echarts.min.js");
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
    } catch (e) {
      console.error(e);
    }
  }
  var unmountAddon = function (title, state, echartsInstance) {
    try {
      if (title && $tw.wiki.getTiddler(title)) {
        if ($tw.wiki.getTiddler(title).fields.type === 'application/javascript') {
          echartsInstance.off('restore');
          var addon = require(title);
          var onUnmount = addon.onUnmount;
          if (typeof onUnmount === 'function') {
            onUnmount(state);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };
  var EChartsWidget = function (parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
  };
  EChartsWidget.prototype = new Widget();
  EChartsWidget.prototype.render = function (parent, nextSibling) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    var currentTiddler = this.getVariable("currentTiddler");
    this.uuid = 'echarts-' + (currentTiddler ? $tw.utils.hashString(this.getVariable('currentTiddler')) + '-' : '') + new Date().getTime();
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
          unmountAddon(that.tiddlerTitle, that.state);
          clearInterval(timer);
          that.clearInstance();
        }
      }, 1000);
    } else if (this.tiddlerTitle !== undefined && this.tiddlerTitle !== '' && $tw.wiki.getTiddler(this.tiddlerTitle)) {
      // 如果是非浏览器环境，就直接导出渲染脚本
      try {
        var scriptDom = this.document.createElement('script');
        var scriptText = 'var containerDom = document.querySelector(\'#' + this.uuid + '\');\nif (containerDom && typeof window !== \'undefiend\' && window.echarts) {\n' +
          '  var instance = window.echarts.init(containerDom, ' + this.theme === 'dark' ? '\'dark\'' : 'undefined' + ', { renderer: \'' + this.renderer + '\' });\n' +
          '  instance.setOption(' + JSON.stringfy({ darkMode: this.theme === 'dark', backgroundColor: 'transparent' }) + ');\n' +
          '  instance.showLoading();\n' +
          '  new Promise(function (resolve) {\n' +
        '    try {\n';
        var tiddler = $tw.wiki.getTiddler(that.tiddlerTitle).fields;
        if (!tiddler.type || tiddler.type === '' || tiddler.type === 'text/vnd.tiddlywiki') {
          scriptText += '      instance.setOption(' + JSON.stringfy(JSON.parse($tw.wiki.renderTiddler('text/plain', this.tiddlerTitle, {}))) + ');\n';
        } else if (tiddler.type === 'application/json') {
          scriptText += '      instance.setOption(' + JSON.stringfy(JSON.parse($tw.wiki.getTiddlerText(this.tiddlerTitle))) + ');\n';
        } else if (tiddler.type === 'application/javascript') {
          scriptText += '      var exports = {};\n' + $tw.wiki.getTiddlerText(this.tiddlerTitle) + '\n' +
            '      var state = exports.onMount ? exports.onMount(instance, ' + JSON.stringfy(this.addonAttributes) + ') : {};\n' +
            '      var attrs = ' + JSON.stringfy(this.addonAttributes) + ';\n' +
            '      if (exports.onUpdate) exports.onUpdate(instance, state, attrs);\n' +
            '      if (exports.onUpdate) instance.on(\'restore\', function () { exports.onUpdate(instance, state, attrs); });\n';
        }
        scriptText += '    catch (e) { console.error(e); }\n' +
          '    finally { resolve(); }\n' +
          '  }).then(function () { instance.hideLoading(); });\n' +
          '  var resizeObserver = new ResizeObserver(function (entries) {\n' +
          '    var sidebar = document.querySelector(\'.tc-sidebar-scrollable\');\n' +
          '    var height = entries[0].contentRect.height;\n' +
          '    if (' + this.fillSidebar.toString() + ' && sidebar && sidebar.contains && sidebar.contains(containerDom)) {\n' +
          '      height = window.innerHeight - containerDom.parentNode.getBoundingClientRect().top - parseInt(getComputedStyle(sidebar).paddingBottom.replace(\'px\', \'\'));\n' +
          '    }\n' +
          '    instance.resize({\n' +
          '      width: entries[0].contentRect.width,\n' +
          '      height: height\n' +
          '    });\n' +
          '  resizeObserver.observe(containerDom);\n' +
          '}';
        scriptDom.innerText = scriptText;
        this.insertBefore(scriptDom, nextSibling);
      } catch (e) {
        this.containerDom.innerText = e.toString();
      }
      return;
    }
  };
  EChartsWidget.prototype.execute = function () {
    this.tiddlerTitle = this.getAttribute("$tiddler", "");
    if (this.tiddlerTitle === "") this.tiddlerTitle = undefined;
    this.width = this.getAttribute("$width", "100%");
    this.height = this.getAttribute("$height", "300px");
    this.class = this.getAttribute("$class", "gk0wk-echarts-body");
    this.fillSidebar = this.getAttribute("$fillSidebar", "true") === "true";
    this.theme = this.getAttribute('$theme', 'auto');
    if (this.theme === 'light') this.theme = undefined;
    else if (this.theme === 'dark');
    else {
      if ($tw.wiki.filterTiddlers('[{$:/palette}field:color-scheme[dark]]').length > 0) this.theme = 'dark';
      else this.theme = undefined;
    }
    this.renderer = this.getAttribute('$renderer', 'canvas') === 'svg' ? 'svg' : 'canvas';
    this.addonAttributes = Object.assign({}, this.attributes);
  };
  EChartsWidget.prototype.askForAddonUpdate = function (changedTiddlers) {
    try {
      if (!this.tiddlerTitle || !$tw.wiki.getTiddler(this.tiddlerTitle)) return false;
      var tiddler = $tw.wiki.getTiddler(this.tiddlerTitle).fields;
      if (!tiddler.type || tiddler.type === '' || tiddler.type === 'text/vnd.tiddlywiki' || tiddler.type === 'application/json') {
        this._state = JSON.stringify($tw.wiki.filterTiddlers(tiddler['echarts-refresh-trigger']));
        return this._state !== this.state;
      } else if (tiddler.type === 'application/javascript') {
        var addon = require(this.tiddlerTitle);
        var shouldUpdate = addon.shouldUpdate;
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
    } catch (e) {
      console.error(e);
      return false;
    }
  };
  // 计算this.state
  EChartsWidget.prototype.initState = function () {
    try {
      if (!this.tiddlerTitle || !$tw.wiki.getTiddler(this.tiddlerTitle)) return;
      var tiddler = $tw.wiki.getTiddler(this.tiddlerTitle).fields;
      if (!tiddler.type || tiddler.type === '' || tiddler.type === 'text/vnd.tiddlywiki' || tiddler.type === 'application/json') {
        if (this._state) {
          this.state = this._state;
          this._state = undefined;
        } else {
          this.state = JSON.stringify($tw.wiki.filterTiddlers(tiddler['echarts-refresh-trigger']));
        }
      } else if (tiddler.type === 'application/javascript') {
        var addon = require(this.tiddlerTitle);
        var onMount = addon.onMount;
        if (onMount === undefined) onMount = addon.onInit;
        if (typeof onMount === 'function') {
          this.state = onMount(this.echartsInstance, this.addonAttributes);
        }
      } else {
        return;
      }
      var that = this;
      this.echartsInstance.on('restore', function () {
        that.generateOption();
      });
    } catch (e) {
      console.error(e);
    }
  };
  EChartsWidget.prototype.clearInstance = function () {
    var oldOptions;
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
    var oldOptions = this.clearInstance();
    // 新建实例
    var instance = this.echartsInstance = EchartsJS.init(this.containerDom, this.theme, {
      renderer: this.renderer
    });
    instance.setOption({
      darkMode: this.theme === 'dark',
      backgroundColor: 'transparent',
    });
    // 监听大小变更
    var that = this;
    this.resizeObserver = new ResizeObserver(function (entries) {
      var sidebar = document.querySelector('.tc-sidebar-scrollable');
      var height = entries[0].contentRect.height;
      if (that.fillSidebar && sidebar && !that.parentDomNode.isTiddlyWikiFakeDom && sidebar.contains(that.containerDom)) {
        height = window.innerHeight - that.parentDomNode.getBoundingClientRect().top -
          parseInt(getComputedStyle(sidebar).paddingBottom.replace('px', ''));
      }
      instance.resize({
        width: entries[0].contentRect.width,
        height: height,
      });
    });
    this.resizeObserver.observe(this.containerDom);
    return oldOptions;
  };
  // 异步更新
  EChartsWidget.prototype.generateOption = function () {
    var that = this;
    this.echartsInstance.showLoading();
    new Promise(function (resolve) {
      try {
        if (!that.tiddlerTitle || !$tw.wiki.getTiddler(that.tiddlerTitle)) {
          resolve();
          return;
        }
        var tiddler = $tw.wiki.getTiddler(that.tiddlerTitle).fields;
        if (!tiddler.type || tiddler.type === '' || tiddler.type === 'text/vnd.tiddlywiki') {
          that.echartsInstance.setOption(JSON.parse($tw.wiki.renderTiddler('text/plain', that.tiddlerTitle, {})));
        } else if (tiddler.type === 'application/json') {
          that.echartsInstance.setOption(JSON.parse($tw.wiki.getTiddlerText(that.tiddlerTitle)));
        } else if (tiddler.type === 'application/javascript') {
          require(that.tiddlerTitle).onUpdate(that.echartsInstance, that.state, that.addonAttributes);
        }
      } catch (e) {
        console.error(e);
      } finally {
        resolve();
      }
    }).then(function () {
      that.echartsInstance.hideLoading();
    });
  };
  EChartsWidget.prototype.makeRefresh = function (changedTiddlers) {
    var oldAddon = this.tiddlerTitle;
    var changedAttributes = this.computeAttributes();
    var refreshFlag = 0; // 0: 不需要任何变更   1: 需要重新生成Option   2: 需要重新渲染
    // 先看一下参数的变化，这里分为几种：
    // $tiddler变化的，说明要重新生成Option
    // $theme、$fillSidebar 和 $renderer需要重新初始化实例
    // $class、$width 和 $height 只需要修改容器的尺寸就好了
    // 剩下的就是传给插件的参数了
    if ($tw.utils.count(changedAttributes) > 0) {
      if (changedAttributes.$tiddler) refreshFlag |= 1;
      if (changedAttributes.$theme || changedAttributes.$fillSidebar || changedAttributes.$renderer) refreshFlag |= 2;
      else if (changedAttributes.$class || changedAttributes.$width || changedAttributes.$height) {
        this.containerDom.style.width = this.getAttribute('$width', '100%');
        this.containerDom.style.height = this.getAttribute('$height', '300px');
        this.containerDom.className = this.getAttribute("$class", "gk0wk-echarts-body");
      }
      else refreshFlag |= 1;
    }
    if (!(refreshFlag & 1) && ((this.tiddlerTitle && changedTiddlers[this.tiddlerTitle]) || this.askForAddonUpdate(changedTiddlers))) {
      refreshFlag |= 1;
    }
    this.execute();
    if (refreshFlag & 2) {
      var oldOption = this.rebuildInstance();
      if (!oldOption || (refreshFlag & 1)) {
        unmountAddon(oldAddon, this.state, this.echartsInstance);
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
    var that = this;
    if (this.timer2) clearTimeout(this.timer2);
    this.timer2 = setTimeout(function () {
      that.timer2 = undefined;
      that.makeRefresh(changedTiddlers);
    }, 100);
    return false;
  };
  exports.echarts = EChartsWidget;
})();
