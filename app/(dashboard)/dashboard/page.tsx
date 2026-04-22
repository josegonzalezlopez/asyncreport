import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { userService } from '@/lib/services/user.service';
import { getUserDashboardStats } from '@/lib/services/dashboard.service';
import {
  FileText,
  FolderKanban,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await userService.findByClerkId(userId);
  if (!user) redirect('/sign-in');

  const stats = await getUserDashboardStats(user.id);
  const firstName = user.name?.split(' ')[0] ?? 'equipo';

  const cards = [
    {
      title: 'Proyectos activos',
      value: String(stats.activeProjects),
      icon: FolderKanban,
      description: 'En los que participas',
    },
    {
      title: 'Dailies esta semana',
      value: String(stats.dailiesThisWeek),
      icon: FileText,
      description: 'Reportes enviados (lun–dom)',
    },
    {
      title: 'Resúmenes IA',
      value: String(stats.aiSummariesCompleted),
      icon: Sparkles,
      description: 'Completados en tus proyectos',
    },
    {
      title: 'Racha actual',
      value: stats.streakDays > 0 ? `${stats.streakDays} días` : '—',
      icon: TrendingUp,
      description:
        stats.streakDays > 0
          ? 'Días seguidos con al menos un daily'
          : 'Sin racha activa (reporta hoy o ayer)',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Hola, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aquí tienes el resumen de tu actividad
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ title, value, icon: Icon, description }) => (
          <Card key={title} className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 border-dashed bg-transparent">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
          <div>
            <p className="font-medium text-foreground">
              Ir a tus proyectos y espacio de trabajo
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Abre un proyecto para cargar dailies, ver el equipo o generar resúmenes IA.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/projects">Ver proyectos</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
