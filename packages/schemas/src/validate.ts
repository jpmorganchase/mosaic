import { z, ZodError } from 'zod';

// eslint-disable-next-line import/prefer-default-export
export function validateMosaicSchema<T extends z.ZodTypeAny>(
  schema: T,
  options: Record<string, unknown>,
  exitOnError = false
) {
  try {
    schema.parse(options);
  } catch (err: unknown) {
    console.group('[Mosaic] schema validation error');
    console.table((err as ZodError).issues);
    console.groupEnd();
    if (exitOnError) {
      process.exit(1);
    }
  }
}
