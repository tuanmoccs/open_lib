import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

export interface AppOptions {
  logger: Logger;
  corsOrigins: string[];
  trustProxy: number;
  healthCheck: () => Promise<void>;
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

  api.get('/health', async (_req, res) => {
    await options.healthCheck();
    res.json({ status: 'ok' });
  });

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
