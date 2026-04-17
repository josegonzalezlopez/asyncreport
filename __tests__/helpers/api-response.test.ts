import { describe, it, expect } from 'vitest';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';

describe('successResponse', () => {
  it('retorna status 200 por defecto con formato { data }', async () => {
    const res = successResponse({ id: '1', name: 'Test' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { id: '1', name: 'Test' } });
  });

  it('acepta status personalizado', async () => {
    const res = successResponse({ id: '1' }, 201);
    expect(res.status).toBe(201);
  });

  it('incluye message cuando se provee', async () => {
    const res = successResponse({ id: '1' }, 200, 'Proyecto creado');
    const body = await res.json();
    expect(body.message).toBe('Proyecto creado');
  });

  it('no incluye message cuando no se provee', async () => {
    const res = successResponse({ id: '1' });
    const body = await res.json();
    expect(body).not.toHaveProperty('message');
  });
});

describe('errorResponse', () => {
  it('retorna status 500 por defecto con formato { error, code }', async () => {
    const res = errorResponse('Internal server error');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Internal server error', code: 500 });
  });

  it('acepta status personalizado', async () => {
    const res = errorResponse('Not found', 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe(404);
  });

  it('incluye details cuando se provee', async () => {
    const details = { field: ['Required'] };
    const res = errorResponse('Validation error', 400, details);
    const body = await res.json();
    expect(body.details).toEqual(details);
  });

  it('no incluye details cuando no se provee', async () => {
    const res = errorResponse('Forbidden', 403);
    const body = await res.json();
    expect(body).not.toHaveProperty('details');
  });
});
