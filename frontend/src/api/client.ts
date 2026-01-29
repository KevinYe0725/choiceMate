import type { ExplainRequest, ExplainResponse, QuestionnaireRequest, QuestionnaireResponse } from './types';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const extractErrorMessage = (data: any): string => {
  if (!data) return '请求失败';
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((item) => item.msg || JSON.stringify(item)).join('; ');
  }
  if (typeof data.error === 'string') return data.error;
  return JSON.stringify(data);
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  if (!baseUrl) {
    throw new ApiError('VITE_API_BASE_URL 未配置', 0);
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  const data = text ? (() => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  })() : null;

  if (!res.ok) {
    const message = extractErrorMessage(data);
    throw new ApiError(message, res.status, data);
  }

  return data as T;
};

export const questionnaireNext = (body: QuestionnaireRequest) =>
  postJson<QuestionnaireResponse>('/questionnaire/next', body);

export const explainDecision = (body: ExplainRequest) =>
  postJson<ExplainResponse>('/explain', body);
