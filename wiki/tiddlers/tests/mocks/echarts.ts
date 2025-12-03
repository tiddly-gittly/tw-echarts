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
	}

	setOption(options) {
		this.options = options;
		console.log("The update was called");
	}
};
