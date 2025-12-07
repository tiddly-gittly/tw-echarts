/*\

This is a mock echarts.min.js which overrides the plugin module for the sake
of testing.

\*/

exports.ECharts = {
	init: function(element) {
		return new MockECharts(element);
	}
};

class MockECharts {
	constructor(element) {
		this.element = element;
		// The eventElement is the nested element we send focus and blur
		// events to.
		this.eventElement = $tw.test.createElement("div");
		this.element.appendChild(this.eventElement);
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

	isDisposed() {
		return this.element === undefined;
	}
};
