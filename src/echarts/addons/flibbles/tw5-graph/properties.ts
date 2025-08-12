export interface NodeObject {
  id?: string;
  x?: number;
  y?: number;
  label?: string;
  color?: string;
  size?: number;
  shape?: string;
  image?: string;
  category?: number;
  hidden?: boolean;
  physics?: boolean;
  borderColor?: string;
  borderWidth?: number;
  fontColor?: string;
  circular?: boolean;
  draggable?: boolean;
  symbol?: string;
  symbolSize?: number | number[];
  itemStyle?: any;
  value?: number | number[];
  symbolRotate?: number;
  symbolKeepAspect?: boolean;
  symbolOffset?: number[];
  emphasis?: any;
}

export interface EdgeObject {
  id?: string;
  from?: string;
  to?: string;
  label?: string;
  color?: string;
  arrows?: string;
  dashes?: boolean;
  hidden?: boolean;
  smooth?: any;
  roundness?: number;
  width?: number;
  physics?: boolean;
}
/**
 * TW5-Graph IR Object pass-in from `init` and `update`, `update` will only get partial changed data.
 */
export interface GraphObjects {
  graph?: {
    physics?: boolean;
    centralGravity?: number;
    damping?: number;
    gravitationalConstant?: number;
    springConstant?: number;
    springLength?: number;
    maxVelocity?: number;
    hideControls?: boolean;
    addNode?: any;
    addEdge?: any;
    doubleclick?: any;
    navigation?: boolean;
    hierarchy?: boolean;
    hierarchyDirection?: string;
    hierarchyNodeSpacing?: number;
    zoom?: boolean;
    focus?: any;
    blur?: any;
    background?: string;
    manipulation?: any;
  };
  nodes?: Record<string, NodeObject>;
  edges?: Record<string, EdgeObject>;
}

export const properties = {
  graph: {
    physics: { type: 'boolean', default: true },
    centralGravity: { type: 'number', default: 0.3 },
    damping: { type: 'number', default: 0.09 },
    gravitationalConstant: { type: 'number', default: -2000 },
    springConstant: { type: 'number', default: 0.04 },
    springLength: { type: 'number', default: 95 },
    maxVelocity: { type: 'number', default: 50 },
    hideControls: { type: 'boolean', default: false },
    addNode: { type: 'actions', variables: ['x', 'y'] },
    addEdge: { type: 'actions', variables: ['fromTiddler', 'toTiddler'] },
    doubleclick: { type: 'actions', variables: ['x', 'y', 'xView', 'yView'] },
    navigation: { type: 'boolean' },
    hierarchy: { type: 'boolean', default: false },
    hierarchyDirection: {
      type: 'enum',
      default: 'UD',
      values: ['UD', 'DU', 'LR', 'RL'],
    },
    hierarchyNodeSpacing: { type: 'number', default: 100 },
    zoom: { type: 'boolean', default: true },
    focus: { type: 'actions' },
    blur: { type: 'actions' },
    background: { type: 'image' },
    manipulation: { type: 'object' },
  },
  nodes: {
    id: { type: 'string' },
    x: { type: 'number' },
    y: { type: 'number' },
    label: { type: 'string' },
    color: { type: 'color', default: '#D2E5FF' },
    size: { type: 'number', default: 25 },
    shape: { type: 'string' },
    image: { type: 'image' },
    category: { type: 'number' },
    hidden: { type: 'boolean' },
    physics: { type: 'boolean' },
    borderColor: { type: 'color', default: '#2B7CE9' },
    borderWidth: { type: 'number', default: 1 },
    fontColor: { type: 'color', default: '#343434' },
    circular: { type: 'boolean', default: false },
  },
  edges: {
    id: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    label: { type: 'string' },
    color: { type: 'color' },
    arrows: { type: 'string' },
    dashes: { type: 'boolean' },
    hidden: { type: 'boolean' },
    smooth: { type: 'object' },
    roundness: { type: 'number' },
    width: { type: 'number' },
    physics: { type: 'boolean' },
  },
};
