import { z } from 'zod';

export const sidebarDataLayoutSchema = z.union([
  z.literal('Landing'),
  z.literal('DetailContentOnly'),
  z.literal('DetailHighlight'),
  z.literal('DetailOverview'),
  z.literal('DetailTechnical'),
  z.literal('FullWidth'),
  z.literal('NewsLetter'),
  z.literal('ProductDiscover'),
  z.literal('ProductPreview'),
  z.literal('PythonDoc'),
  z.literal('Typedoc'),
  z.string().endsWith('Doc')
]);
