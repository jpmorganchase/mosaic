const options = {
  theme: {
    dark: 'dark-plus',
    light: 'light-plus'
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
  onVisitHighlightedWord(node, id) {
    node.properties.className = ['word'];
    if (id) {
      // If the word spans across syntax boundaries (e.g. punctuation), remove
      // colors from the child nodes.
      if (node.properties['data-rehype-pretty-code-wrapper']) {
        node.children.forEach(childNode => {
          childNode.properties.style = '';
        });
      }

      node.properties.style = '';
      node.properties['data-word-id'] = id;
    }
  }
};

export default options;
