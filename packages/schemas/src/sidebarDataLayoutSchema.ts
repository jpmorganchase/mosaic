import { z } from 'zod';

export const sidebarDataLayoutSchema = z.union([
  z.literal('DetailHighlight'),
  z.literal('DetailOverview'),
  z.literal('DetailTechnical'),
  z.literal('NewsLetter'),
  z.string().endsWith('Doc')
]);

