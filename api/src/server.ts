import { createApp } from './app';
import { loadEnv } from './config/env';
import { createLogger } from './lib/logger';

async function main() {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV === 'development');

  const app = createApp({
    logger,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: env.TRUST_PROXY,
    healthCheck: async () => {},
  });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API server listening');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  process.stderr.write(`Fatal startup error: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
