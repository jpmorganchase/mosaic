// Forked from https://observablehq.com/@d3/tree
export function drawTree(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d3: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root: any,
  {
    /**
     * label: given a node d, returns the display name
     */
    label = null,
    /**
     * title: given a node d, returns its hover text
     */
    title = null,
    /**
     * width: outer width, in pixels
     */
    width = 640,
    /**
     * height: outer height, in pixels
     */
    height = undefined,
    /**
     * radius: radius of nodes
     */
    r = 3,
    /**
     * padding: horizontal padding for first and last column
     */
    padding = 1,
    /**
     * fill: fill for nodes
     */
    fill = '#999',
    /**
     * stroke: stroke for links
     */
    stroke = '#555',
    /**
     * strokeWidth: stroke width for links
     */
    strokeWidth = 1.5,
    /**
     * strokeOpacity: stroke opacity for links
     */
    strokeOpacity = 0.4,
    /**
     * strokeLinejoin: stroke line join for links
     */
    strokeLinejoin = undefined,
    /**
     * strokeLinecap: stroke line cap for links
     */
    strokeLinecap = undefined,
    /**
     * halo: color of label halo
     */
    halo = '#fff',
    /**
     * haloWidth: padding around the labels
     */
    haloWidth = 3
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    label?: ((data: any, node: any) => string) | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    title?: ((data: any, node: any) => string) | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    link?: ((data: any, node: any) => string) | null;
    linkTarget?: string;
    width?: number;
    height?: number;
    r?: number;
    padding?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    strokeLinejoin?: string;
    strokeLinecap?: string;
    halo?: string;
    haloWidth?: number;
  } = {}
) {
  // Compute labels and titles.
  const descendants = root.descendants();
  const L = label == null ? null : descendants.map(d => label(d.data, d));

  // Compute the layout.
  const dx = 20;
  const dy = width / (root.height + padding);
  d3.tree().nodeSize([dx, dy])(root);

  // Center the tree.
  let x0 = Infinity;
  let x1 = -x0;
  root.each(d => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  // Compute the default height.
  const computedHeight = height === undefined ? x1 - x0 + dx * 2 : height;

  const svg = d3
    .create('svg')
    .attr('viewBox', [(-dy * padding) / 2, x0 - dx, width, computedHeight])
    .attr('width', width)
    .attr('height', computedHeight)
    .attr('style', 'max-width: 100%; height: auto; overflow: visible;')
    .attr('font-family', 'sans-serif')
    .attr('font-size', 10);

  svg
    .append('g')
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-opacity', strokeOpacity)
    .attr('stroke-linecap', strokeLinecap)
    .attr('stroke-linejoin', strokeLinejoin)
    .attr('stroke-width', strokeWidth)
    .selectAll('path')
    .data(root.links())
    .join('path')
    .attr(
      'd',
      d3
        .linkHorizontal()
        .x(d => d.y)
        .y(d => d.x)
    );

  const node = svg
    .append('g')
    .selectAll('a')
    .data(root.descendants())
    .join('a')
    .attr('transform', d => `translate(${d.y},${d.x})`);

  node
    .append('circle')
    .attr('fill', d => (d.children ? stroke : fill))
    .attr('r', r);

  if (title != null) node.append('title').text(d => title(d.data, d));

  if (L) {
    node
      .append('text')
      .attr('dy', '0.32em')
      .attr('x', d => (d.children ? -6 : 6))
      .attr('text-anchor', d => (d.children ? 'end' : 'start'))
      .attr('paint-order', 'stroke')
      .attr('stroke', halo)
      .attr('stroke-width', haloWidth)
      .text((_d, i) => L[i])
      .on('click', (_event, { data }) => window.open(data.link, '_blank'))
      .style('cursor', 'pointer');
  }
  return svg;
}
