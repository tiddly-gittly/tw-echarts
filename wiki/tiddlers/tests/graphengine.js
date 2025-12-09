describe('graphengine tests', function() {

beforeAll(() => $tw.test.startTestMode() );

xit('handles empty graph getting filled', function() {
	const adapter = new $tw.test.GraphEngine({});
	expect(adapter.testLast.series).toBeUndefined();
	adapter.update({nodes: { newNode: {}} });
	// With such a minimal set of info to update,
	// we should be able to exactly match the passed "option".
	expect(adapter.testLast).toEqual({
		series: [{
			type: "graph",
			layout: "force",
			data: [{id: "newNode"}]
		}]
	});
});

it('handles graph physics', function() {
	const adapter = new $tw.test.GraphEngine({nodes: {A: {}}});
	// physics is enabled by default
	expect(adapter.testLast.series[0].layout).toBe("force");
	// graph must be set to draggable if it's to be manipulated at all
	expect(adapter.testLast.series[0].draggable).toBe(true);
	// disable the physics and make sure it takes
	adapter.update({graph: {physics: false}});
	expect(adapter.testLast.series[0].layout).toBe("none");
	// unset it and make sure that resets the physics to ON
	adapter.update({graph: {}});
	expect(adapter.testLast.series[0].layout).toBe("force");
	// re-enable it and make sure that takes too
	// I might want to change this later to not expect a new update.
	// That would prevent the hiccup that echarts shows, but that kind
	// of smoothness might require too complicated an interface.
	adapter.update({graph: {physics: true}});
	expect(adapter.testLast.series[0].layout).toBe("force");
});

it('handles zoom', function() {
	const adapter = new $tw.test.GraphEngine({nodes: {A: {}}});
	// zooming, or as echarts calls it, zooming, is enabled by default
	expect(adapter.testLast.series[0].roam).toBe(true);
	// It must be global, or dragging and zooming is a pain.
	expect(adapter.testLast.series[0].roamTrigger).toBe("global");
	// disable zooming
	adapter.update({graph: {zoom: false}});
	expect(adapter.testLast.series[0].roam).toBe(false);
});

it('can manipulate node labels', function() {
	const adapter = new $tw.test.GraphEngine({ nodes: {
		match: {label: "match"},
		copy: {label: "match"},
		blank: {}}});
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "match", name: "match", label: {show: true, position: "bottom"}},
		{id: "copy", name: "match", label: {show: true, position: "bottom"}},
		{id: "blank"}]);
	adapter.update({ nodes: {
		match: {},
		blank: {label: "new"}}});
	expect(adapter.testLast.series[0].data).toEqual([
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
	expect(adapter.testLast.series[0].data).toEqual([
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
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "unspecified"},
		{id: "circle", symbol: "triangle"},
		{id: "square"},
		{id: "rounded", symbol: "roundRect"},
		{id: "no", symbol: "none"},
		{id: "nonexistent", symbol: "arrow"}]);
});

it('can manipulate node color', function() {
	const adapter = new $tw.test.GraphEngine({nodes: {
		auto: {},
		manual: {color: "#bb0000"}}});
	expect(adapter.testLast.series[0].data).toEqual([
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
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "image", symbol: "image://" + embeddedUrl},
		{id: "shape", symbol: "arrow"},
		{id: "mixed", symbol: "image://" + embeddedUrl}]);
	// Let's make sure changing things works correctly
	adapter.update({nodes: {
		image: {image: embeddedUrl, shape: "triangle"},
		mixed: {shape: "triangle"}}});
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "image", symbol: "image://" + embeddedUrl},
		{id: "shape", symbol: "arrow"},
		{id: "mixed", symbol: "triangle"}]);
});

it('can manipulate node physics', function() {
	const adapter = new $tw.test.GraphEngine({nodes: {
		yes: {physics: true},
		no: {physics: false},
		unspecified: {}}});
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "yes", fixed: false},
		{id: "no", fixed: true},
		{id: "unspecified"}]);
	// Update physics
	adapter.update({nodes: {
		yes: {}, unspecified: {physics: false}}});
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "yes"},
		{id: "no", fixed: true},
		{id: "unspecified", fixed: true}]);
});

