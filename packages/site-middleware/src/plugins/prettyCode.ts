const options = {
  theme: {
    dark: 'min-dark',
    light: 'min-light'
  },
  keepBackground: false,
  onVisitLine(node) {
    // Prevent lines from collapsing in `display: grid` mode, and
    // allow empty lines to be copy/pasted
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }];
    }
  },
  onVisitHighlightedLine(node) {
    // Each line node by default has `class="line"`.
    node.properties.className.push('highlighted');
  },
  onVisitHighlightedWord(node) {
    // Each word node has no className by default.
    node.properties.className = ['word'];
  }
};

export default options;
