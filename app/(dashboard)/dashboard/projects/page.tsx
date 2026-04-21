import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { projectService } from '@/lib/services/project.service';
import { userService } from '@/lib/services/user.service';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Users, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await userService.findByClerkId(userId);
  if (!user) redirect('/sign-in');

  const projects = await projectService.findProjectsForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
        <p className="text-muted-foreground mt-1">
          Proyectos en los que participas
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-24 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="font-medium text-muted-foreground">Sin proyectos asignados</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Contacta al Admin para que te asigne a un proyecto
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <ProjectStatusBadge status={project.status} />
                </div>
              </CardHeader>
              <CardContent className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {project._count.memberships}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {project._count.dailyReports} reportes
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
