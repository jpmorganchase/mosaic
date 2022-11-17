import { z } from 'zod';

export const fileExtensionSchema = z
  .string()
  .startsWith('.', 'Page extensions must start with a "."');
