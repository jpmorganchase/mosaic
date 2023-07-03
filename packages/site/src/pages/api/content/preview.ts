import { compileMDX } from '@jpmorganchase/mosaic-site-middleware';
import type { NextApiRequest, NextApiResponse } from 'next';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { body } = req;
    let compiledMdx;
    try {
      if (body.mode === 'markdown') {
        compiledMdx = await compileMDX(body.text, false /** don't parse frontmatter */);
      }
    } catch (ex: unknown) {
      return res
        .status(200)
        .json({ source: null, error: 'compilation error', exception: getErrorMessage(ex) });
    }
    return res.status(200).json({ source: compiledMdx });
  } catch (ex) {
    return res.status(500).send(getErrorMessage(ex));
  }
}
