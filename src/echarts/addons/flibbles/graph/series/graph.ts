export const name = "graph";

export function update(objects: GraphObjects) {
	const series = {};
	const self = this;
	let type = "graph";
	if (objects.graph) {
		series.type = "graph";
		// We need to set this manually in all cases because we
		// use a different default from what echarts would use.
		// Physics defaults to "on", because vis-network did.
		series.layout = objects.graph.physics === false? "none": "force";
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
				}
				if (n.y !== undefined) {
					cleaned.y = n.y;
				}
				if (self.shape2symbol[n.shape]) {
					cleaned.symbol = self.shape2symbol[n.shape];
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
			});
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

function merge(entries, updates) {
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
