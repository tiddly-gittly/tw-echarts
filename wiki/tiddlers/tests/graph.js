describe('graph series', function() {

beforeAll(function() {
	$tw.test.startTestMode();
	jasmine.addMatchers($tw.test.customMatchers);
});

function testNodesEqualExceptCoords(adapter, expectedNodes) {
	const data = adapter.testLast.series[0].data;
	for (var i = 0; i < expectedNodes.length; i++) {
		const expected = expectedNodes[i];
		const actual = data[i];
		expected.x = actual.x;
		expected.y = actual.y;
	}
	expect(data).toEqual(expectedNodes);
};

it('handles zoom by not handling it', function() {
	const adapter = new $tw.test.GraphEngine({nodes: {A: {}}});
	// zooming, or as echarts calls it, roaming, is always enabled in graphs
	expect(adapter.testLast.series[0].roam).toBe(true);
	// It must be global, or dragging and zooming is a pain.
	expect(adapter.testLast.series[0].roamTrigger).toBe("global");
	// disable zooming
	adapter.update({graph: {zoom: false}});
	// Nothing should have changed, because we handle zoom toggling at
	// a DOM level, not at an echarts level.
	expect(adapter.testLast.series[0].roam).toBe(true);
	expect(adapter.testLast.series[0].roamTrigger).toBe("global");
});

it('can manipulate properties of node physics', function() {
	const adapter = new $tw.test.GraphEngine({graph: {
		repulsion: 7,
		edgeLength: 7,
		gravity: 0.7,
		friction: 0.7}});
	var series = adapter.testLast.series[0].force;
	expect(series.repulsion).toBe(7);
	expect(series.edgeLength).toBe(7);
	expect(series.gravity).toBe(0.7);
	expect(series.friction).toBe(0.7);
	adapter.update({graph: {}});
	series = adapter.testLast.series[0].force;
	// Values taken from echarts documentation
	expect(series.repulsion).toBe(50);
	expect(series.edgeLength).toBe(30);
	expect(series.gravity).toBe(0.1);
	expect(series.friction).toBe(0.6);
});

it('can manipulate node labels', function() {
	const adapter = new $tw.test.GraphEngine({ nodes: {
		match: {label: "match"},
		copy: {label: "match"},
		blank: {}}});
	testNodesEqualExceptCoords(adapter, [
		{id: "match", name: "match", label: {show: true, position: "bottom"}},
		{id: "copy", name: "match", label: {show: true, position: "bottom"}},
		{id: "blank"}]);
	adapter.update({ nodes: {
		match: {},
		blank: {label: "new"}}});
	testNodesEqualExceptCoords(adapter, [
		{id: "match"},
		{id: "copy", name: "match", label: {show: true, position: "bottom"}},
		{id: "blank", name: "new", label: {show: true, position: "bottom"}}]);
});

it('can manipulate node shapes', function() {
	const adapter = new $tw.test.GraphEngine({ nodes: {
		unspecified: {},
		circle: {shape: "circle"},
		square: {shape: "square"},
		rounded: {shape: "rounded"},
		no: {shape: "no"},
		nonexistent: {shape: "nonexistent"}}});
	testNodesEqualExceptCoords(adapter, [
		{id: "unspecified"},
		{id: "circle", symbol: "circle"},
		{id: "square", symbol: "rect"},
		{id: "rounded", symbol: "roundRect"},
		{id: "no", symbol: "none"},
		{id: "nonexistent"}]);
	// Now to change some of the shapes
	adapter.update({ nodes: {
		circle: {shape: "triangle"},           // change
		square: {shape: "notAChoice"},         // set to non-choice
		nonexistent: {shape: "arrow"}}}); // set
	testNodesEqualExceptCoords(adapter, [
		{id: "unspecified"},
		{id: "circle", symbol: "triangle"},
		{id: "square"},
		{id: "rounded", symbol: "roundRect"},
		{id: "no", symbol: "none"},
		{id: "nonexistent", symbol: "arrow"}]);
});

it('can manipulate node size', function() {
	const adapter = new $tw.test.GraphEngine({nodes: {
		auto: {},
		zero: {size: 0},
		manual: {size: 40}}});
	testNodesEqualExceptCoords(adapter, [
		{id: "auto"},
		{id: "zero", symbolSize: 0},
		{id: "manual", symbolSize: 40}]);
});

it('can manipulate node color', function() {
	const adapter = new $tw.test.GraphEngine({nodes: {
		auto: {},
		manual: {color: "#bb0000"}}});
	testNodesEqualExceptCoords(adapter, [
		{id: "auto"},
		{id: "manual", itemStyle: {color: "#bb0000"}}]);
});

it('can manipulate node image', function() {
	var imageTiddler = "$:/plugins/Gk0Wk/echarts/icon";
	var parser = $tw.wiki.parseTiddler(imageTiddler);
	embeddedUrl = parser.tree[0].attributes.src.value;
	const adapter = new $tw.test.GraphEngine({nodes: {
		image: {image: embeddedUrl},
		shape: {shape: "arrow"},
		// When mixed, image takes priority
		mixed: {shape: "arrow", image: embeddedUrl}}});
	testNodesEqualExceptCoords(adapter, [
		{id: "image", symbol: "image://" + embeddedUrl},
		{id: "shape", symbol: "arrow"},
		{id: "mixed", symbol: "image://" + embeddedUrl}]);
	// Let's make sure changing things works correctly
	adapter.update({nodes: {
		image: {image: embeddedUrl, shape: "triangle"},
		mixed: {shape: "triangle"}}});
	testNodesEqualExceptCoords(adapter, [
		{id: "image", symbol: "image://" + embeddedUrl},
		{id: "shape", symbol: "arrow"},
		{id: "mixed", symbol: "triangle"}]);
});

it('can manipulate node physics', function() {
	const adapter = new $tw.test.GraphEngine({nodes: {
		yes: {physics: true},
		no: {physics: false},
		unspecified: {}}});
	var data = adapter.testLast.series[0].data;
	expect(data.length).toBe(3);
	expect(data[0].fixed).toBe(false);
	expect(data[1].fixed).toBe(true);
	expect(data[2].fixed).toBeUndefined();
	// Update physics
	adapter.update({nodes: {
		yes: {},
		// "no" is untouched
		unspecified: {physics: false}}});
	data = adapter.testLast.series[0].data;
	// Testing individually, because the x's and y's will be set
	// to manipulate the viewport. We don't care in this test.
	expect(data.length).toBe(3);
	expect(data[0].fixed).toBeUndefined();
	expect(data[1].fixed).toBe(true);
	expect(data[2].fixed).toBe(true);
});

/*** Edges ***/

// The only way to remove edges from an eCharts graph is to either do
// a "notMerge" or a "replaceMerge", both of which require fully
// resubmitting the edge list.
it('can add and remove edges', function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}, C:{}},
		edges: {AB: {from: "A", to: "B"}, AC: {from: "A", to: "C"}}});
	// Let's add an edge
	adapter.update({edges: {AC2: {from: "A", to: "C"}}});
	expect(adapter.testLast.series[0].links).toEqual([
		{source: "A", target: "B"},
		{source: "A", target: "C"},
		{source: "A", target: "C"}]);
	// Now let's remove an edge
	adapter.update({edges: {AC: null}});
	expect(adapter.testLast.series[0].links).toEqual([
		{source: "A", target: "B"},
		{source: "A", target: "C"}]);
});

