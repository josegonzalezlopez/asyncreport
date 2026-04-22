/**
 * Seed completo para QA local: 3 proyectos, 12 usuarios (roles variados),
 * 10+ dailies por proyecto con texto coherente, una API key por usuario.
 *
 * Emails: *@seed.asyncreport.test · clerkUserId: seed_<rol>_<id>
 * Proyectos: SEED-ALPHA (5 miembros), SEED-BETA (5), SEED-GAMMA (3)
 *
 * Uso: npm run prisma:seed
 * Claves en claro: consola + prisma/seed-api-keys.generated.txt (gitignored)
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createHash, randomBytes } from 'crypto';
import { writeFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient, type Role, type Specialization } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter });

const SEED_DOMAIN = 'seed.asyncreport.test';
const KEY_FILE = resolve(process.cwd(), 'prisma/seed-api-keys.generated.txt');

function email(local: string): string {
  return `${local}@${SEED_DOMAIN}`;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function utcDayStart(daysAgo: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

type SeedUserDef = {
  local: string;
  clerkUserId: string;
  name: string;
  role: Role;
  specialization: Specialization;
};

const USERS: SeedUserDef[] = [
  { local: 'admin', clerkUserId: 'seed_clerk_admin', name: 'Admin Seed', role: 'ADMIN', specialization: 'OTHER' },
  { local: 'tl-alpha', clerkUserId: 'seed_clerk_tl_alpha', name: 'Laura Méndez', role: 'TECH_LEAD', specialization: 'DEVELOPER' },
  { local: 'tl-beta', clerkUserId: 'seed_clerk_tl_beta', name: 'Carlos Rivas', role: 'TECH_LEAD', specialization: 'DEVELOPER' },
  { local: 'tl-gamma', clerkUserId: 'seed_clerk_tl_gamma', name: 'Ana Torres', role: 'TECH_LEAD', specialization: 'ANALYST' },
  { local: 'dev-a1', clerkUserId: 'seed_clerk_dev_a1', name: 'Marcos Díaz', role: 'USER', specialization: 'DEVELOPER' },
  { local: 'dev-a2', clerkUserId: 'seed_clerk_dev_a2', name: 'Sofía Herrera', role: 'USER', specialization: 'QA' },
  { local: 'dev-a3', clerkUserId: 'seed_clerk_dev_a3', name: 'Diego Fuentes', role: 'USER', specialization: 'DEVOPS' },
  { local: 'dev-b1', clerkUserId: 'seed_clerk_dev_b1', name: 'Lucía Vega', role: 'USER', specialization: 'DESIGNER' },
  { local: 'dev-b2', clerkUserId: 'seed_clerk_dev_b2', name: 'Tomás Núñez', role: 'USER', specialization: 'DEVELOPER' },
  { local: 'dev-b3', clerkUserId: 'seed_clerk_dev_b3', name: 'Valentina Soto', role: 'USER', specialization: 'QA' },
  { local: 'dev-g1', clerkUserId: 'seed_clerk_dev_g1', name: 'Ignacio Paz', role: 'USER', specialization: 'DEVELOPER' },
  { local: 'dev-g2', clerkUserId: 'seed_clerk_dev_g2', name: 'Camila Rojas', role: 'USER', specialization: 'ANALYST' },
];

/** 10 entradas de daily por proyecto: ayer / hoy / bloqueadores con contexto realista. */
const DAILY_TEMPLATES: Array<{
  daysAgo: number;
  yesterday: string;
  today: string;
  blockers: string | null;
  mood: number;
}> = [
  {
    daysAgo: 0,
    yesterday:
      'Cerré el PR de validación Zod en las rutas de proyectos y revisé comentarios del code review.',
    today:
      'Voy a instrumentar métricas en el dashboard y preparar el deploy a staging.',
    blockers: null,
    mood: 4,
  },
  {
    daysAgo: 1,
    yesterday:
      'Pair programming con QA para reproducir el bug de timezone en reportDate.',
    today:
      'Implementar fix usando date-fns-tz y tests unitarios en dates.test.ts.',
    blockers: 'Esperando credenciales del entorno de staging para probar el flujo completo.',
    mood: 3,
  },
  {
    daysAgo: 2,
    yesterday:
      'Documenté el contrato OpenAPI provisional y alineé nombres de campos con el front.',
    today:
      'Sincronizar con diseño los estados vacíos del listado de dailies.',
    blockers: null,
    mood: 4,
  },
  {
    daysAgo: 3,
    yesterday:
      'Migré el job de notificaciones a cola asíncrona y reduje timeouts en Vercel.',
    today:
      'Monitorear logs en la primera hora pico y ajustar reintentos de Resend.',
    blockers: null,
    mood: 5,
  },
  {
    daysAgo: 4,
    yesterday:
      'Auditoría rápida de dependencias (npm audit) y bump de patch en Next.',
    today:
      'Validar que Playwright e2e sigan verdes tras el upgrade.',
    blockers: 'El pipeline de CI falló por límite de concurrencia; reintenté el job.',
    mood: 3,
  },
  {
    daysAgo: 5,
    yesterday:
      'Diseñé variantes del empty state para “sin proyectos” y pasé handoff al front.',
    today:
      'Iterar tokens de color en dark mode según feedback del equipo.',
    blockers: null,
    mood: 4,
  },
  {
    daysAgo: 6,
    yesterday:
      'Ejecuté suite de regresión manual en el flujo de asignación a proyecto.',
    today:
      'Automatizar dos casos críticos en Cypress/Playwright.',
    blockers: null,
    mood: 4,
  },
  {
    daysAgo: 7,
    yesterday:
      'Refactor del hook de formulario de daily para reducir re-renders.',
    today:
      'Extraer componente MoodSelector a carpeta compartida.',
    blockers: null,
    mood: 5,
  },
  {
    daysAgo: 8,
    yesterday:
      'Reunión de refinamiento: priorizamos RBAC en rutas admin vs proxy.',
    today:
      'Spike de 2h sobre claims de rol en JWT de Clerk.',
    blockers: null,
    mood: 3,
  },
  {
    daysAgo: 9,
    yesterday:
      'Optimicé consulta N+1 en listado de miembros usando include selectivo.',
    today:
      'Añadir índice compuesto en projectId + reportDate si el explain lo confirma.',
    blockers: null,
    mood: 4,
  },
  {
    daysAgo: 10,
    yesterday:
      'Onboarding de nuevo compañero: acceso a repo, convenciones de branches y PRs.',
    today:
      'Pair para primer ticket de bug en filtros del feed.',
    blockers: null,
    mood: 5,
  },
  {
    daysAgo: 11,
    yesterday:
      'Análisis de costos de Gemini: ajusté prompt para acotar tokens de salida.',
    today:
      'Definir límite diario de resúmenes por proyecto en configuración.',
    blockers: 'Cuota free de Gemini alcanzada ayer al mediodía; pausé pruebas hasta hoy.',
    mood: 2,
  },
];

