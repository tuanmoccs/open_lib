import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  // Comma-separated list of allowed browser origins. Empty means same-origin only.
  CORS_ORIGINS: z.string().default(''),
  // Number of reverse proxies in front of the API (Caddy in production).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(300),

  RUN_MIGRATIONS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  RUN_SEED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  OPEN_LIBRARY_BASE_URL: z.url().default('https://openlibrary.org'),
  OPEN_LIBRARY_COVERS_URL: z.url().default('https://covers.openlibrary.org'),
  OPEN_LIBRARY_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  // Open Library asks clients to identify themselves with a contact in the User-Agent.
  OPEN_LIBRARY_CONTACT: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  return parsed.data;
}
