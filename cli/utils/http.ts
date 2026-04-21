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
    'X-API-Key': config.apiKey,
  };

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Si hubo redirect (ej. Clerk redirige a /sign-in) la respuesta es HTML, no JSON
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new ApiError(
        res.status || 401,
        `El servidor devolvió ${res.status} (${contentType || 'sin content-type'}). ` +
          `Verifica que la URL es correcta y que el servidor está corriendo.`,
      );
    }

    const json = await res.json().catch(() => {
      throw new ApiError(res.status, 'No se pudo parsear la respuesta del servidor como JSON.');
    });

    if (!res.ok) {
      const body = json as { error?: string; details?: unknown };
      // Incluir detalles de validación de Zod en el mensaje de error
      let msg = body.error ?? res.statusText;
      if (body.details) {
        const normalizeErrors = (value: unknown): string[] => {
          if (Array.isArray(value)) return value.map((item) => String(item));
          if (typeof value === 'string') return [value];
          if (value && typeof value === 'object') {
            return Object.values(value as Record<string, unknown>).flatMap(normalizeErrors);
          }
          return [];
        };

        const detailsRecord =
          typeof body.details === 'object' && body.details !== null
            ? (body.details as Record<string, unknown>)
            : null;

        if (detailsRecord) {
          const fields = Object.entries(detailsRecord)
            .map(([field, errors]) => {
              const normalized = normalizeErrors(errors);
              if (!normalized.length) return null;
              return `  - ${field}: ${normalized.join(', ')}`;
            })
            .filter((line): line is string => line !== null)
            .join('\n');

          if (fields) msg += `\n${fields}`;
        }
      }
      throw new ApiError(res.status, msg);
    }

    // Validar forma de la respuesta
    const typed = json as { data?: T; error?: string };
    if (typed.data === undefined) {
      throw new ApiError(
        500,
        typed.error ?? 'Respuesta inesperada del servidor (sin campo "data").',
      );
    }

    return typed.data;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  };
}
