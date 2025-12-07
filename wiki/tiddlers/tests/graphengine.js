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

it('handles physics', function() {
	const adapter = new $tw.test.GraphEngine({nodes: {A: {}}});
	// physics is enabled by default
	expect(adapter.testLast.series[0].layout).toBe("force");
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
	// disable zooming
	adapter.update({graph: {zoom: false}});
	expect(adapter.testLast.series[0].roam).toBe(false);
});

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
		{source: "A", target: "B"},
		{source: "A", target: "C"},
		{source: "B", target: "C"}]);
	// Now let's remove an edge
	adapter.update({edges: {AB: null}});
	expect(adapter.testLast.series[0].links).toEqual([
		{source: "A", target: "C"},
		{source: "B", target: "C"}]);
});

});
