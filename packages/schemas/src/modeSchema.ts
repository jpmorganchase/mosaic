import { z } from 'zod';

export const modeSchema = z.union([
  z.literal('active'),
  z.literal('snapshot-file'),
  z.literal('snapshot-s3')
]);
