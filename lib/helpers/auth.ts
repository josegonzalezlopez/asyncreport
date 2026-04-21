import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { userService } from '@/lib/services/user.service';
import { apiKeyService } from '@/lib/services/apikey.service';
import type { AuthContext } from '@/lib/types';

/**
 * Obtiene el contexto de autorización completo para una API Route o Server Action.
 * Soporta doble autenticación:
 *   1. Sesión Clerk (uso web normal).
 *   2. X-API-Key header o Bearer token en Authorization (uso desde CLI con API Keys).
 *
 * NOTA: usamos `X-API-Key` como header preferente para evitar que Clerk intente
 * verificar el token como un JWT de Clerk al leer `Authorization: Bearer`.
 * Si se usa `Authorization: Bearer`, solo se considera cuando Clerk no autentica.
 *
 * Retorna null si el usuario no tiene sesión activa o no existe en la DB.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const headerStore = await headers();

  // 1. Verificar primero si hay un API Key personalizado (CLI)
  //    antes de que Clerk intente procesar el header Authorization.
  const apiKeyHeader = headerStore.get('x-api-key');
  if (apiKeyHeader) {
    const dbUserId = await apiKeyService.verify(apiKeyHeader);
    if (dbUserId) {
      const user = await userService.findById(dbUserId);
      if (user) return { clerkUserId: '', dbUserId: user.id, role: user.role };
    }
    return null; // API Key presente pero inválida → no continuar con Clerk
  }

  // 2. Intentar autenticación vía Clerk (sesión web)
  const { userId: clerkUserId } = await auth();

  if (clerkUserId) {
    const user = await userService.findByClerkId(clerkUserId);
    if (!user) return null;
    return { clerkUserId, dbUserId: user.id, role: user.role };
  }

  // 3. Fallback: Bearer token (compatibilidad) — solo si Clerk no autenticó
  const authorization = headerStore.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1];
  const dbUserId = await apiKeyService.verify(token);
  if (!dbUserId) return null;

  const user = await userService.findById(dbUserId);
  if (!user) return null;

  return { clerkUserId: '', dbUserId: user.id, role: user.role };
}

/**
 * Función pura que verifica si el contexto tiene uno de los roles permitidos.
 * Acepta múltiples roles como argumentos rest.
 */
export function requireRole(
  ctx: AuthContext | null,
  ...roles: AuthContext['role'][]
): boolean {
  if (!ctx) return false;
  return roles.includes(ctx.role);
}
