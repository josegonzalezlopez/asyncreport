import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { userService } from '@/lib/services/user.service';
import { projectService } from '@/lib/services/project.service';
import { dailyService } from '@/lib/services/daily.service';
import { DailyCard } from '@/components/dailies/DailyCard';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await userService.findByClerkId(userId);
  if (!user) redirect('/sign-in');

  const projects = await projectService.findProjectsForUser(user.id);
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE');

  // Feed del primer proyecto activo
  const project = activeProjects[0] ?? null;
  const feed = project
    ? await dailyService.findByProject(project.id, { take: 20 })
    : { items: [], nextCursor: null };

  const blockers = feed.items.filter((d) => d.isBlocker);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vista de Equipo</h1>
          <p className="text-muted-foreground mt-1">
            {project ? `Proyecto: ${project.name}` : 'Sin proyectos activos'}
          </p>
        </div>
        {blockers.length > 0 && (
          <Badge
            variant="outline"
            className="border-destructive/50 text-destructive gap-1.5 px-3 py-1.5"
          >
            <AlertTriangle className="h-4 w-4" />
            {blockers.length} bloqueador{blockers.length > 1 ? 'es' : ''} activo{blockers.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {feed.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-24 text-center">
          <p className="font-medium text-muted-foreground">
            {project
              ? 'No hay dailies cargados hoy todavía'
              : 'No tienes proyectos activos asignados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {feed.items.map((daily) => (
            <DailyCard
              key={daily.id}
              {...daily}
              reportDate={daily.reportDate.toISOString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
