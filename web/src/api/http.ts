import axios, { isAxiosError, isCancel } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

export interface ApiErrorDetail {
  field: string;
  message: string;
}

/** Error raised by every API call; `code` matches the backend error codes plus client-side ones. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isCanceled(error: unknown) {
  return isCancel(error);
}

http.interceptors.response.use(undefined, (error: unknown) => {
  if (isCancel(error)) return Promise.reject(error);
  if (isAxiosError(error)) {
    const body = error.response?.data as
      { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } } | undefined;
    if (body?.error?.code) {
      return Promise.reject(
        new ApiError(
          body.error.code,
          body.error.message ?? error.message,
          error.response?.status,
          body.error.details,
        ),
      );
    }
    if (!error.response) {
      return Promise.reject(new ApiError('NETWORK_ERROR', error.message));
    }
    return Promise.reject(new ApiError('UNKNOWN', error.message, error.response.status));
  }
  return Promise.reject(new ApiError('UNKNOWN', String(error)));
});
