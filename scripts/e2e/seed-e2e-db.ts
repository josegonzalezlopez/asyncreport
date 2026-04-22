/**
 * Sincroniza la BD con las API keys e IDs de proyecto de `.env.e2e` (valores
 * fijos que ya rellenaste) — respeta exactamente el token/IDs existentes.
 *
 * Requisitos: `npm run prisma:seed` al menos una vez (usuarios *@seed.asyncreport.test).
 *
 * Uso: npm run e2e:seed-db
 */
import { config } from 'dotenv';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { toUTCDayStart } from '../../lib/helpers/dates';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env.e2e') });

const E2E_KEY_NAME = 'e2e-from-env';

const SEED = {
  e2eMain: { email: 'dev-a1@seed.asyncreport.test' },
  admin: { email: 'admin@seed.asyncreport.test' },
  user: { email: 'dev-b1@seed.asyncreport.test' },
  techLead: { email: 'tl-alpha@seed.asyncreport.test' },
} as const;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getEnvOrThrow(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Falta o está vacío: ${name}`);
  return v.trim();
}

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

async function replaceE2EApiKey(userId: string, tokenPlain: string) {
  const keyHash = hashToken(tokenPlain);
  await prisma.apiKey.deleteMany({
    where: { userId, name: E2E_KEY_NAME },
  });
  // Cualquier fila con este hash (p. ej. clave antigua con otro `name`) debe irse.
  await prisma.apiKey.deleteMany({ where: { keyHash } });
  await prisma.apiKey.create({
    data: { userId, name: E2E_KEY_NAME, keyHash },
  });
}

async function ensureProject(id: string, name: string, code: string) {
  const found = await prisma.project.findUnique({ where: { id } });
  if (found) return found;
  return prisma.project.create({
    data: {
      id,
      name,
      code,
      description: 'Creado automáticamente para E2E (scripts/e2e/seed-e2e-db.ts)',
      status: 'ACTIVE',
    },
  });
}

async function main() {
  const tokenMain = getEnvOrThrow('E2E_API_KEY');
  const tokenAdmin = getEnvOrThrow('E2E_ADMIN_API_KEY');
  const tokenUser = getEnvOrThrow('E2E_USER_API_KEY');
  const tokenTl = getEnvOrThrow('E2E_TECHLEAD_API_KEY');
  const dailyProjectId = getEnvOrThrow('E2E_DAILY_PROJECT_ID');
  const nonMemberProjectId = getEnvOrThrow('E2E_NON_MEMBER_PROJECT_ID');
  const aiProjectId = getEnvOrThrow('E2E_AI_PROJECT_ID');
  const asUserEmail = getEnvOrThrow('E2E_AS_USER_EMAIL').toLowerCase();

  if (new Set([dailyProjectId, nonMemberProjectId, aiProjectId]).size !== 3) {
    throw new Error('E2E_DAILY_PROJECT_ID, E2E_NON_MEMBER_PROJECT_ID y E2E_AI_PROJECT_ID deben ser 3 ids distintos');
  }

  const uMain = await prisma.user.findUnique({ where: { email: SEED.e2eMain.email } });
  const uAdmin = await prisma.user.findUnique({ where: { email: SEED.admin.email } });
  const uUser = await prisma.user.findUnique({ where: { email: SEED.user.email } });
  const uTl = await prisma.user.findUnique({ where: { email: SEED.techLead.email } });

  if (!uMain || !uAdmin || !uUser || !uTl) {
    throw new Error(
      'Faltan usuarios seed. Ejecuta: npm run prisma:seed  (espera dev-a1, admin, dev-b1, tl-alpha en DB)',
    );
  }

  await ensureProject(
    dailyProjectId,
    'E2E Daily (desde .env.e2e)',
    `E2E-DAILY-${dailyProjectId.slice(0, 6)}`,
  );
  await ensureProject(
    nonMemberProjectId,
    'E2E Non-member (desde .env.e2e)',
    `E2E-NM-${nonMemberProjectId.slice(0, 6)}`,
  );
  await ensureProject(
    aiProjectId,
    'E2E AI (desde .env.e2e)',
    `E2E-AI-${aiProjectId.slice(0, 6)}`,
  );

  // Miembro en daily, no-miembro en "proyecto ajeno"
  await prisma.projectUser.upsert({
    where: { userId_projectId: { userId: uMain.id, projectId: dailyProjectId } },
    create: { userId: uMain.id, projectId: dailyProjectId, isTechLead: false },
    update: {},
  });
  await prisma.projectUser.deleteMany({
    where: { userId: uMain.id, projectId: nonMemberProjectId },
  });

  // TL (y opcionalmente admin) en proyecto AI; TL como líder
  await prisma.projectUser.upsert({
    where: { userId_projectId: { userId: uTl.id, projectId: aiProjectId } },
    create: { userId: uTl.id, projectId: aiProjectId, isTechLead: true },
    update: { isTechLead: true },
  });
  await prisma.projectUser.upsert({
    where: { userId_projectId: { userId: uAdmin.id, projectId: aiProjectId } },
    create: { userId: uAdmin.id, projectId: aiProjectId, isTechLead: false },
    update: {},
  });

  // Objetivo de --as-user: usuario real en el proyecto daily (misma lógica que el seed hace con tu email)
  let asUser = await prisma.user.findUnique({ where: { email: asUserEmail } });
  if (!asUser) {
    const short = createHash('sha256').update(asUserEmail).digest('hex').slice(0, 20);
    asUser = await prisma.user.create({
      data: {
        email: asUserEmail,
        clerkUserId: `e2e_asuser_${short}`,
        name: 'E2E as-user target',
        role: 'USER',
        specialization: 'OTHER',
      },
    });
    console.log(`Usuario creado para E2E_AS_USER_EMAIL: ${asUserEmail}`);
  }
  await prisma.projectUser.upsert({
    where: { userId_projectId: { userId: asUser.id, projectId: dailyProjectId } },
    create: { userId: asUser.id, projectId: dailyProjectId, isTechLead: false },
    update: {},
  });

  // Mínimo un reporte hoy en proyecto AI para que initiateSummary no devuelva solo NO_REPORTS
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = toUTCDayStart(today, 'UTC');
  const existingToday = await prisma.dailyReport.findFirst({
    where: { projectId: aiProjectId, reportDate: todayStart },
  });
  if (!existingToday) {
    await prisma.dailyReport.create({
      data: {
        userId: uTl.id,
        projectId: aiProjectId,
        reportDate: todayStart,
        yesterday: 'E2E: preparación de datos para resumen IA (ayer)',
        today: 'E2E: preparación de datos para resumen IA (hoy)',
        mood: 3,
        isBlocker: false,
        userTimezone: 'UTC',
      },
    });
  }

  await replaceE2EApiKey(uMain.id, tokenMain);
  await replaceE2EApiKey(uAdmin.id, tokenAdmin);
  await replaceE2EApiKey(uUser.id, tokenUser);
  await replaceE2EApiKey(uTl.id, tokenTl);

  console.log('\n✅ E2E DB listo:');
  console.log(`  API keys (hash SHA-256) registradas en usuarios seed`);
  console.log(`  DAILY project: ${dailyProjectId}  — miembro: dev-a1 + ${asUserEmail}`);
  console.log(`  NON_MEMBER project: ${nonMemberProjectId}  — dev-a1 excluido`);
  console.log(`  AI project: ${aiProjectId}  — TL: tl-alpha`);
  console.log(
    '\n  Próximo: ASYNCREPORT_BASE_URL = E2E_BASE_URL, ASYNCREPORT_API_KEY = E2E_API_KEY, luego: npm run e2e:check-env',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
