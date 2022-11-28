const path = require('path');
const fs = require('fs');

const publicPath = path.join(process.cwd(), 'src/assets');

const publicImageResolver = {
  name: 'imagePlugin',
  setup(build) {
    build.onResolve({ filter: /^img_/ }, args => ({
      path: path.join(publicPath, args.path)
    }));
    build.onLoad({ filter: /src\/assets\// }, async args => {
      const contents = await fs.promises.readFile(args.path, 'utf8');
      return {
        contents,
        loader: 'dataurl'
      };
    });
  }
};

module.exports = publicImageResolver;