it('can manipulate edge labels', function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}, C: {}},
		edges: {AB: {from: "A", to: "B", label: "labeled"},
			AC: {from: "A", to: "C", label: "labeled"},
			BC: {from: "A", to: "B"}}});
	expect(adapter.testLast.series[0].links).toEqual([
		{source: "A", target: "B", id: "labeled", label: {show: true}},
		{source: "A", target: "C", id: "labeled", label: {show: true}},
		{source: "A", target: "B"}]);
});

it('can manipulate edge color', function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}},
		edges: {AB: {from: "A", to: "B", color: "#ff0000"}}});
	expect(adapter.testLast.series[0].links).toEqual([
		{source: "A", target: "B", lineStyle: {color: "#ff0000"}}]);
});

it('can manipulate edge width', function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}},
		edges: {
			empty: {from: "A", to: "B"},
			set: {from: "A", to: "B", width: 4}}});
	expect(adapter.testLast.series[0].links).toEqual([
		{source: "A", target: "B"},
		{source: "A", target: "B", lineStyle: {width: 4}}]);
});

it('can manipulate edge stroke', function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}},
		edges: {
			dashed: {from: "A", to: "B", stroke: "dashed"},
			dotted: {from: "A", to: "B", stroke: "dotted"},
			empty: {from: "A", to: "B"},
			solid: {from: "A", to: "B", stroke: "solid"}}});
	expect(adapter.testLast.series[0].links).toEqual([
		{source: "A", target: "B", lineStyle: {type: "dashed"}},
		{source: "A", target: "B", lineStyle: {type: "dotted"}},
		{source: "A", target: "B"},
		{source: "A", target: "B"}]);
});

