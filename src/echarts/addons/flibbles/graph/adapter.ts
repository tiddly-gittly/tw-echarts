//var ECharts = require("$:/plugins/Gk0Wk/echarts/echarts.min.js");

import * as ECharts from '$:/plugins/Gk0Wk/echarts/echarts.min.js';
import { Shape2symbol } from './utils.js';

const Series = $tw.modules.getModulesByTypeAsHashmap("echartsseries");

interface GraphObjects {
	graph?: object;
	nodes?: object;
	edges?: object;
};

export const name = "ECharts";

export const properties = {
	graph: {
		physics: {type: "boolean", default: true},
			edgeLength: {type: "number", default: 30, min: 0, max: 100, parent: "physics"},
			friction: {type: "number", default: 0.6, min: 0, max: 1, increment: 0.01, parent: "physics"},
			gravity: {type: "number", default: 0.1, min: 0, max: 1, increment: 0.01, parent: "physics"},
			repulsion: {type: "number", default: 50, min: 0, max: 200, parent: "physics"},
		zoom: {type: "boolean", default: true, nonECharts: true},
		doubleclick: {type: "actions", variables: ["x", "y"]},
		focus: {type: "actions", nonECharts: true},
		blur: {type: "actions", nonECharts: true}
	},
	nodes: {
		x: {type: "number"},
		y: {type: "number"},
		size: {type: "number", min: 0, max: 100, default: 10},
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
		to: {type: "string", hidden: true},
		from: {type: "string", hidden: true},
		arrows: {type: "enum", default: "no", values: ["no", "to", "from"]},
		label: {type: "string"},
		color: {type: "color"},
		roundness: {type: "number", min: 0, max: 1, increment: 0.01, default: 0},
		stroke: {type: "enum", default: "solid", values: ["solid", "dashed", "dotted"]},
		width: {type: "number", default: 1, min: 0, max: 100},
		actions: {type: "actions"},
		hover: {type: "actions"},
		blur: {type: "actions"},
	}
};

properties.nodes.shape.values = Object.keys(Shape2symbol);

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
	this.zoom = true;
	this.graph = Object.create(null);
	var standardGraph = Object.create(Series.graph);
	standardGraph.init(this.echarts);
	this.series = [standardGraph];
	this.window.addEventListener("resize", function() {
		echarts.resize();
	});
	objects.graph = objects.graph || {};
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
	const zr = this.echarts.getZr();
	zr.on("dblclick", function(event) {
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
	zr.on("dragend", function(event) {
		// We use zr.dragend instead of the echarts mouseup because
		// drag end more consistently works, such as when the mouse
		// leaves the viewport before releasing.
		const id = this.mouseDownId;
		if (id) {
			const seriesModel = this.echarts.getModel().getSeriesByIndex(0);
			const node = seriesModel.getGraph().getNodeById(id);
			if (seriesModel.forceLayout) {
				seriesModel.forceLayout.setFixed(node.dataIndex);
			}
			const coords = node.getLayout();
			this.onevent({
				type: "free",
				objectType: "nodes",
				id: id,
				event: event.event},
			{
				x: Math.round(coords[0]*100)/100,
				y: Math.round(coords[1]*100)/100});
		}
		this.mouseDownId = null;
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
		config.series = this.series.map((series) => series.update(objects));
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
