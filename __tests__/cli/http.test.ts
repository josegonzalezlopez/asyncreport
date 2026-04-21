import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHttpClient, ApiError } from '../../cli/utils/http';

function makeResponse(opts: {
  status: number;
  contentType?: string;
  jsonBody?: unknown;
  jsonThrows?: boolean;
}): Response {
  const headers = new Headers();
  headers.set('content-type', opts.contentType ?? 'application/json');
  return {
    ok: opts.status >= 200 && opts.status < 300,
    status: opts.status,
    statusText: opts.status === 200 ? 'OK' : 'Error',
    headers,
    json: async () => {
      if (opts.jsonThrows) throw new SyntaxError('invalid json');
      return opts.jsonBody;
    },
  } as Response;
}

describe('cli/utils/http createHttpClient', () => {
  const config = { baseUrl: 'http://localhost:3000', apiKey: 'secret' };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET devuelve data cuando la API responde { data: T }', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({
        status: 200,
        jsonBody: { data: { id: '1' } },
      }),
    );
    const client = createHttpClient(config);
    const data = await client.get<{ id: string }>('/api/x');
    expect(data).toEqual({ id: '1' });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/x',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-API-Key': 'secret',
        }),
      }),
    );
  });

  it('lanza ApiError si la respuesta no es JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        jsonBody: {},
      }),
    );
    const client = createHttpClient(config);
    await expect(client.get('/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
    });
  });

  it('POST incluye JSON y header X-API-Key', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({ status: 201, jsonBody: { data: { ok: true } } }),
    );
    const client = createHttpClient(config);
    await client.post('/api/daily', { foo: 1 });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/daily',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ foo: 1 }),
      }),
    );
  });

  it('error 400 incluye detalles anidados de validación sin romper join', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({
        status: 400,
        jsonBody: {
          error: 'Validation error',
          details: {
            fieldErrors: {
              mood: ['El mood debe ser un número'],
            },
          },
        },
      }),
    );
    const client = createHttpClient(config);
    try {
      await client.get('/x');
      expect.fail('debería lanzar');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.status).toBe(400);
      expect(err.message).toContain('Validation error');
      expect(err.message).toContain('fieldErrors');
      expect(err.message).toContain('El mood debe ser un número');
    }
  });

  it('200 sin campo data lanza ApiError 500', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({ status: 200, jsonBody: { error: 'weird' } }),
    );
    const client = createHttpClient(config);
    await expect(client.get('/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    });
  });

  it('json inválido lanza mensaje claro', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse({ status: 200, jsonThrows: true, jsonBody: null }),
    );
    const client = createHttpClient(config);
    await expect(client.get('/x')).rejects.toMatchObject({
      name: 'ApiError',
      message: expect.stringContaining('parsear'),
    });
  });
});