it('can manipulate edge arrows', function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}},
		edges: {
			from: {from: "A", to: "B", arrows: "from"},
			empty: {from: "A", to: "B"},
			no: {from: "A", to: "B", arrows: "no"},
			to: {from: "A", to: "B", arrows: "to"}}});
	expect(adapter.testLast.series[0].links).toEqual([
		{source: "A", target: "B", symbol: ["arrow", null]},
		{source: "A", target: "B"},
		{source: "A", target: "B"},
		{source: "A", target: "B", symbol: [null, "arrow"]}]);
});

it('can manipulate edge roundness', function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}},
		edges: {
			curved: {from: "A", to: "B", roundness: 1},
			none: {from: "A", to: "B"},
			straight: {from: "A", to: "B", roundness: 0}}});
	expect(adapter.testLast.series[0].links).toEqual([
		{source: "A", target: "B", lineStyle: {curveness: 1}},
		{source: "A", target: "B"},
		{source: "A", target: "B"}]);
});

/*** Events ***/

class EChartsEvent {
	constructor(type, alternates, mouseType) {
		this.type = type;
		this.event = {
			event: {type: mouseType || type} // fill-in for a MouseEvent
		}
		for (var value in alternates) {
			this[value] = alternates[value];
		}
	}

	componentIndex = 0;
	componentType = "series";
	componentSubType = "graph";
	seriesIndex = 0;
	seriesType = "graph";
	seriesName = "series\u00000";
	dataIndex = 0;
	dataType = "node";
	name = "";
}

it("handles node click event as 'actions'", function() {
	const adapter = new $tw.test.GraphEngine({nodes: {A: {actions: true}}});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("actions");
		expect(graphEvent.objectType).toBe("nodes");
		expect(graphEvent.id).toBe("A");
	});
	// This zr event gets fired first, and our adapter needs to ignore it
	adapter.echarts.getZr().dispatchEvent({
		type: "dblclick", offsetX: 5, offsetY: 5,
		target: {id: 2731},
		event: {
			event: {type: "dblclick"} // fill-in for a MouseEvent
		}
	});
	adapter.testEvent(new EChartsEvent("dblclick", { data: {id: "A"}}));
	expect(onevent).toHaveBeenCalledTimes(1);
});

it("handles edge click event as 'actions'", function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}},
		edges: {AB: {from: "A", to: "B", actions: true}}});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("actions");
		expect(graphEvent.objectType).toBe("edges");
		expect(graphEvent.id).toBe("AB");
	});
	// This zr event gets fired first, and our adapter needs to ignore it
	adapter.echarts.getZr().dispatchEvent({
		type: "dblclick", offsetX: 5, offsetY: 5,
		target: {id: 2731}, // The id is pretty arbitrary
		event: {
			event: {type: "dblclick"} // fill-in for a MouseEvent
		}
	});
	adapter.testEvent(new EChartsEvent("dblclick", {
		dataType: "edge", data: {id: "AB", from: "A", to: "B"}
	}));
	expect(onevent).toHaveBeenCalledTimes(1);
});

