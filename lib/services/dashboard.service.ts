import { unstable_cache } from 'next/cache';
import { startOfWeek, endOfWeek } from 'date-fns';
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

export interface UserDashboardStats {
  activeProjects: number;
  dailiesThisWeek: number;
  aiSummariesCompleted: number;
  streakDays: number;
}

/**
 * Métricas agregadas para la home `/dashboard` del usuario autenticado.
 */
export async function getUserDashboardStats(userId: string): Promise<UserDashboardStats> {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const [activeProjects, dailiesThisWeek, aiSummariesCompleted, recentReports] =
    await Promise.all([
      prisma.project.count({
        where: {
          status: 'ACTIVE',
          memberships: { some: { userId } },
        },
      }),
      prisma.dailyReport.count({
        where: {
          userId,
          reportDate: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.aISummary.count({
        where: {
          status: 'COMPLETED',
          project: { memberships: { some: { userId } } },
        },
      }),
      prisma.dailyReport.findMany({
        where: { userId },
        select: { reportDate: true },
        orderBy: { reportDate: 'desc' },
        take: 120,
      }),
    ]);

  const streakDays = computeReportingStreakDays(recentReports.map((r) => r.reportDate));

  return {
    activeProjects,
    dailiesThisWeek,
    aiSummariesCompleted,
    streakDays,
  };
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Racha: días consecutivos con al menos un daily (clave día UTC alineada a reportDate). */
function computeReportingStreakDays(reportDates: Date[]): number {
  const days = new Set(reportDates.map((d) => utcDayKey(d)));
  if (days.size === 0) return 0;

  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  let key = utcDayKey(cursor);
  if (!days.has(key)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    key = utcDayKey(cursor);
    if (!days.has(key)) return 0;
  }

  let streak = 0;
  while (days.has(key)) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    key = utcDayKey(cursor);
  }
  return streak;
}
