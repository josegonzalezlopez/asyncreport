import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { userService } from '@/lib/services/user.service';
import { apiKeyService } from '@/lib/services/apikey.service';
import type { AuthContext } from '@/lib/types';

/**
 * Obtiene el contexto de autorización completo para una API Route o Server Action.
 * Soporta doble autenticación:
 *   1. Sesión Clerk (uso web normal).
 *   2. Bearer token en Authorization header (uso desde CLI con API Keys).
 *
 * Retorna null si el usuario no tiene sesión activa o no existe en la DB.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  // 1. Intentar autenticación vía Clerk
  const { userId: clerkUserId } = await auth();

  if (clerkUserId) {
    const user = await userService.findByClerkId(clerkUserId);
    if (!user) return null;
    return { clerkUserId, dbUserId: user.id, role: user.role };
  }

  // 2. Fallback: Bearer token para CLI
  const headerStore = await headers();
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