it("handles graph double click event as 'doubleclick'", function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {x:1000, y:-1000}, B: {x: 1010, y: -1010}}});
	spyOn(adapter.echarts, "convertFromPixel").and.callFake(function(finder, value) {
		expect(finder).toEqual({seriesIndex: 0});
		return [value[0]+1000, value[1]-1000];
	});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("doubleclick");
		expect(graphEvent.objectType).toBe("graph");
		expect(variables.x).toBe(1005);
		expect(variables.y).toBe(-995);
	});
	adapter.echarts.getZr().dispatchEvent({
		type: "dblclick", offsetX: 5, offsetY: 5,
		event: {
			event: {type: "dblclick"} // fill-in for a MouseEvent
		}
	});
	expect(onevent).toHaveBeenCalledTimes(1);
});

it("handles node hover event", function() {
	const adapter = new $tw.test.GraphEngine({nodes: {A: {hover: true}}});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("hover");
		expect(graphEvent.objectType).toBe("nodes");
		expect(graphEvent.id).toBe("A");
	});
	adapter.testEvent(new EChartsEvent("mouseover", { data: {id: "A"} }));
	expect(onevent).toHaveBeenCalledTimes(1);
});

it("handles edge hover event", function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}},
		edges: {AB: {from: "A", to: "B", hover: true}}});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("hover");
		expect(graphEvent.objectType).toBe("edges");
		expect(graphEvent.id).toBe("AB");
	});
	adapter.testEvent(new EChartsEvent("mouseover", {
		dataType: "edge",
		data: {id: "AB", from: "A", to: "B"},
	}));
	expect(onevent).toHaveBeenCalledTimes(1);
});

it("handles node blur event", function() {
	const adapter = new $tw.test.GraphEngine({nodes: {A: {blur: true}}});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("blur");
		expect(graphEvent.objectType).toBe("nodes");
		expect(graphEvent.id).toBe("A");
	});
	adapter.testEvent(new EChartsEvent("mouseout", { data: {id: "A"}}, "mousemove"));
	expect(onevent).toHaveBeenCalledTimes(1);
});

it("handles edge blur event", function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}},
		edges: {AB: {from: "A", to: "B", blur: true}}});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("blur");
		expect(graphEvent.objectType).toBe("edges");
		expect(graphEvent.id).toBe("AB");
	});
	adapter.testEvent(new EChartsEvent("mouseout", {
		dataType: "edge", data: {id: "AB", from: "A", to: "B"},
	}, "mousemove"));
	expect(onevent).toHaveBeenCalledTimes(1);
});

it("handles node free event with physics", function() {
	// This event requires special handling since ECharts doesn't handle
	// it the way we need it to be handled, which is to say as a "free" event
	// and not a "mouse release while we just happen to be over a node" event.
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {free: true, x: 52, y: 38}}});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("free");
		expect(graphEvent.objectType).toBe("nodes");
		expect(graphEvent.id).toBe("A");
		expect(variables.x).toBe(34.69);
		expect(variables.y).toBe(47.41);
	});
	function makeEChartEvent(type, id, x, y, mouseType) {
		return new EChartsEvent(type, {
			dataIndex: 7, data: {id: id},
			event: {
				offsetX: x,
				offsetY: y,
				// fill-in for a MouseEvent
				event: {type: mouseType || type}
			}
		});
	};
	// There's a whole chain of stuff we've got to access to learn a
	// single node's location...
	var lastFixedNode;
	spyOn(adapter.echarts, "getModel")
		.and.returnValue({ getSeriesByIndex: function(index) {
			expect(index).toBe(0);
			return {
				getGraph: () => {
					return { getNodeById: function(id) {
						expect(id).toBe("A");
						return {
							getLayout: () => [34.687, 47.412],
							dataIndex: 7
						};
					}}
				},
				forceLayout: {
					setFixed: function(nodeIndex) {
						lastFixedNode = nodeIndex;
					}
				}
			}
		}});
	const zrEvent = {
		type: "dragend",
		target: {id: 2731}, // The id is pretty arbitrary
		event: { type: "mouseup" }
	};
	// This event should cause nothing to happen, because it did not
	// correspond to a mousedown event, so it couldn't have been a drag.
	adapter.echarts.getZr().dispatchEvent(zrEvent);
	expect(onevent).not.toHaveBeenCalled();
	expect(lastFixedNode).toBeUndefined();
	// Now we start with a mousedown event
	adapter.testEvent(makeEChartEvent("mousedown", "A", 25, 20));
	adapter.echarts.getZr().dispatchEvent(zrEvent);
	expect(onevent).toHaveBeenCalledTimes(1);
	expect(lastFixedNode).toBe(7);
});

