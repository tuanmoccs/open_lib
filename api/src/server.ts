import { createApp } from './app';
import { loadEnv } from './config/env';
import { createDb } from './db/knex';
import { runMigrations } from './db/migrate';
import { createLogger } from './lib/logger';
import { BookService } from './modules/books/book.service';
import { OpenLibraryClient } from './modules/open-library/open-library.client';
import { KnexShelfRepository } from './modules/shelf/shelf.repository';

async function main() {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV === 'development');
  const db = createDb(env);

  if (env.RUN_MIGRATIONS) {
    const { applied } = await runMigrations(db);
    logger.info({ applied }, 'Database migrations up to date');
  }

  const openLibrary = new OpenLibraryClient({
    baseUrl: env.OPEN_LIBRARY_BASE_URL,
    coversUrl: env.OPEN_LIBRARY_COVERS_URL,
    timeoutMs: env.OPEN_LIBRARY_TIMEOUT_MS,
    userAgent: `MiniReadingTracker/1.0${env.OPEN_LIBRARY_CONTACT ? ` (${env.OPEN_LIBRARY_CONTACT})` : ''}`,
    logger,
  });
  const shelfRepository = new KnexShelfRepository(db);
  const bookService = new BookService(openLibrary, shelfRepository);

  const app = createApp({
    logger,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: env.TRUST_PROXY,
    rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
    openLibrary,
    bookService,
    healthCheck: async () => {
      await db.raw('SELECT 1');
    },
  });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API server listening');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(() => {
      db.destroy().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  process.stderr.write(`Fatal startup error: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
