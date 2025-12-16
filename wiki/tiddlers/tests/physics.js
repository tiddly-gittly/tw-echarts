/*\

Physics is complicated enough in echarts that we need our own test suite for
it.

\*/

describe('physics', function() {

beforeAll(() => $tw.test.startTestMode() );

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

it('handles no graph physics too', function() {
	const adapter = new $tw.test.GraphEngine({graph: {physics: false}, nodes: {A: {}}});
	expect(adapter.testLast.series[0].layout).toBe("none");
	// The graph should be draggable even though physics is off
	expect(adapter.testLast.series[0].draggable).toBe(true);
});

it("can switch from physics to no physics without losing nodes", function() {
	// ECharts has a problem where nodes without physics or coordinates
	// won't actually show up. Which means turning off physics might make
	// some already-placed nodes disappear, or snap back to where they
	// were. We handle this by inserting fill-in coordinates.
	const adapter = new $tw.test.GraphEngine({graph: {}, nodes: {A:{}, B:{}}});
	// At this point, ECharts will simulate the nodes a bit and place them.
	spyOn(adapter.echarts.getModel().getSeriesByIndex(0).getGraph(), "getNodeById").and.callFake(function(id) {
		return {
			getLayout: () => ({A: [3,4], B: [5,6]})[id],
			setLayout: function() {}
		};
	});
	// Then we turn off physics and keep those locations.
	adapter.update({graph: {physics: false}});
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "A", x: 3, y: 4},
		{id: "B", x: 5, y: 6}]);
});

it("can start into no-physics and initially place nodes", function() {
	const adapter = new $tw.test.GraphEngine({
		graph: {physics: false},
		nodes: {A: {}, B: {}, C: {}, D: {}}});
	const r = Math.round(Math.sqrt(2)/2*40*100)/100;
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "A", x: +r, y: -r},
		{id: "B", x: -r, y: -r},
		{id: "C", x: -r, y: +r},
		{id: "D", x: +r, y: +r}]);
	// It can move some nodes around, and the other nodes will keep still
	adapter.update({nodes: {B: {x: 5, y: 6}, D: {x: 7, y: 8}}});
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "A", x: +r, y: -r},
		{id: "B", x: 5, y: 6},
		{id: "C", x: -r, y: +r},
		{id: "D", x: 7, y: 8}]);
});

});
