import pino from 'pino';

export function createLogger(level: string, pretty: boolean) {
  return pino({
    level,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    ...(pretty ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
  });
}

export type Logger = ReturnType<typeof createLogger>;
