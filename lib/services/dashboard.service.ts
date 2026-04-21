import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalUsers: number;
  dailiestoday: number;
  blockersToday: number;
}

const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const [totalProjects, activeProjects, totalUsers, dailiestoday, blockersToday] =
    await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { NOT: { clerkUserId: { startsWith: 'DELETED_' } } } }),
      prisma.dailyReport.count({
        where: { reportDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.dailyReport.count({
        where: {
          isBlocker: true,
          reportDate: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

  return { totalProjects, activeProjects, totalUsers, dailiestoday, blockersToday };
};

export const getDashboardMetrics = unstable_cache(
  fetchDashboardMetrics,
  ['dashboard-metrics'],
  {
    revalidate: 300, // 5 minutos
    tags: ['dashboard-metrics'],
  },
);
