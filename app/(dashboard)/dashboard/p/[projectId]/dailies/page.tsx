import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { userService } from '@/lib/services/user.service';
import { projectService } from '@/lib/services/project.service';
import { dailyService } from '@/lib/services/daily.service';
import { CreateDailyForm } from '@/components/dailies/CreateDailyForm';
import { DailyCard } from '@/components/dailies/DailyCard';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectDailiesPage({ params }: Props) {
  const { projectId } = await params;

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await userService.findByClerkId(userId);
  if (!user) redirect('/sign-in');

  /** El POST de daily exige membresía; el selector no puede listar proyectos solo por ser ADMIN. */
  const projects = await projectService.findMemberProjectsForUser(user.id);
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE');

  /** Historial propio: consulta directa por usuario+proyecto (no mezclar con el feed global del proyecto). */
  const myDailies = await dailyService.findByUser(user.id, projectId, { take: 10 });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Dailies</h1>
        <p className="text-muted-foreground mt-1">
          Carga tu reporte diario y consulta tu historial en este proyecto
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          {activeProjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-muted-foreground">
              No tienes proyectos activos asignados.
              <br />
              Contacta al Admin.
            </div>
          ) : (
            <CreateDailyForm
              projects={activeProjects.map((p) => ({ id: p.id, name: p.name }))}
              defaultProjectId={projectId}
            />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Mis últimos reportes (este proyecto)
          </h2>
          {myDailies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aún no tienes reportes en este proyecto. ¡Carga tu primer daily!
            </p>
          ) : (
            <div className="space-y-3">
              {myDailies.map((daily) => (
                <DailyCard
                  key={daily.id}
                  {...daily}
                  reportDate={daily.reportDate.toISOString()}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
