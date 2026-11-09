import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

export function validateMosaicSchema<T extends z.ZodType>(
  schema: T,
  options: Record<string, unknown>,
  exitOnError = true
): z.output<T> {
  try {
    return schema.parse(options);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const formattedError = fromZodError(err);
      console.error(`[Mosaic] schema validation error - ${formattedError.message}`);
    } else {
      console.error('[Mosaic] schema validation error - an unexpected error occurred:', err);
    }
    if (exitOnError) {
      process.exit(1);
    }
  }
  return {} as z.output<T>;
}
