import { z } from 'zod';

export const sidebarSortConfigSchema = z.object({
  field: z.string(),
  dataType: z.union([z.literal('string'), z.literal('number'), z.literal('date')]),
  arrange: z.union([z.literal('asc'), z.literal('desc')])
});

export type SortConfig = z.infer<typeof sidebarSortConfigSchema>;
