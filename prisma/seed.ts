import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed...');

  // Busca el primer usuario registrado (el admin)
  const admin = await prisma.user.findFirst({
    where: { NOT: { clerkUserId: { startsWith: 'DELETED_' } } },
    orderBy: { createdAt: 'asc' },
  });

  if (!admin) {
    console.error('❌ No hay usuarios en la DB. Inicia sesión primero.');
    process.exit(1);
  }

  console.log(`👤 Usuario encontrado: ${admin.name} (${admin.email})`);

  // Actualiza el rol a ADMIN si no lo es ya
  if (admin.role !== 'ADMIN') {
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN' },
    });
    console.log('🔑 Rol actualizado a ADMIN');
  }

  // Crea proyectos de ejemplo
  const projects = await Promise.all([
    prisma.project.upsert({
      where: { code: 'ASYNC-API' },
      update: {},
      create: {
        name: 'AsyncReport API',
        code: 'ASYNC-API',
        description: 'Backend principal de AsyncReport: API REST, servicios y lógica de negocio.',
        status: 'ACTIVE',
      },
    }),
    prisma.project.upsert({
      where: { code: 'ASYNC-WEB' },
      update: {},
      create: {
        name: 'AsyncReport Web',
        code: 'ASYNC-WEB',
        description: 'Frontend Next.js: dashboard, formularios y visualización de reportes.',
        status: 'ACTIVE',
      },
    }),
    prisma.project.upsert({
      where: { code: 'ASYNC-INFRA' },
      update: {},
      create: {
        name: 'Infraestructura',
        code: 'ASYNC-INFRA',
        description: 'CI/CD, Vercel, Supabase y configuración de entornos.',
        status: 'PAUSED',
      },
    }),
  ]);

  console.log(`📁 ${projects.length} proyectos creados`);

  // Asigna al admin como Tech Lead en los primeros dos proyectos
  for (const project of projects.slice(0, 2)) {
    await prisma.projectUser.upsert({
      where: {
        userId_projectId: { userId: admin.id, projectId: project.id },
      },
      update: {},
      create: {
        userId: admin.id,
        projectId: project.id,
        isTechLead: true,
      },
    });
  }

  console.log('✅ Admin asignado como Tech Lead en AsyncReport API y Web');

  // Daily reports de ejemplo para los últimos 3 días
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const apiProject = projects[0]!;

  const dailyData = [
    {
      daysAgo: 0,
      yesterday: 'Implementé el servicio de proyectos con CRUD completo y soft-delete para archivar.',
      today: 'Voy a trabajar en el servicio de daily reports y la lógica de canUserReport.',
      blockers: null,
      mood: 4,
    },
    {
      daysAgo: 1,
      yesterday: 'Configuré la infraestructura de testing con Vitest y escribí los primeros tests unitarios.',
      today: 'Implementar el CRUD de proyectos y el panel de admin.',
      blockers: null,
      mood: 5,
    },
    {
      daysAgo: 2,
      yesterday: 'Configuré Clerk, el middleware de autenticación y el webhook de sincronización de usuarios.',
      today: 'Trabajar en la migración inicial de Prisma y conectar Supabase.',
      blockers: 'La configuración de Prisma 7 con el nuevo adapter-pg requirió más tiempo del esperado.',
      mood: 3,
    },
  ];

  for (const data of dailyData) {
    const reportDate = new Date(today);
    reportDate.setUTCDate(reportDate.getUTCDate() - data.daysAgo);

    const existing = await prisma.dailyReport.findFirst({
      where: {
        userId: admin.id,
        projectId: apiProject.id,
        reportDate,
      },
    });

    if (existing) continue;

    const isBlocker = Boolean(data.blockers?.trim());

    if (isBlocker) {
      await prisma.$transaction(async (tx) => {
        const daily = await tx.dailyReport.create({
          data: {
            userId: admin.id,
            projectId: apiProject.id,
            yesterday: data.yesterday,
            today: data.today,
            blockers: data.blockers,
            isBlocker: true,
            mood: data.mood,
            userTimezone: 'America/Argentina/Buenos_Aires',
            reportDate,
          },
        });

        await tx.notification.create({
          data: {
            type: 'BLOCKER_ALERT',
            title: '⚠️ Bloqueador detectado',
            message: data.blockers!,
            projectId: apiProject.id,
            metadata: { dailyReportId: daily.id, userId: admin.id },
          },
        });
      });
    } else {
      await prisma.dailyReport.create({
        data: {
          userId: admin.id,
          projectId: apiProject.id,
          yesterday: data.yesterday,
          today: data.today,
          isBlocker: false,
          mood: data.mood,
          userTimezone: 'America/Argentina/Buenos_Aires',
          reportDate,
        },
      });
    }
  }

  console.log('📝 Daily reports de ejemplo creados (últimos 3 días)');
  console.log('\n✨ Seed completado. Abre /dashboard para ver los datos.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
