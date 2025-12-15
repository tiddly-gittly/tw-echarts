export const name = "graph";
import { Shape2symbol } from '../utils.js';

export function init(echarts): void {
	this.data = Object.create(null);
	this.links = Object.create(null);
	this.backupLayout = Object.create(null);
	this.echarts = echarts;
};

export function update(objects: GraphObjects): void {
	const series = {};
	if (objects.graph) {
		series.type = "graph";
		// We need to set this manually in all cases because we
		// use a different default from what echarts would use.
		// Physics defaults to "on", because vis-network did.
		series.layout = objects.graph.physics === false? "none": "force";
		this.layout = series.layout;
		series.force = {
			repulsion: 60,
			edgeLength: 2,
			gravity: 0.1
		};
		series.draggable = true;
		// The graph can always roam, at least for now.
		// Perhaps there will be a <$plot> setting for this,
		// but this is not controlled by <$graph>.
		series.roam = true;
		// If we don't have this, then mouse events on the graph outside
		// of a hypothetical bounding-box around the nodes won't work.
		series.roamTrigger = "global";
	}
	const data = merge(this.data, objects.nodes || {})
		.sort((a,b) => a.x - b.x)
		.map(function(n) {
			var cleaned = { id: n.id };
			if (n.x !== undefined) {
				cleaned.x = n.x;
			}
			if (n.y !== undefined) {
				cleaned.y = n.y;
			}
			if (Shape2symbol[n.shape]) {
				cleaned.symbol = Shape2symbol[n.shape];
			}
			if (n.image) {
				cleaned.symbol = `image://${n.image}`;
			}
			if (n.physics !== undefined) {
				cleaned.fixed = n.physics !== true;
			}
			if (n.label !== undefined) {
				cleaned.name = n.label;
				cleaned.label = {show: true, position: "bottom"};
			}
			if (n.color !== undefined) {
				cleaned.itemStyle = {color: n.color};
			}
			return cleaned;
		}, this);
	if (series.layout === "none") {
		// TODO: Possible problem if no nodes existed
		// We're switching out of physics. We'll need to record
		// the locations of all nodes so we can preserve their
		// current locations
		populateCoordinates(data, this.echarts);
	}
	if (data.length > 0) {
		series.data = data;
	}
	if (objects.edges) {
		series.links = createLinks(this.links, objects.edges);
	}
	return series;
};

function createLinks(oldLinks: object, newLinks: object) {
	var links = merge(oldLinks, newLinks);
	return links.map(function(l) {
		const cleaned = {source: l.from, target: l.to};
		if (l.label !== undefined) {
			cleaned.id = l.label;
			cleaned.label = {show: true};
		}
		return cleaned;
	});
}

function populateCoordinates(data: object[], echarts) {
	const model = echarts.getModel();
	var seriesGraph
	if (model) {
		seriesGraph = model.getSeriesByIndex(0).getGraph();
	} else {
		// We don't have a model yet, so no nodes will have an actual
		// location in that model.
		seriesGraph = { getNodeById: () => ({getLayout: () => undefined}) };
	}
	const length = data.length;
	for (var index = 0; index < length; index++) {
		const node = data[index];
		if (node.x === undefined || node.y === undefined) {
			const modelNode = seriesGraph.getNodeById(node.id);
			var coords = modelNode.getLayout() || startPosition(index, length);
			//this.backupLayout[node.id] = coords;
			node.x = coords[0];
			node.y = coords[1];
		}
	}
};

function merge(entries: object, updates: object) : object[] {
	for (var id in updates) {
		var update = updates[id];
		if (update) {
			update.id = id;
			entries[id] = update;
		} else { // Must be null, thus a deletion
			entries[id] = undefined;
		}
	}
	var output = [];
	for (var id in entries) {
		if (entries[id]) {
			output.push(entries[id]);
		}
	}
	return output;
};

/**ECharts has its own way to initially place nodes in a circle, but
 * we use our own. Why?
   * Ours doesn't fix the nodes in place, so users can move them off the circle.
   * Ours doesn't glitch out when count <= 1.
   * Ours can handle a mix of specified and unspecified node locations.
 * Honestly, physics and layout seem like afterthoughts in ECharts.
 */
function startPosition(n, count) {
	const segment = 2 * Math.PI / count;
	const radian = (n + 0.5) * segment;
	return [
		Math.round(Math.cos(radian)*100)/100,
		Math.round(Math.sin(radian)*100)/-100];
};
