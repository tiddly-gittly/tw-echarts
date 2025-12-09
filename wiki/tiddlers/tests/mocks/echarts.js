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
	}

	setOption(option, notMerge) {
		this.lastOption = option;
	}

	getDom() {
		return this.element;
	}

	dispose() {
		if (this.isDisposed()) {
			throw new Exception("Trying to dispose of a mock echarts that was either already disposed of, or never initialized.");
		}
		this.element = undefined;
	}

	on(type, callback) {
		this.eventTarget.addEventListener(type, callback);
	}

	dispatchAction(payload) {
		this.eventTarget.dispatchEvent(payload);
	}

	isDisposed() {
		return this.element === undefined;
	}
};
