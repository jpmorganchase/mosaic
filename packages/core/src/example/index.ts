import express from 'express';
import cors from 'cors';

import PullDocs from '../PullDocs';
import Source from '../Source';
import path from 'path';

const app = express();
const port = 3000;

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

(async () => {
  const pullDocs = new PullDocs(require('../../../../pd.config'));
  const local = await pullDocs.addSource('local', {
    rootDir: path.resolve(process.cwd(), '../../../', 'developer-docs', 'docs')
  });
  const bitbucket = await pullDocs.addSource('bitbucket', {
    credentials: 'r698001:Njc4ODkxNDc0NTgyOj2E8RRlgGRtkmhhQrVaAjo/lB4d'
  });

  pullDocs.onSourceUpdate(async (value, source: Source) => {
    // console.log(
    //   'CHANGE',
    //   (await source.filesystem.readFile('/case-studies/index.mdx')).toString()
    // );
  });

  app.use(cors());

  app.get('/**', async (req, res) => {
    try {
      if (await pullDocs.filesystem.promises.exists(req.path)) {
        const result = String(await pullDocs.filesystem.promises.readFile(req.path));
        res.json(result);
      } else {
        res.status(404).end();
      }
    } catch (e) {
      console.error(e);
      res.status(500).end();
    }
  });
})();
