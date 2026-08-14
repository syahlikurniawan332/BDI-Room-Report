const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new ApiError(data.error ?? 'Request failed', response.status, data.details);
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(response);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  headers?: Record<string, string>,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    headers,
  });
  return parseResponse<T>(response);
}

export function photoUrl(photoId: string, type: 'report' | 'complaint' = 'report'): string {
  return type === 'report'
    ? `${API_BASE}/photos/reports/${photoId}`
    : `${API_BASE}/photos/complaints/${photoId}`;
}
