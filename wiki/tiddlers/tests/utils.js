const Mocks = $tw.modules.applyMethods("testmock");
const ECharts = require('$:/plugins/Gk0Wk/echarts/echarts.min.js');
const GraphEngineModule = function() {};
GraphEngineModule.prototype = $tw.modules.getModulesByTypeAsHashmap("graphengine")["ECharts"];

var test = $tw.test = Object.create(null);

/* Puts ECharts into test mode, such that calls to initialize it will return
 * a mock test object rather than the actual ECharts library.
 * Annoyingly, this can't be passed directly to beforeAll, because Jasmin
 * reads other test suites before it reads the utils.
 */
test.startTestMode = function() {
	spyOn(ECharts, "init").and.callFake(function(element) {
		return Mocks.ECharts.init(element);
	});
};

/* This creates a special test version of the `graphengine` module intended
 * for testing. Tests should access its internals through the getters.
 */
test.GraphEngine = class GraphEngine extends GraphEngineModule {
	constructor(initialObjects, testOptions) {
		super();
		testOptions = testOptions || {};
		this.testElement = testOptions.element || test.createElement("div");
		var options = {window: new Mocks.Window()};
		this.testElement.style.height = testOptions.height;
		this.testElement.style.width = testOptions.width;
		this.init(this.testElement, initialObjects, options);
	}

	get testLast() {
		return this.echarts.lastOption;
	}

	testEvent(payload) {
		this.echarts.dispatchAction(payload);
	}
};

/* This creates an element from the fakeDom, but jazzes it up a little
 * with some extra methods and event handling.
 */
test.createElement = function(tag) {
	var element = $tw.fakeDocument.createElement(tag);
	return $tw.utils.extend(element, Mocks.EventTarget);
};

/* This registers a method with an adapter to be called for events.
 * It also ensures that events match what the adapter's properties describe.
 * Returns a spy which can be used to track onevent calls.
 */
test.spyOnEvent = function(adapter, method) {
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
		expect(property).not.toBeUndefined(`ECharts does not define action property '${graphEvent.type}'`);
		// Compare listed variables with actually passed variables
		var expectedVars = property.variables || [];
		var actualVars = Object.keys(variables || {});
		expect($tw.utils.count(variables)).toBe(expectedVars.length, "Unexpected number of event arguments.");
		$tw.utils.each(expectedVars, function(name) {
			expect(actualVars).toContain(name);
		});
		// Now that everything is kosher, we can actually call our passed method
		if (method) {
			method(graphEvent, variables);
		}
	});
	return spy;
};

