export interface GraphObjects {
  graph?: {
    physics?: boolean;
    zoom?: boolean;
    background?: string;
    layout?: string;
    focus?: any;
    blur?: any;
    navigation?: boolean;
    hierarchy?: boolean;
    addNode?: any;
    addEdge?: any;
    graphColor?: string;
    nodeColor?: string;
    fontColor?: string;
    repulsion?: number;
    springLength?: number;
    centralGravity?: number;
    [key: string]: any;
  };
  nodes?: Record<
    string,
    {
      x?: number;
      y?: number;
      label?: string;
      color?: string;
      size?: number;
      hidden?: boolean;
      image?: string;
      physics?: boolean;
      fontColor?: string;
      shape?: string;
      circular?: string | boolean;
      doubleclick?: boolean | any;
      free?: boolean | any;
      delete?: boolean | any;
      hover?: boolean | any;
      blur?: boolean | any;
      drag?: boolean | any;
    }
  >;
  edges?: Record<
    string,
    {
      from: string;
      to: string;
      label?: string;
      color?: string;
      dashes?: string | boolean;
      roundness?: string | number;
      smooth?: string | boolean;
      doubleclick?: boolean | any;
      delete?: boolean | any;
      hover?: boolean | any;
      blur?: boolean | any;
      drag?: boolean | any;
      free?: boolean | any;
    }
  >;
}

export const properties = {
  graph: {
    physics: { type: 'boolean', default: true },
    zoom: { type: 'boolean', default: true },
    background: { type: 'image' },
    layout: {
      type: 'enum',
      values: ['force', 'circular', 'none'],
      default: 'force',
    },
    focus: { type: 'actions' },
    blur: { type: 'actions' },
    navigation: { type: 'boolean', default: false },
    hierarchy: { type: 'boolean', default: false },
    addNode: { type: 'actions', variables: ['x', 'y'] },
    addEdge: { type: 'actions', variables: ['fromTiddler', 'toTiddler'] },
  },
  nodes: {
    x: { type: 'number' },
    y: { type: 'number' },
    label: { type: 'string' },
    color: { type: 'color', default: '#D2E5FF' },
    size: { type: 'number', default: 25 },
    hidden: { type: 'boolean' },
    image: { type: 'image' },
    physics: { type: 'boolean' },
    delete: { type: 'actions' },
    doubleclick: { type: 'actions', variables: ['x', 'y', 'xView', 'yView'] },
    hover: { type: 'actions', variables: ['x', 'y', 'xView', 'yView'] },
    blur: { type: 'actions' },
    drag: { type: 'actions', variables: ['x', 'y'] },
    free: { type: 'actions', variables: ['x', 'y'] },
    shape: {
      type: 'enum',
      values: [
        'circle',
        'rect',
        'roundRect',
        'triangle',
        'diamond',
        'pin',
        'arrow',
      ],
    },
  },
  edges: {
    from: { type: 'string' },
    to: { type: 'string' },
    label: { type: 'string' },
    color: { type: 'color' },
    delete: { type: 'actions' },
    doubleclick: { type: 'actions', variables: ['x', 'y', 'xView', 'yView'] },
    hover: { type: 'actions', variables: ['x', 'y', 'xView', 'yView'] },
    blur: { type: 'actions' },
    drag: { type: 'actions', variables: ['x', 'y'] },
    free: { type: 'actions', variables: ['x', 'y'] },
  },
};
