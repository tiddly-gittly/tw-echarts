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
		if (this.layout === "force" && series.layout === "none") {
			// TODO: Possible problem if no nodes existed
			// We're switching out of physics. We'll need to record
			// the locations of all nodes so we can preserve their
			// current locations
			var seriesGraph = this.echarts.getModel().getSeriesByIndex(0).getGraph();
			for (var id in this.data) {
				const node = seriesGraph.getNodeById(id);
				this.backupLayout[id] = node.getLayout();
			}
			// We'll need to resubmit the nodes with their backup locations
			objects.nodes = objects.nodes || Object.create(null);
		}
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
	if (objects.nodes || objects.edges) {
		if (objects.nodes) {
			var data = merge(this.data, objects.nodes);
			data.sort((a,b) => a.x - b.x);
			series.data = data.map(function(n) {
				var cleaned = { id: n.id };
				if (n.x !== undefined) {
					cleaned.x = n.x;
				} else if (this.layout === "none") {
					// We need a backup location
					var coords = this.backupLayout[n.id];
					if (coords) {
						cleaned.x = coords[0];
					}
				}
				if (n.y !== undefined) {
					cleaned.y = n.y;
				} else if (this.layout === "none") {
					// We need a backup location
					var coords = this.backupLayout[n.id];
					if (coords) {
						cleaned.y = coords[1];
					}
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
		}
		if (objects.edges) {
			var links = merge(this.links, objects.edges);
			series.links = links.map(function(l) {
				const cleaned = {source: l.from, target: l.to};
				if (l.label !== undefined) {
					cleaned.id = l.label;
					cleaned.label = {show: true};
				}
				return cleaned;
			});
		}
	}
	return series;
};

function merge(entries: object, updates: object) {
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
