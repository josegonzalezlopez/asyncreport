import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  // DIRECT_URL (Pgbouncer) se usa en runtime (Vercel serverless).
  // DATABASE_URL (directo) se usa en migraciones y en desarrollo local.
  const connectionString =
    process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'] ?? '';

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
