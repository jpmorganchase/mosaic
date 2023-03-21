import { z } from 'zod';

export const modeSchema = z.union([
  z.literal('mode'),
  z.literal('snapshot-file'),
  z.literal('snapshot-s3')
]);
