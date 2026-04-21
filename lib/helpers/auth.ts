import { auth } from '@clerk/nextjs/server';
import { userService } from '@/lib/services/user.service';
import type { AuthContext } from '@/lib/types';

/**
 * Obtiene el contexto de autorización completo para una API Route o Server Action.
 * Retorna null si el usuario no tiene sesión activa o no existe en la DB.
 *
 * Patrón de uso en API Routes:
 *   const ctx = await getAuthContext();
 *   if (!ctx) return errorResponse('Unauthorized', 401);
 *   if (!requireRole(ctx, 'ADMIN')) return errorResponse('Forbidden', 403);
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await userService.findByClerkId(userId);
  if (!user) return null;

  return {
    clerkUserId: userId,
    dbUserId: user.id,
    role: user.role,
  };
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
