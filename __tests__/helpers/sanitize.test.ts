import { describe, it, expect } from 'vitest';
import { sanitizeForAI } from '@/lib/helpers/sanitize';

describe('sanitizeForAI', () => {
  it('redacta JWTs (eyJh...)', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.abc123XYZ';
    expect(sanitizeForAI(`token: ${jwt}`)).not.toContain('eyJh');
    expect(sanitizeForAI(`token: ${jwt}`)).toContain('[TOKEN_REDACTED]');
  });

  it('redacta patrones password=valor', () => {
    const result = sanitizeForAI('usando password=secreto123 para conectar');
    expect(result).not.toContain('secreto123');
    expect(result).toContain('[REDACTED]');
  });

  it('redacta connection strings de postgresql', () => {
    const connString = 'postgresql://user:pass123@db.supabase.co:5432/postgres';
    const result = sanitizeForAI(`DB: ${connString}`);
    expect(result).not.toContain('pass123');
    expect(result).toContain('[CONNECTION_REDACTED]');
  });

  it('redacta connection strings de mongodb', () => {
    const result = sanitizeForAI('mongodb://admin:s3cr3t@cluster.mongodb.net/db');
    expect(result).not.toContain('s3cr3t');
    expect(result).toContain('[CONNECTION_REDACTED]');
  });

  it('redacta api_key=valor', () => {
    const result = sanitizeForAI('llamé la API con api_key=AIzaSyABC123DEF456GHI');
    expect(result).not.toContain('AIzaSyABC123DEF456GHI');
    expect(result).toContain('[REDACTED]');
  });

  it('redacta emails', () => {
    const result = sanitizeForAI('contactar a jose@empresa.com para más info');
    expect(result).not.toContain('jose@empresa.com');
    expect(result).toContain('[EMAIL_REDACTED]');
  });

  it('no altera texto normal sin datos sensibles', () => {
    const text = 'Terminé el módulo de autenticación y escribí los tests unitarios.';
    expect(sanitizeForAI(text)).toBe(text);
  });

  it('es idempotente (aplicar dos veces produce el mismo resultado)', () => {
    const text = 'token=abc123xyz789 y eyJhbGci.payload.sig';
    const once = sanitizeForAI(text);
    const twice = sanitizeForAI(once);
    expect(once).toBe(twice);
  });
});
