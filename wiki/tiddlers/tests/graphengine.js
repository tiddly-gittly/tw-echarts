describe('graphengine module', function() {

beforeAll(() => $tw.test.startTestMode() );

it('handles empty graph getting filled', function() {
	const adapter = new $tw.test.GraphEngine({anything: "anything"});
	expect(adapter.testLast.series[0].data).toBeUndefined();
	adapter.update({nodes: { newNode: {}} });
	// With such a minimal set of info to update,
	// we should be able to exactly match the passed "option".
	expect(adapter.testLast.series[0].data).toEqual([{id: "newNode"}]);
});

it('preserves and puts pre-existing DOM nodes after canvas', function() {
	const outer = $tw.test.createElement("div");
	const inner1 = $tw.test.createElement("span");
	const inner2 = $tw.test.createElement("span");
	inner1.attributes.id = "inner1";
	inner2.attributes.id = "inner2";
	outer.appendChild(inner1);
	outer.appendChild(inner2);
	const adapter = new $tw.test.GraphEngine({}, {element: outer});
	expect(outer.childNodes.length).toBe(3);
	expect(outer.childNodes[1].attributes.id).toBe("inner1");
	expect(outer.childNodes[2].attributes.id).toBe("inner2");
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

});
