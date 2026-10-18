export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UPSTREAM_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const validationError = (message: string, details?: ErrorDetail[]) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const notFound = (message: string) => new AppError(404, 'NOT_FOUND', message);

export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);

export const upstreamError = (message: string) => new AppError(502, 'UPSTREAM_ERROR', message);
