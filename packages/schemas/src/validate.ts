import { z, ZodTypeAny } from 'zod';
import { fromZodError } from 'zod-validation-error';

// eslint-disable-next-line import/prefer-default-export
export function validateMosaicSchema<T extends ZodTypeAny>(
  schema: T,
  options: Record<string, unknown>,
  exitOnError = true
): z.infer<typeof schema> {
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
  return {};
}
