import { getDashboardMetrics } from '@/lib/services/dashboard.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FolderKanban,
  Activity,
  Users,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  const cards = [
    {
      title: 'Total proyectos',
      value: metrics.totalProjects,
      icon: FolderKanban,
      description: `${metrics.activeProjects} activos`,
    },
    {
      title: 'Proyectos activos',
      value: metrics.activeProjects,
      icon: Activity,
      description: 'En progreso ahora',
    },
    {
      title: 'Usuarios',
      value: metrics.totalUsers,
      icon: Users,
      description: 'Registrados en el sistema',
    },
    {
      title: 'Dailies hoy',
      value: metrics.dailiestoday,
      icon: FileText,
      description: 'Reportes cargados hoy',
    },
    {
      title: 'Bloqueadores hoy',
      value: metrics.blockersToday,
      icon: AlertTriangle,
      description: 'Requieren atención',
      highlight: metrics.blockersToday > 0,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Admin</h1>
          <p className="text-muted-foreground mt-1">
            Vista general del sistema · actualización cada 5 min
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/projects">Gestionar proyectos</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ title, value, icon: Icon, description, highlight }) => (
          <Card
            key={title}
            className={`border-border/50 bg-card/50 ${highlight ? 'border-destructive/50' : ''}`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon
                className={`h-4 w-4 ${highlight ? 'text-destructive' : 'text-muted-foreground'}`}
              />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${highlight ? 'text-destructive' : ''}`}>
                {value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
