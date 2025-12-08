//var ECharts = require("$:/plugins/Gk0Wk/echarts/echarts.min.js");

import * as ECharts from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

interface GraphObjects {
	graph?: any;
	nodes?: any;
	edges?: any;
};

export const name = "ECharts";

export const properties = {
	graph: {
		physics: {type: "boolean", default: true},
		zoom: {type: "boolean", default: true},
		focus: {type: "actions"},
		blur: {type: "actions"}
	},
	nodes: {
		x: {type: "number"},
		y: {type: "number"},
		label: {type: "string"},
		physics: {type: "boolean", default: true},
		image: {type: "image"},
		color: {type: "color"},
		shape: {type: "enum", default: "circle"}
	},
	edges: {
		label: {type: "string"}
	}
};

const shape2symbol = {
	"circle": "circle",
	"square": "rect",
	"rounded": "roundRect",
	"triangle": "triangle",
	"diamond": "diamond",
	"pin": "pin",
	"arrow": "arrow",
	"no": "none"
};

properties.nodes.shape.values = Object.keys(shape2symbol);

export const messages = Object.create(null);

export function init(element: HTMLDivElement, objects: GraphObjects, options?) {
	element.style.height = "400px";
	var echarts = ECharts.init(element);
	this.echartsElement = echarts.getDom().childNodes[0];
	// We need to add this magic attribute to this internal element so it
	// can detect focus and blur.
	this.echartsElement.setAttribute("tabindex", "0");
	this.echartsElement.addEventListener("focus", this);
	this.echartsElement.addEventListener("blur", this);
	this.window = options.window || window;
	this.echarts = echarts;
	this.data = Object.create(null);
	this.links = Object.create(null);
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
		series.type = "graph";
		// Force a refresh of nodes
		resubmitSeries = true;
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
		}
		// We need to set this manually in all cases because we
		// use a different default from what echarts would use.
		// Physics defaults to "on", because vis-network did.
		series.layout = graph.physics === false? "none": "force";
		series.force = {
			repulsion: 60,
			edgeLength: 2,
			gravity: 0.1
		};
		if (series.layout === "force") {
			series.draggable = true;
		}
		// zoom <=> roam is another option where we have a different
		// default
		series.roam = graph.zoom !== false;
		// If we don't have this, then mouse events on the graph outside
		// of a hypothetical bounding-box around the nodes won't work.
		series.roamTrigger = "global";
	}
	if (objects.nodes || objects.edges) {
		resubmitSeries = true;
		if (objects.nodes) {
			var data = merge(this.data, objects.nodes);
			data.sort((a,b) => a.x - b.x);
			series.data = data.map(function(n) {
				var cleaned = { id: n.id };
				if (n.x !== undefined) {
					cleaned.x = n.x;
				}
				if (n.y !== undefined) {
					cleaned.y = n.y;
				}
				if (shape2symbol[n.shape]) {
					cleaned.symbol = shape2symbol[n.shape];
				}
				if (n.image) {
					cleaned.symbol = `image://${n.image}`;
				}
				if (n.physics !== undefined) {
					cleaned.fixed = n.physics !== true;
				}
				return cleaned;
			});
		}
		if (objects.edges) {
			var links = merge(this.links, objects.edges);
			series.links = links.map(function(l) {
				return {source: l.from, target: l.to};
			});
		}
	}
	if (resubmitSeries) {
		config.series = [series];
	}
	this.echarts.setOption(config, false);
	this.config = config;
};

export function destroy(): void {
	if (this.echarts && !this.echarts.isDisposed()) {
		this.echartsElement.removeEventListener("focus", this);
		this.echartsElement.removeEventListener("blur", this);
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
	return output;
};

export function handleEvent(event: Event) {
	this.onevent({
		type: event.type,
		objectType: "graph",
		event: event
	});
};
