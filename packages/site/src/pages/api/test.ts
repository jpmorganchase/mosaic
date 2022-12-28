import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(_request: NextApiRequest, response: NextApiResponse) {
  response.setHeader('Content-Type', 'application/json');
  response.status(200).json({ api: process.env.MOSAIC_URL });
}
