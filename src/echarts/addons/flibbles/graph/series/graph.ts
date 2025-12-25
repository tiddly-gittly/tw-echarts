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
	const graph = objects.graph;
	if (graph) {
		series.type = "graph";
		// We need to set this manually in all cases because we
		// use a different default from what echarts would use.
		// Physics defaults to "on", because vis-network did.
		series.layout = objects.graph.physics === false? "none": "force";
		this.layout = series.layout;
		series.force = {
			repulsion: graph.repulsion ?? 50,
			edgeLength: graph.edgeLength ?? 30,
			gravity: graph.gravity ?? 0.1,
			friction: graph.friction ?? 0.6
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
	const data = createData(this.data, objects.nodes || {});
	if (!this.boundingBox) {
		this.boundingBox = getBoundingBox(data, this.echarts);
	}
	// echarts works a lot better if we always place nodes, so any unassigned
	// nodes get placed, regardless of physics or static.
	placeNodes.call(this, data, this.echarts);
	if (data.length > 0) {
		series.data = data;
	}
	if (objects.edges) {
		series.links = createLinks(this.links, objects.edges);
	}
	return series;
};

function createData(oldNodes, newNodes) {
	return merge(oldNodes, newNodes || {})
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
			if (n.size !== undefined) {
				cleaned.symbolSize = n.size;
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
};

function createLinks(oldLinks: object, newLinks: object) {
	var links = merge(oldLinks, newLinks);
	return links.map(function(l) {
		const cleaned = {source: l.from, target: l.to};
		if (l.label !== undefined) {
			cleaned.id = l.label;
			cleaned.label = {show: true};
		}
		switch (l.arrows) {
			case "from":
				cleaned.symbol = ["arrow", null];
				break;
			case "to":
				cleaned.symbol = [null, "arrow"];
		}
		if (l.physics === false) {
			cleaned.ignoreForceLayout = true;
		}
		const lineStyle = {};
		if (l.color !== undefined) {
			lineStyle.color = l.color;
		}
		switch (l.stroke) {
			case "dashed":
			case "dotted": // dotted is a little hard to see at width 1.
				lineStyle.type = l.stroke;
		}
		if (l.width !== undefined) {
			lineStyle.width = l.width;
		}
		if (l.roundness) {
			lineStyle.curveness = l.roundness;
		}
		// If we actually set anything in lineStyle,
		// then we need to attach it to our line.
		for (var anything in lineStyle) {
			cleaned.lineStyle = lineStyle;
			break;
		}
		return cleaned;
	});
}

/**ECharts has its own way to initially place nodes in a circle, but
 * we use our own. Why?
   * Ours doesn't fix the nodes in place, so users can move them off the circle.
   * Ours doesn't glitch out when count <= 1.
   * Ours can handle a mix of specified and unspecified node locations.
 * Honestly, physics and layout seem like afterthoughts in ECharts.
 *
 * Right now, it spreads the nodes out by 10*count, but maybe it should just
 * be something like 100? It must be spread out some to prevent edge artifacts.
 */
function placeNodes(data, echarts) {
	const count = data.length;
	const radius = Math.sqrt(count) * 25;
	var fixedPlaced = false;
	for (var index = 0; index < count; index++) {
		const node = data[index];
		if (node.x === undefined || node.y === undefined) {
			if (!fixedPlaced && node.fixed) {
				// If there is one node indicated to be fixed in place
				node.x = this.boundingBox.origin[0];
				node.y = this.boundingBox.origin[1];
				fixedPlaced = true;
			} else {
				const coords = startPosition(index, this.boundingBox, radius, count);
				node.x = coords[0];
				node.y = coords[1];
			}
		}
	}
};

function startPosition(n, box, radius, count) {
	if (count <= 1) {
		// Special case. Gets placed at origin.
		return [0,0];
	}
	const segment = 2 * Math.PI / count;
	const radian = (n + 0.5) * segment;
	return [
		Math.round(Math.cos(radian)*100*radius)/100 + box.origin[0],
		Math.round(Math.sin(radian)*100*radius)/-100 + box.origin[1]];
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

/**This gets us an appropriate bounding box to fill out given the set of
 * nodes that we've got.
 * You'd think ECharts would do this for us, but it can't if static graphs
 * don't have all nodes with specified locations, or dynamic nodes where
 * They ALL have specified locations.
 * ECharts really wasn't meant for free form graphs...
 */
function getBoundingBox(data, echarts) {
	const box = {width: 0, height: 0};
	for (var index = 0; index < data.length; index++) {
		const node = data[index];
		if (node.x !== undefined) {
			if (box.x === undefined) {
				box.x = node.x;
			} else {
				const diff = node.x - box.x;
				if (diff < 0) {
					box.width -= diff;
					box.x = node.x;
				} else if (diff > box.width) {
					box.width = diff;
				}
			}
		}
		if (node.y !== undefined) {
			if (box.y === undefined) {
				box.y = node.y;
			} else {
				const diff = node.y - box.y;
				if (diff < 0) {
					box.height -= diff;
					box.y = node.y;
				} else if (diff > box.height) {
					box.height = diff;
				}
			}
		}
	}
	if (box.x === undefined) {
		box.x = 0;
	}
	if (box.y === undefined) {
		box.y = 0;
	}
	if (box.width <= 2 && box.height <= 2) {
		// This box is too small to be useful.
		// Most likely, we have only 1 node.
		// We'll expand to fill our viewbox instead.
		box.width = box.height = Math.sqrt(data.length) * 25;
		const r2 = box.width * box.height;
		if((box.x*box.x <= r2)
		&& (box.y*box.y <= r2)) {
			// That singular node is close to the origin. Let's
			// frame around the origin to give that dot better context.
			box.x = box.y = 0;
		}
		box.x -= box.width/2;
		box.y -= box.height/2;
	}
	box.origin = [
			box.x + box.width/2,
			box.y + box.height/2];
	return box;
};
