/*\

Physics is complicated enough in echarts that we need our own test suite for
it.

\*/

describe('physics', function() {

beforeAll(() => $tw.test.startTestMode() );

beforeEach(function() {
	jasmine.addMatchers($tw.test.customMatchers);
});

/*** Physics ***/

it('handles graph physics', function() {
	const adapter = new $tw.test.GraphEngine({nodes: {A: {}}});
	// physics is disabled by default
	expect(adapter.testLast.series[0].layout).toBe("none");
	// graph must be set to draggable if it's to be manipulated at all
	expect(adapter.testLast.series[0].draggable).toBe(true);
	// enable the physics and make sure it takes
	adapter.update({graph: {physics: true}});
	expect(adapter.testLast.series[0].layout).toBe("force");
	// unset it and make sure that resets the physics to ON
	adapter.update({graph: {}});
	expect(adapter.testLast.series[0].layout).toBe("none");
	// explicitly disable it and make sure that takes too
	adapter.update({graph: {physics: false}});
	expect(adapter.testLast.series[0].layout).toBe("none");
});

it("can handle physics for one fixed node of unspecified location", function() {
	const adapter = new $tw.test.GraphEngine({nodes: {
		A: {},
		B: {},
		C: {physics: false},
		D: {}, E: {}, F:{}}}, {width: 350, height: 750});
	const data = adapter.testLast.series[0].data;
	const box = $tw.test.getBoundingBox(data);
	// This dynamic graph should be centered on the origin, and the
	// fixed node should be there.
	expect(box.origin).toEqual([0,0]);
	expect(data[2].x).toBe(0);
	expect(data[2].y).toBe(0);
	// The spread needs to be close to the viewport dimensions so we can
	// actually see everything.
	expect(box.width).toBeBetween(100, 130);
	expect(box.height).toBeBetween(100, 130);
});

/*** No physics ***/

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
	// were.
	// We handle this by ignoring all physics set up and completely organizing
	// all nodes. Not how vis-network does it, but it will be how echarts does.
	const adapter = new $tw.test.GraphEngine(
		{graph: {}, nodes: {A:{}, B:{}}},
		{width: 500});
	// Then we turn off physics and keep those locations.
	adapter.update({graph: {physics: false}});
	const box = $tw.test.getBoundingBox(adapter.testLast.series[0].data);
	expect(box.origin).toEqual([0,0]);
	expect(Math.max(box.width, box.height)).toBeBetween(60, 80);
});

it("can start into no-physics and initially place nodes", function() {
	const adapter = new $tw.test.GraphEngine({
		graph: {physics: false},
		nodes: {A: {}, B: {}, C: {}, D: {}}}, {width: 38});
	var data = adapter.testLast.series[0].data;
	var box = $tw.test.getBoundingBox(data);
	expect(box.origin).toEqual([0,0]);
	expect(box.width).toBeBetween(60, 80);
	// It can move some nodes around, and the other nodes will keep still
	adapter.update({nodes: {B: {x: 20, y: 20}}});
	data = adapter.testLast.series[0].data;
	box = $tw.test.getBoundingBox(data);
	expect(box.origin).toEqual([0,0]);
	expect(box.width).toBeBetween(60, 80);
});

it("a single static non-fixed node gets placed at the origin", function() {
	const adapter = new $tw.test.GraphEngine({
		graph: {physics: false},
		nodes: {A: {}}},
		{width: 1000, height: 1000});
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "A", x: 0, y: 0}]);
	// If one is added, then it starts spreading things out.
	adapter.update({nodes: {B: {}}});
	const data = adapter.testLast.series[0].data;
	const box = $tw.test.getBoundingBox(data);
	expect(Math.max(box.width, box.height)).toBeBetween(60, 100);
	// If some are placed, it does not reset the origin.
	const Anode = data[0];
	// The new location of node A should be somewhere besides the origin now
	expect(Anode.x || Anode.y).not.toBe(0);
	adapter.update({nodes: {B: {x: 14, y: 13}}});
	expect(adapter.testLast.series[0].data).toEqual([
		{id: "A", x: Anode.x, y: Anode.y},
		{id: "B", x: 14, y: 13}]);
});

it("can mix fixed and non-fixed when initializing static graphs", function() {
	const adapter = new $tw.test.GraphEngine({
		graph: {physics: false},
		nodes: {A: {}, B: {x: 1500, y: -1600}}},
			{width: 720, height: 400});
	const box = $tw.test.getBoundingBox(adapter.testLast.series[0].data);
	expect(box.origin[0]).toBeBetween(1450, 1550);
	expect(box.origin[1]).toBeBetween(-1550, -1650);
	expect(Math.max(box.width, box.height)).toBeBetween(10, 50);
});

/*** Initial viewport ***/

function range(count) {
	return Object.fromEntries([...Array(count).keys()].map(n => ["N"+n, {}]));
};

it("can place 20 nodes and decently frame them", function() {
	const adapter = new $tw.test.GraphEngine({ nodes: range(20) });
	const data = adapter.testLast.series[0].data;
	const box = $tw.test.getBoundingBox(data);
	expect(box.origin).toEqual([0,0]);
	expect(box.width).toBeBetween(200, 250);
});

});
