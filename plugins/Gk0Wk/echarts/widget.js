(function () {
  "use strict";
  var Widget = require("$:/core/modules/widgets/widget.js").widget;
  var EchartsJS = require("$:/plugins/Gk0Wk/echarts/echarts.min.js");
  if ($tw.browser) {
    // 总算明白了，node启动时，这个会被调用一遍，在浏览器又会调用一遍
    // 两边不是一个概念
    window.echarts = EchartsJS;
    try {
      require("$:/plugins/Gk0Wk/echarts/echarts-wordcloud.min.js");
    } catch (e) {
      console.error(e);
    }
  }
  var unmountAddon = function (title, state) {
    try {
      if (title && $tw.wiki.getTiddler(title)) {
        if ($tw.wiki.getTiddler(title).fields.type === 'application/javascript') {
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
    this.containerDom = document.createElement('div');
    this.containerDom.className = this.class;
    this.containerDom.style.width = this.width;
    this.containerDom.style.height = this.height;
    parent.insertBefore(this.containerDom, nextSibling);
    this.domNodes.push(this.containerDom);
    if (!$tw.browser) {
      this.containerDom.innerText = 'Echarts Widget Placeholder';
      return;
    }
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
      }
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
        if (!that.tiddlerTitle || !$tw.wiki.getTiddler(that.tiddlerTitle)) resolve();
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
      }
      resolve();
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
        unmountAddon(oldAddon, this.state);
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
