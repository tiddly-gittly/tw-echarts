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
function element() {
	return $tw.fakeDocument.createElement("div");
};

it('handles an entirely empty graph', function() {
	const adapter = Adapter.init(element(), {}, {window: new Mocks.Window()});
});

});
