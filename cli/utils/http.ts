import type { CliConfig } from './config.js';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createHttpClient(config: CliConfig) {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => ({ error: res.statusText }));

    if (!res.ok) {
      throw new ApiError(res.status, (json as { error?: string }).error ?? res.statusText);
    }

    return (json as { data: T }).data;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  };
}
