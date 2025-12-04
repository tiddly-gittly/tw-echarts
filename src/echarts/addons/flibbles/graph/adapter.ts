//var ECharts = require("$:/plugins/Gk0Wk/echarts/echarts.min.js");

import ECharts from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

interface GraphObjects {
	graph?: any;
	nodes?: any;
	edges?: any;
};

export const name = "ECharts";

export const properties = {
	graph: {
		physics: {type: "boolean", default: true}
	},
	nodes: {
		x: {type: "number"},
		y: {type: "number"},
		label: {type: "string"},
		color: {type: "color"}
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
	objects.graph = objects.graph || {};
	if (objects.graph.physics === undefined) {
		objects.graph.physics = true;
	}
	this.update(objects);
};

export function update(objects: GraphObjects) {
	let config = {
		//title: { text: "ECharts hello world" },
		//legend: { data: ['Legend here'] },
	};
	const series = {};
	let resubmitSeries = false;
	let type = "graph";
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
			series.
			// Force a refresh of nodes
			resubmitSeries = true;
		}
		if (graph.physics !== undefined) {
			series.layout = graph.physics? "force": "none";
			resubmitSeries = true;
		}
	}
	if (objects.nodes || objects.edges) {
		resubmitSeries = true;
		series.type = "graph";
		if (objects.nodes) {
			var data = merge(this.entries, objects.nodes);
			var nodes = this.entries;
			series.data = data.map(function(n) {
				var cleaned = { id: n.id };
				if (n.x !== undefined) {
					cleaned.x = n.x/10;
				} else {
					cleaned.x = 0;
				}
				if (n.y !== undefined) {
					cleaned.y = n.y/10;
				} else {
					cleaned.y = 0;
				}
				return cleaned;
			});
		}
		if (objects.edges) {
			series.links = [];
			for (var id in objects.edges) {
				var edge = objects.edges[id];
				series.links.push({source: edge.from, target: edge.to});
			}
		}
	}
	if (resubmitSeries) {
		config.series = [series];
	}
	this.echarts.setOption(config);
};

export function destroy(): void {
	if (this.echarts && !this.echarts.isDisposed()) {
		this.echarts.dispose();
		this.echarts = undefined;
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

