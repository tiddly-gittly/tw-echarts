const Mocks = $tw.modules.applyMethods("testmock");
const ECharts = require('$:/plugins/Gk0Wk/echarts/echarts.min.js');
const Adapter = $tw.modules.getModulesByTypeAsHashmap("graphengine")["ECharts"];

describe('graphengine tests', function() {

beforeAll(function() {
	spyOn(ECharts, "init").and.callFake(function(element) {
		return Mocks.ECharts.init(element);
	});
});

// Creates a temporary element for the adapter to build off of.
// No need to pull TiddlyWiki's parser into these tests.
function newAdapter(objects) {
	const adapter = Object.create(Adapter);
	var element = $tw.fakeDocument.createElement("div");
	$tw.utils.extend(element, Mocks.EventTarget);
	adapter.init(element, objects, {window: new Mocks.Window()});
	return adapter;
};

// This ensure that the called event matches up with what the adapter says it
// invokes.
function spyOnevent(adapter, fake) {
	var properties = adapter.properties;
	// First, we need to make an onevent to spy on.
	adapter.onevent = function() {};
	var spy = spyOn(adapter, "onevent").and.callFake(function(graphEvent, variables) {
		// Make sure we have a category for this object type
		var category = properties[graphEvent.objectType];
		expect(category).not.toBeUndefined("ObjectType: " + graphEvent.objectType);
		// If it's not a graph objectType, it must have an Id
		if (graphEvent.objectType !== "graph") {
			expect(graphEvent.id).not.toBeUndefined("Id");
		}
		// Make sure the specific action is listed
		var property = category[graphEvent.type];
		expect(property).not.toBeUndefined(`Vis does not define action property '${graphEvent.type}'`);
		// Compare listed variables with actually passed variables
		var expectedVars = property.variables || [];
		var actualVars = Object.keys(variables || {});
		expect($tw.utils.count(variables)).toBe(expectedVars.length, "Unexpected number of event arguments.");
		$tw.utils.each(expectedVars, function(name) {
			expect(actualVars).toContain(name);
		});
		// Now that everything is kosher, we can actually call our passed method
		if (fake) {
			fake(graphEvent, variables);
		}
	});
	return spy;
};

xit('handles empty graph getting filled', function() {
	const adapter = newAdapter({});
	expect(adapter.echarts.lastOption.series).toBeUndefined();
	adapter.update({nodes: { newNode: {}} });
	// With such a minimal set of info to update,
	// we should be able to exactly match the passed "option".
	expect(adapter.echarts.lastOption).toEqual({
		series: [{
			type: "graph",
			layout: "force",
			data: [{id: "newNode"}]
		}]
	});
});

it('handles physics', function() {
	const adapter = newAdapter({nodes: {A: {}}});
	// physics is enabled by default
	expect(adapter.echarts.lastOption.series[0].layout).toBe("force");
	// disable the physics and make sure it takes
	adapter.update({graph: {physics: false}});
	expect(adapter.echarts.lastOption.series[0].layout).toBe("none");
	// unset it and make sure that resets the physics to ON
	adapter.update({graph: {}});
	expect(adapter.echarts.lastOption.series[0].layout).toBe("force");
	// re-enable it and make sure that takes too
	// I might want to change this later to not expect a new update.
	// That would prevent the hiccup that echarts shows, but that kind
	// of smoothness might require too complicated an interface.
	adapter.update({graph: {physics: true}});
	expect(adapter.echarts.lastOption.series[0].layout).toBe("force");
});

it('handles zoom', function() {
	const adapter = newAdapter({nodes: {A: {}}});
	// zooming, or as echarts calls it, zooming, is enabled by default
	expect(adapter.echarts.lastOption.series[0].roam).toBe(true);
	// disable zooming
	adapter.update({graph: {zoom: false}});
	expect(adapter.echarts.lastOption.series[0].roam).toBe(false);
});

// Make sure the graph can emit both focus and blur on the whole graph itself
$tw.utils.each(["focus", "blur"], function(type) {
	it(`handles graph ${type} event`, function() {
		const adapter = newAdapter({graph: {[type]: true}});
		var onevent = spyOnevent(adapter, function(graphEvent, variables) {
			expect(graphEvent.type).toBe(type);
			expect(graphEvent.objectType).toBe("graph");
		});
		var element = adapter.echarts.getDom();
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
