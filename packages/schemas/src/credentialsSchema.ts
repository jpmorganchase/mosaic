import { z } from 'zod';

export const credentialsSchema = z
  .string({ required_error: 'Please provide credentials to access the repository' })
  .regex(/[:]/, 'credentials must be in the form username:token');
