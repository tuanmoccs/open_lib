import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { AppError } from './lib/errors';
import type { Logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { bookRoutes, coverRoutes } from './modules/books/book.routes';
import type { BookService, OpenLibraryGateway } from './modules/books/book.service';

export interface AppOptions {
  logger: Logger;
  corsOrigins: string[];
  trustProxy: number;
  rateLimitPerMinute: number;
  healthCheck: () => Promise<void>;
  openLibrary: OpenLibraryGateway;
  bookService: BookService;
}

export function createApp(options: AppOptions) {
  const app = express();

  app.set('trust proxy', options.trustProxy);
  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger: options.logger,
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        const id = typeof existing === 'string' && existing ? existing : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
    }),
  );
  app.use(helmet());
  if (options.corsOrigins.length > 0) {
    app.use(cors({ origin: options.corsOrigins }));
  }
  app.use(express.json({ limit: '20kb' }));

  const api = Router();

  // The app has no login, so throttle per client IP to protect the Open Library proxy.
  api.use(
    rateLimit({
      windowMs: 60_000,
      limit: options.rateLimitPerMinute,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, _res, next) =>
        next(new AppError(429, 'RATE_LIMITED', 'Too many requests, please slow down')),
    }),
  );

  api.get('/health', async (_req, res) => {
    await options.healthCheck();
    res.json({ status: 'ok' });
  });
  api.use('/books', bookRoutes(options.bookService));
  api.use('/covers', coverRoutes(options.openLibrary));

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
