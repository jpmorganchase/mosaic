import { z } from 'zod';

export const credentialsSchema = z
  .string({
    error: issue =>
      issue.input === undefined ? 'Please provide credentials to access the repository' : undefined
  })
  .regex(/[:]/, 'credentials must be in the form username:token');