// The only way to remove edges from an eCharts graph is to either do
// a "notMerge" or a "replaceMerge", both of which require fully
// resubmitting the edge list.
it('can add and remove edges', function() {
	const adapter = new $tw.test.GraphEngine({
		nodes: {A: {}, B: {}, C:{}},
		edges: {AB: {from: "A", to: "B"}, AC: {from: "A", to: "C"}}});
	// Let's add an edge
	adapter.update({edges: {BC: {from: "B", to: "C"}}});
	expect(adapter.testLast.series[0].links).toEqual([
		{id: "AB", source: "A", target: "B"},
		{id: "AC", source: "A", target: "C"},
		{id: "BC", source: "B", target: "C"}]);
	// Now let's remove an edge
	adapter.update({edges: {AB: null}});
	expect(adapter.testLast.series[0].links).toEqual([
		{id: "AC", source: "A", target: "C"},
		{id: "BC", source: "B", target: "C"}]);
});

/*** Events ***/

// Make sure the graph can emit both focus and blur on the whole graph itself
$tw.utils.each(["focus", "blur"], function(type) {
	it(`handles graph ${type} event`, function() {
		const adapter = new $tw.test.GraphEngine({graph: {[type]: true}});
		var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
			expect(graphEvent.type).toBe(type);
			expect(graphEvent.objectType).toBe("graph");
		});
		// The event handlers are attached to the elemetn BELOW the one
		// we passed to eCharts. Gotta grab that one.
		var element = adapter.echarts.eventElement;
		// Ensure it's "focus" and "blur" enabled by the magic attribute
		expect(element.attributes.tabindex).toBe("0");
		element.dispatchEvent({type: type});
		expect(onevent).toHaveBeenCalledTimes(1);
		// Now we make sure that event is de-registered on destroy
		adapter.destroy();
		onevent.calls.reset();
		element.dispatchEvent({type:type});
		expect(onevent).not.toHaveBeenCalled();
	});
});

it("handles node click event as 'actions'", function() {
	const adapter = new $tw.test.GraphEngine({nodes: {A: {actions: true}}});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("actions");
		expect(graphEvent.objectType).toBe("nodes");
		expect(graphEvent.id).toBe("A");
	});
	adapter.testEvent({
		type: "dblclick",
		componentIndex: 0, componentType: "series", componentSubType: "graph",
		seriesIndex: 0,    seriesType: "graph",     seriesName: "series\u00000",
		dataIndex: 0,      dataType: "node",        data: {id: "A"},
		name: "",
		event: {
			event: {type: "dblclick"} // fill-in for a MouseEvent
		}
	});
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
	adapter.testEvent({
		type: "dblclick",
		componentIndex: 0, componentType: "series", componentSubType: "graph",
		seriesIndex: 0,    seriesType: "graph",     seriesName: "series\u00000",
		dataIndex: 0,      dataType: "edge",        data: {id: "AB", from: "A", to: "B"},
		name: "",
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
	adapter.testEvent({
		type: "mouseover",
		componentIndex: 0, componentType: "series", componentSubType: "graph",
		seriesIndex: 0,    seriesType: "graph",     seriesName: "series\u00000",
		dataIndex: 0,      dataType: "node",        data: {id: "A"},
		name: "",
		event: {
			event: {type: "mouseover"} // fill-in for a MouseEvent
		}
	});
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
	adapter.testEvent({
		type: "mouseover",
		componentIndex: 0, componentType: "series", componentSubType: "graph",
		seriesIndex: 0,    seriesType: "graph",     seriesName: "series\u00000",
		dataIndex: 0,      dataType: "edge",        data: {id: "AB", from: "A", to: "B"},
		name: "",
		event: {
			event: {type: "mouseover"} // fill-in for a MouseEvent
		}
	});
	expect(onevent).toHaveBeenCalledTimes(1);
});

it("handles node blur event", function() {
	const adapter = new $tw.test.GraphEngine({nodes: {A: {blur: true}}});
	var onevent = $tw.test.spyOnEvent(adapter, function(graphEvent, variables) {
		expect(graphEvent.type).toBe("blur");
		expect(graphEvent.objectType).toBe("nodes");
		expect(graphEvent.id).toBe("A");
	});
	adapter.testEvent({
		type: "mouseout",
		componentIndex: 0, componentType: "series", componentSubType: "graph",
		seriesIndex: 0,    seriesType: "graph",     seriesName: "series\u00000",
		dataIndex: 0,      dataType: "node",        data: {id: "A"},
		name: "",
		event: {
			event: {type: "mousemove"} // fill-in for a MouseEvent
		}
	});
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
	adapter.testEvent({
		type: "mouseout",
		componentIndex: 0, componentType: "series", componentSubType: "graph",
		seriesIndex: 0,    seriesType: "graph",     seriesName: "series\u00000",
		dataIndex: 0,      dataType: "edge",        data: {id: "AB", from: "A", to: "B"},
		name: "",
		event: {
			event: {type: "mousemove"} // fill-in for a MouseEvent
		}
	});
	expect(onevent).toHaveBeenCalledTimes(1);
});

});
