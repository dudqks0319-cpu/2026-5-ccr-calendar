import type { IncomingMessage, ServerResponse } from 'node:http';
import { ApiError } from './saveCore.js';

export type ApiRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

export type ApiResponse = ServerResponse & {
  status: (statusCode: number) => ApiResponse;
  json: (body: unknown) => void;
};

export function sendMethodNotAllowed(response: ApiResponse, methods: string[]) {
  response.setHeader('Allow', methods.join(', '));
  return response.status(405).json({ error: '허용되지 않는 요청 방식입니다.' });
}

export function sendError(response: ApiResponse, error: unknown) {
  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({ error: error.message });
  }

  return response.status(500).json({
    error: '서버 저장 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  });
}

export function getQueryString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}
