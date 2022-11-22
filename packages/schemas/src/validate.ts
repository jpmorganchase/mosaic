import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

// eslint-disable-next-line import/prefer-default-export
export function validateMosaicSchema<T extends z.ZodTypeAny>(
  schema: T,
  options: Record<string, unknown>
) {
  try {
    schema.parse(options);
  } catch (err: unknown) {
    const { message, details } = fromZodError(err as ZodError);
    console.group('[Mosaic] schema validation error');
    console.log(message);
    console.table(details);
    console.groupEnd();
    process.exit(1);
  }
}
