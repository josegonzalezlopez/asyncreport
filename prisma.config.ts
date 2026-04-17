import path from 'node:path';
import { defineConfig } from 'prisma/config';

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