async function clearSeedData() {
  const seedProjects = await prisma.project.findMany({
    where: { code: { startsWith: 'SEED-' } },
    select: { id: true },
  });
  const seedProjectIds = seedProjects.map((p) => p.id);
  if (seedProjectIds.length === 0) return;

  await prisma.notification.deleteMany({
    where: { projectId: { in: seedProjectIds } },
  });
  await prisma.aISummary.deleteMany({
    where: { projectId: { in: seedProjectIds } },
  });
  await prisma.dailyReport.deleteMany({
    where: { projectId: { in: seedProjectIds } },
  });
  await prisma.projectUser.deleteMany({
    where: { projectId: { in: seedProjectIds } },
  });
  await prisma.project.deleteMany({
    where: { id: { in: seedProjectIds } },
  });

  const seedUserIds = await prisma.user.findMany({
    where: { email: { endsWith: `@${SEED_DOMAIN}` } },
    select: { id: true },
  });
  const ids = seedUserIds.map((u) => u.id);
  if (ids.length === 0) return;

  await prisma.apiKey.deleteMany({ where: { userId: { in: ids } } });
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.dailyReport.deleteMany({ where: { userId: { in: ids } } });
  await prisma.projectUser.deleteMany({ where: { userId: { in: ids } } });
  await prisma.aISummary.deleteMany({ where: { generatedById: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  console.log('🌱 Seed completo (SEED-ALPHA / SEED-BETA / SEED-GAMMA)...\n');

  await clearSeedData();

  const userByLocal = new Map<string, { id: string; email: string }>();

  for (const u of USERS) {
    const em = email(u.local);
    const row = await prisma.user.upsert({
      where: { email: em },
      create: {
        clerkUserId: u.clerkUserId,
        email: em,
        name: u.name,
        role: u.role,
        specialization: u.specialization,
      },
      update: {
        name: u.name,
        role: u.role,
        specialization: u.specialization,
      },
    });
    userByLocal.set(u.local, { id: row.id, email: em });
  }

  const pAlpha = await prisma.project.create({
    data: {
      name: 'Plataforma Core',
      code: 'SEED-ALPHA',
      description: 'Servicios backend, Prisma, API Routes y autenticación dual.',
      status: 'ACTIVE',
    },
  });
  const pBeta = await prisma.project.create({
    data: {
      name: 'Experiencia Web',
      code: 'SEED-BETA',
      description: 'Dashboard Next.js, componentes UI y flujos de usuario.',
      status: 'ACTIVE',
    },
  });
  const pGamma = await prisma.project.create({
    data: {
      name: 'Datos e Informes',
      code: 'SEED-GAMMA',
      description: 'Reporting, exportaciones y consultas analíticas.',
      status: 'ACTIVE',
    },
  });

  const m = (userLocal: string, projectId: string, isTechLead: boolean) => ({
    userId: userByLocal.get(userLocal)!.id,
    projectId,
    isTechLead,
  });

  await prisma.projectUser.createMany({
    data: [
      m('tl-alpha', pAlpha.id, true),
      m('admin', pAlpha.id, false),
      m('dev-a1', pAlpha.id, false),
      m('dev-a2', pAlpha.id, false),
      m('dev-a3', pAlpha.id, false),

      m('tl-beta', pBeta.id, true),
      m('admin', pBeta.id, false),
      m('dev-b1', pBeta.id, false),
      m('dev-b2', pBeta.id, false),
      m('dev-b3', pBeta.id, false),

      m('tl-gamma', pGamma.id, true),
      m('dev-g1', pGamma.id, false),
      m('dev-g2', pGamma.id, false),
    ],
  });

  /** Asocia tu cuenta Clerk (primer usuario real en DB) a los 3 proyectos SEED para ver miembros/dailies completos en /dashboard/projects. */
  const devUser = await prisma.user.findFirst({
    where: {
      AND: [
        { NOT: { email: { endsWith: `@${SEED_DOMAIN}` } } },
        { NOT: { clerkUserId: { startsWith: 'DELETED_' } } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  if (devUser) {
    for (const pid of [pAlpha.id, pBeta.id, pGamma.id]) {
      await prisma.projectUser.upsert({
        where: {
          userId_projectId: { userId: devUser.id, projectId: pid },
        },
        create: {
          userId: devUser.id,
          projectId: pid,
          isTechLead: false,
        },
        update: {},
      });
    }
    console.log(
      `👤 Tu cuenta (${devUser.email}) enlazada a Plataforma Core, Experiencia Web y Datos e Informes (verás contadores reales).\n`,
    );
  } else {
    console.log(
      'ℹ️ Aún no hay usuario Clerk en DB: tras iniciar sesión una vez, vuelve a ejecutar npm run prisma:seed para enlazar tu cuenta a los proyectos SEED.\n',
    );
  }

  console.log('📁 Proyectos: SEED-ALPHA (5), SEED-BETA (5), SEED-GAMMA (3) miembros.');
  console.log('👥 Líderes: tl-alpha, tl-beta, tl-gamma · Admin en Alpha y Beta.\n');

  /** Autores rotativos por proyecto (índices en USERS locales) */
  const authorsAlpha = ['tl-alpha', 'admin', 'dev-a1', 'dev-a2', 'dev-a3'];
  const authorsBeta = ['tl-beta', 'admin', 'dev-b1', 'dev-b2', 'dev-b3'];
  const authorsGamma = ['tl-gamma', 'dev-g1', 'dev-g2'];

  async function seedDailiesForProject(
    projectId: string,
    authors: string[],
    label: string,
  ) {
    let count = 0;
    for (let i = 0; i < 10; i++) {
      const tpl = DAILY_TEMPLATES[i]!;
      const authorLocal = authors[i % authors.length]!;
      const uid = userByLocal.get(authorLocal)!.id;
      const reportDate = utcDayStart(tpl.daysAgo);
      const isBlocker = Boolean(tpl.blockers?.trim());

      await prisma.dailyReport.create({
        data: {
          userId: uid,
          projectId,
          reportDate,
          yesterday: `[${label}] ${tpl.yesterday}`,
          today: `[${label}] ${tpl.today}`,
          blockers: tpl.blockers ? `[${label}] ${tpl.blockers}` : null,
          isBlocker,
          mood: tpl.mood,
          userTimezone: 'America/Argentina/Buenos_Aires',
        },
      });
      count++;
    }
    return count;
  }

  const ca = await seedDailiesForProject(pAlpha.id, authorsAlpha, 'ALPHA');
  const cb = await seedDailiesForProject(pBeta.id, authorsBeta, 'BETA');
  const cg = await seedDailiesForProject(pGamma.id, authorsGamma, 'GAMMA');

  console.log(`📝 Dailies creados: ALPHA=${ca}, BETA=${cb}, GAMMA=${cg} (total ${ca + cb + cg})\n`);

  const keyLines: string[] = [
    '# Generado por prisma/seed.ts — NO subir a git. Usar solo en local/QA.',
    `# ${new Date().toISOString()}`,
    '',
  ];

  for (const u of USERS) {
    const uid = userByLocal.get(u.local)!.id;
    const em = email(u.local);
    const token = generateToken();
    await prisma.apiKey.create({
      data: {
        userId: uid,
        keyHash: hashToken(token),
        name: `Seed QA · ${u.local}`,
      },
    });
    const line = `${em}\t${token}`;
    keyLines.push(line);
    console.log(`🔑 ${em}`);
    console.log(`   ${token}\n`);
  }

  writeFileSync(KEY_FILE, keyLines.join('\n'), 'utf8');
  console.log(`📄 Claves guardadas también en: ${KEY_FILE}\n`);

  console.log('✨ Seed completado.');
  console.log('   Inicia sesión con Clerk usando usuarios reales, o prueba la API con:');
  console.log('   curl -H "X-API-Key: <token>" http://localhost:3000/api/users/me');
  console.log('\n   Nota: usuarios seed tienen clerkUserId sintético; el login web sigue siendo tu cuenta Clerk.');
  console.log('   Para E2E/API, usa las API keys de arriba con el userId resuelto por verify.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
