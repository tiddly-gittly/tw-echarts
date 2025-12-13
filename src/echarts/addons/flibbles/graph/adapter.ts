//var ECharts = require("$:/plugins/Gk0Wk/echarts/echarts.min.js");

import * as ECharts from '$:/plugins/Gk0Wk/echarts/echarts.min.js';

const Series = $tw.modules.getModulesByTypeAsHashmap("echartsseries");

interface GraphObjects {
	graph?: any;
	nodes?: any;
	edges?: any;
};

export const name = "ECharts";

export const properties = {
	graph: {
		physics: {type: "boolean", default: true},
		zoom: {type: "boolean", default: true, nonECharts: true},
		doubleclick: {type: "actions", variables: ["x", "y"]},
		focus: {type: "actions", nonECharts: true},
		blur: {type: "actions", nonECharts: true}
	},
	nodes: {
		x: {type: "number"},
		y: {type: "number"},
		label: {type: "string"},
		physics: {type: "boolean", default: true},
		image: {type: "image"},
		color: {type: "color"},
		shape: {type: "enum", default: "circle"},
		actions: {type: "actions"},
		hover: {type: "actions"},
		blur: {type: "actions"},
		free: {type: "actions", variables: ["x", "y"]}
	},
	edges: {
		label: {type: "string"},
		actions: {type: "actions"},
		hover: {type: "actions"},
		blur: {type: "actions"},
	}
};

export const shape2symbol = {
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
	const children = Array.prototype.slice.call(element.childNodes);
	var echarts = ECharts.init(element);
	this.echartsElement = echarts.getDom().childNodes[0];
	// We MUST preserve any elements already attached to the passed element.
	for (var i = 0; i < children.length; i++) {
		element.appendChild(children[i]);
	}
	// We need to add this magic attribute to this internal element so it
	// can detect focus and blur.
	this.echartsElement.setAttribute("tabindex", "0");
	this.echartsElement.addEventListener("focus", this);
	this.echartsElement.addEventListener("blur", this);
	this.echartsElement.addEventListener("wheel", this, true);
	this.window = options.window || window;
	this.echarts = echarts;
	this.data = Object.create(null);
	this.links = Object.create(null);
	this.zoom = true;
	this.graph = Object.create(null);
	this.window.addEventListener("resize", function() {
		echarts.resize();
	});
	objects.graph = objects.graph || {};
	if (objects.graph.physics === undefined) {
		objects.graph.physics = true;
	}
	this.update(objects);
	const dataTypes = {
		node: "nodes",
		edge: "edges"
	};
	const eventTypes = {
		dblclick: "actions",
		mouseover: "hover",
		mouseout: "blur",
	};
	function eventHandler(params) {
		var dataType = dataTypes[params.dataType];
		if (dataType) {
			this.onevent({
				type: eventTypes[params.type],
				objectType: dataType,
				id: params.data.id,
				event: params.event.event
			});
		}
	};
	for (var event in eventTypes) {
		this.echarts.on(event, eventHandler, this);
	}
	this.echarts.getZr().on("dblclick", function(event) {
		if (!event.target) {
			var coords = this.echarts.convertFromPixel(
				{seriesIndex: 0},
				[event.offsetX, event.offsetY]);
			this.onevent(
				{type: "doubleclick", objectType: "graph"},
				{x: coords[0], y: coords[1]});
		}
	}, this);
	this.echarts.on("mousedown", "series", function(params) {
		if (params.dataType === "node") {
			this.mouseDownId = params.data.id;
		}
	}, this);
	this.echarts.on("mouseup", "series", function(params) {
		if (params.dataType === "node") {
			const event = params.event;
			const id = params.data.id;
			if (id === this.mouseDownId) {
				var coords = this.echarts.getModel().getSeriesByIndex(0).getGraph().getNodeById(id).getLayout();
				this.onevent({
					type: "free",
					objectType: "nodes",
					id: params.data.id,
					event: event.event},
				{
					x: Math.round(coords[0]),
					y: Math.round(coords[1])});
			}
			this.mouseDownId = null;
		}
	}, this);
};

export function update(objects: GraphObjects) {
	var updateSeries = true;
	var graph = objects.graph;
	if (graph) {
		var count = 0;
		// If there's more than 1 kind of graphObject, then we'll need
		// to update the series
		updateSeries = Object.keys(objects).length !== 1;
		// First, did any graph properties we already know about change?
		for (var key in this.graph) {
			if (this.graph[key] !== undefined) {
				if (graph[key] !== this.graph[key]) {
					updateSeries = true;
				}
				count++;
				this.graph[key] = undefined;
			}
		}
		// Now let's insert the new properties
		for (var key in graph) {
			if (isSeriesProperty(key)) {
				this.graph[key] = graph[key];
				count--;
			}
		}
		// Did we get back the same number of properties?
		// No? Then there must be new properties. Change the series.
		if (count !== 0) {
			updateSeries = true;
		}
		this.zoom = graph.zoom !== false;
	}
	// We have changes that require updating the series.
	if (updateSeries) {
		const config = { };
		if (graph && graph.nodeColor) {
			config.color = [
				graph.nodeColor,
				graph.graphColor,
				graph.fontColor
			];
		}
		// Currently, there is only one type of series. We use it always.
		// Ultimately, there will be other types.
		config.series = [Series.graph.update.call(this, objects)];
		this.echarts.setOption(config, false);
		this.config = config;
	}
};

function isSeriesProperty(name) {
	const entry = properties.graph[name];
	return entry !== undefined && !entry.nonECharts;
};

export function destroy(): void {
	if (this.echarts && !this.echarts.isDisposed()) {
		this.echartsElement.removeEventListener("focus", this);
		this.echartsElement.removeEventListener("blur", this);
		this.echartsElement.removeEventListener("wheel", this, true);
		this.echarts.dispose();
		this.echarts = undefined;
	}
};

export function handleEvent(event: Event) {
	if (event.type === "wheel") {
		if (!this.zoom) {
			event.stopPropagation();
		}
	} else {
		this.onevent({
			type: event.type,
			objectType: "graph",
			event: event
		});
	}
};
