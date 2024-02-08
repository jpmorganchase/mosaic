// Originally forked from https://observablehq.com/@d3/tree
import styles from './styles.css';

export default function drawTree(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d3: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root: any,
  {
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
    radius = 3,
    /**
     * padding: horizontal padding for first and last column
     */
    padding = 1
  }: {
    width?: number;
    height?: number;
    radius?: number;
    padding?: number;
  } = {}
) {
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
    .attr('class', styles.tree);

  svg
    .append('g')
    .attr('class', styles.line)
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
    .attr('class', d => (d.children ? styles.nodeParent : styles.nodeChild))
    .attr('r', radius);
  node
    .append('text')
    .attr('class', styles.link)
    .attr('dy', '0.32em')
    .attr('x', d => (d.children ? -6 : 6))
    .attr('text-anchor', d => (d.children ? 'end' : 'start'))
    .style('cursor', 'pointer')
    .text(({ data }) => data.label)
    .on('click', (_event, { data }) => window.open(data.link, '_blank'));

  return svg;
}
