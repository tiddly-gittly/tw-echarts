//var ECharts = require("$:/plugins/Gk0Wk/echarts/echarts.min.js");

import ECharts from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

interface GraphObjects {
	graph?: any;
	nodes?: any;
	edges?: any;
};

export const name = "ECharts";

export const properties = {
	graph: {},
	nodes: {
		value: {type: "number"},
		x: {type: "number"},
		y: {type: "number"},
		label: {type: "string"}
	},
	edges: {
		label: {type: "string"}
	}
};

export const messages = Object.create(null);

export function init(element: HTMLDivElement, objects: GraphObjects, options?) {
	element.style.height = "400px";
	var echarts = ECharts.init(element);
	this.window = options.window || window;
	this.echarts = echarts;
	this.entries = Object.create(null);
	this.window.addEventListener("resize", function() {
		echarts.resize();
	});
	this.update(objects);
};

export function update(objects: GraphObjects) {
	var config = {
		//title: { text: "ECharts hello world" },
		//legend: { data: ['Legend here'] },
	};
	if (objects.graph) {
		var graph = objects.graph;
		if (graph.nodeColor) {
			config.color = [
				graph.nodeColor,
				graph.graphColor,
				graph.fontColor
			];
		}
		if (graph.type) {
			this.type = graph.type;
			// Force a refresh of nodes
			objects.nodes = objects.nodes || {};
		}
	}
	if (objects.nodes || objects.edges) {
		var series = {
			type: this.type || "graph",
			layout: "none"
		};
		if (objects.nodes) {
			var data = merge(this.entries, objects.nodes);
			var nodes = this.entries;
			series.data = data.map(function(n) {
				return {
					name: n.label,
					x: n.x/10,
					y: n.y/10
				}
			});
		}
		if (objects.edges) {
			series.links = [];
			for (var id in objects.edges) {
				var edge = objects.edges[id];
				series.links.push({source: edge.from, target: edge.to});
			}
		}
		config.series = [series];
	}
	this.echarts.setOption(config);
};

export function destroy() {
	if (!this.echarts.isDisposed()) {
		this.echarts.dispose();
	}
};

function merge(entries, updates) {
	for (var id in updates) {
		var update = updates[id];
		if (update) {
			update.id = id;
			entries[id] = update;
		} else { // Must be null, thus a deletion
			entries[id] = undefined;
		}
	}
	var output = [];
	for (var id in entries) {
		if (entries[id]) {
			output.push(entries[id]);
		}
	}
	output.sort((a,b) => a.x - b.x);
	return output;
};

