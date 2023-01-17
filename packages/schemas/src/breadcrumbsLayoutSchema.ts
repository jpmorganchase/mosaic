import { z } from 'zod';

export const breadcrumbsLayoutSchema = z.union([
  z.string().startsWith('Detail'),
  z.literal('ProductDiscover'),
  z.string().endsWith('Doc')
]);
