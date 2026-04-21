import { projectService } from '@/lib/services/project.service';
import { ProjectTable } from '@/components/projects/ProjectTable';

export const dynamic = 'force-dynamic';

export default async function AdminProjectsPage() {
  const projects = await projectService.findAll();

  // Serializar fechas para el Client Component
  const serialized = projects.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona proyectos, miembros y Tech Leads
        </p>
      </div>
      <ProjectTable projects={serialized} />
    </div>
  );
}
