import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

// Prisma CLI no carga .env.local automáticamente (solo Next.js lo hace).
// Cargamos explícitamente para que DATABASE_URL esté disponible en migraciones.
config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Configuracion de Prisma para el CLI (migraciones, db pull, studio).
 * La conexion de runtime usa el adaptador en lib/db.ts.
 *
 * DATABASE_URL  = conexion directa puerto 5432 — para migraciones CLI
 * DIRECT_URL    = Pgbouncer puerto 6543         — para runtime en Vercel
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