it("handles node free event without physics", function() {
	// This event requires special handling since ECharts doesn't handle
	// it the way we need it to be handled, which is to say as a "free" event
	// and not a "mouse release while we just happen to be over a node" event.
	const adapter = new $tw.test.GraphEngine({
		graph: {physics: false},
		nodes: {A: {free: true, x: 52, y: 38}}});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("free");
		expect(graphEvent.objectType).toBe("nodes");
		expect(graphEvent.id).toBe("A");
		expect(variables.x).toBe(34.64);
		expect(variables.y).toBe(47.87);
	});
	function makeEChartEvent(type, id, x, y, mouseType) {
		return {
			type: type,
			componentIndex: 0, componentType: "series", componentSubType: "graph",
			seriesIndex: 0,    seriesType: "graph",     seriesName: "series\u00000",
			dataIndex: 7,      dataType: "node",        data: {id: id},
			name: "",
			event: {
				offsetX: x,
				offsetY: y,
				// fill-in for a MouseEvent
				event: {type: mouseType || type}
			}
		};
	};
	// There's a whole chain of stuff we've got to access to learn a
	// single node's location...
	var lastFixedNode;
	spyOn(adapter.echarts, "getModel")
		.and.returnValue({ getSeriesByIndex: function(index) {
			expect(index).toBe(0);
			return {
				getGraph: () => {
					return { getNodeById: function(id) {
						expect(id).toBe("A");
						return { getLayout: () => [34.643, 47.865] }
					}}
				},
				forceLayout: null
			}
		}});
	const zrEvent = {
		type: "dragend",
		target: {id: 2731}, // The id is pretty arbitrary
		event: { type: "mouseup" }
	};
	// Now for the mouse event
	adapter.testEvent(makeEChartEvent("mousedown", "A", 25, 20));
	adapter.echarts.getZr().dispatchEvent(zrEvent);
	expect(onevent).toHaveBeenCalledTimes(1);
	expect(lastFixedNode).toBeUndefined();
});

it("does not support edge drag and free events", function() {
	// But it doesn't crash either if the user tries to do it!
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}}, edges: {A: {from: "A", to: "B"}}});
	var onevent = $tw.test.spyOnEvent(adapter, function() {});
	function makeEChartEvent(type, id, x, y, mouseType) {
		return new EChartsEvent(type, {
			dataIndex: 7, data: {id: id},
			event: {
				offsetX: x,
				offsetY: y,
				// fill-in for a MouseEvent
				event: {type: mouseType || type}
			}
		});
	};
	// It won't do anything when mouse down on edges occurs
	adapter.testEvent(makeEChartEvent("mousedown", "edge"));
	expect(onevent).not.toHaveBeenCalled();
	// It also doesn't do anything on mouseup, even if we initialize a drag
	// with a node sharing the same id.
	adapter.testEvent(makeEChartEvent("mousedown", "node"));
	adapter.testEvent(makeEChartEvent("mouseup", "edge"));
	expect(onevent).not.toHaveBeenCalled();
});

});
