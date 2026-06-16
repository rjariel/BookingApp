import { z } from 'zod';

/**
 * Typed, validated environment. Imported by server code only.
 * Set SKIP_ENV_VALIDATION=1 to bypass during builds without real secrets
 * (CI build step, Docker image builds, etc.).
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(1),
  AUTH_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const skipValidation =
  process.env.SKIP_ENV_VALIDATION === '1' || process.env.SKIP_ENV_VALIDATION === 'true';

function loadEnv(): z.infer<typeof schema> {
  if (skipValidation) {
    return process.env as unknown as z.infer<typeof schema>;
  }
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      '❌ Invalid environment variables:',
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
    );
    throw new Error('Invalid environment variables. See .env.example.');
  }
  return parsed.data;
}

export const env = loadEnv();
