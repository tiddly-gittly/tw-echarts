const Mocks = $tw.modules.applyMethods("testmock");
const ECharts = require('$:/plugins/Gk0Wk/echarts/echarts.min.js');
const Adapter = $tw.modules.getModulesByTypeAsHashmap("graphengine")["ECharts"];

describe('graphengine tests', function() {

beforeAll(function() {
	spyOn(ECharts, "init").and.callFake(function() {
		return Mocks.ECharts.init();
	});
});

// Creates a temporary element for the adapter to build off of.
// No need to pull TiddlyWiki's parser into these tests.
function newAdapter(objects) {
	const adapter = Object.create(Adapter);
	adapter.init($tw.fakeDocument.createElement("div"), objects, {window: new Mocks.Window()});
	return adapter;
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
	adapter.update({graph: {physics: false}});
	expect(adapter.echarts.lastOption).toEqual({series: [{layout: "none"}]});
});

});
