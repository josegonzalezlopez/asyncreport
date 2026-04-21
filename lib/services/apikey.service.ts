import crypto from 'crypto';
import { prisma } from '@/lib/db';
import type { ApiKey } from '@prisma/client';

/** Longitud del token en bytes antes de codificar en hex (256 bits). */
const TOKEN_BYTES = 32;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

export interface CreatedApiKey {
  /** Token en claro — mostrar UNA sola vez al usuario. */
  token: string;
  apiKey: ApiKey;
}

export interface ApiKeyPublic {
  id: string;
  name: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

const apiKeyService = {
  /**
   * Genera un nuevo token, almacena su hash SHA-256 y devuelve el token en claro.
   * El token en claro NUNCA se persiste; si el usuario lo pierde, debe revocar y crear uno nuevo.
   */
  async create(userId: string, name: string, expiresAt?: Date): Promise<CreatedApiKey> {
    const token = generateToken();
    const keyHash = hashToken(token);

    const apiKey = await prisma.apiKey.create({
      data: { userId, keyHash, name, expiresAt: expiresAt ?? null },
    });

    return { token, apiKey };
  },

  /**
   * Verifica un token en claro contra los hashes almacenados.
   * Actualiza `lastUsedAt` si es válido y no ha expirado.
   * Retorna el userId o null si es inválido/expirado.
   */
  async verify(token: string): Promise<string | null> {
    const keyHash = hashToken(token);

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: { id: true, userId: true, expiresAt: true },
    });

    if (!apiKey) return null;

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Actualización fire-and-forget: no bloquea la respuesta.
    void prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey.userId;
  },

  async listByUser(userId: string): Promise<ApiKeyPublic[]> {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return keys;
  },

  async revoke(id: string, userId: string): Promise<void> {
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.userId !== userId) {
      throw new Error('API Key no encontrada o sin permisos.');
    }
    await prisma.apiKey.delete({ where: { id } });
  },
};

export { apiKeyService };
