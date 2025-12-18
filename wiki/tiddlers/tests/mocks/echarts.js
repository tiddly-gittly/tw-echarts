/*\

This is a mock echarts.min.js which overrides the plugin module for the sake
of testing.

\*/

var EventTarget = require("./eventtarget.js").EventTarget;

exports.ECharts = {
	init: function(element) {
		return new MockECharts(element);
	}
};

class MockECharts {
	constructor(element) {
		// Like most visualization engines, ECharts nukes any contents
		// its passed element may have contained.
		// Unfortunately, our fake DOM elements can't do `innerHTML = ""`
		while (element.childNodes.length > 0) {
			element.removeChild(element.childNodes[0]);
		}
		this.element = element;
		// The eventElement is the nested element we send focus and blur
		// events to.
		this.eventElement = $tw.test.createElement("div");
		this.element.appendChild(this.eventElement);
		this.eventTarget = Object.create(EventTarget);
		this.zr = Object.create(EventTarget);
	}

	setOption(option, notMerge) {
		// We don't have a model until we've set options at least once.
		this._model = this._model || new Model();
		this.lastOption = option;
	}

	// We'll return whatever height and width settings the initializing
	// element had.
	getHeight() { return parseInt(this.element.style.height); }
	getWidth() { return parseInt(this.element.style.width); }

	getDom() {
		return this.element;
	}

	getZr() {
		return this.zr;
	}

	getModel() {
		return this._model;
	}

	convertFromPixel(finder, value) {
		// Intended to be spied upon
	}

	on(type, query, callback, context) {
		if (typeof query === "function") {
			context = callback;
			callback = query;
			query = "all";
		}
		// TODO: Currently, this does no testing on what the query arg is.
		this.eventTarget.on(type, callback, context);
	}

	dispatchAction(payload) {
		this.eventTarget.dispatchEvent(payload);
	}

	dispose() {
		if (this.isDisposed()) {
			throw new Exception("Trying to dispose of a mock echarts that was either already disposed of, or never initialized.");
		}
		this.element = undefined;
	}

	isDisposed() {
		return this.element === undefined;
	}
};

class Model {
	constructor() {
		this.series = [];
	}

	getSeriesByIndex(index) {
		return this.series[index] = this.series[index] || new Series();
	}
};

class Series {
	constructor() {
		this._graph = {
			nodes: Object.create(null),
			getNodeById: function(id) {
				return this.nodes[id] = this.nodes[id] || new Node();
			}

		}
	}

	getGraph() {
		return this._graph;
	}
};

class Node {
	getLayout() {};
	setLayout(coords) {};
}
