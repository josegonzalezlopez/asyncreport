import { notFound } from 'next/navigation';
import Link from 'next/link';
import { projectService } from '@/lib/services/project.service';
import { userService } from '@/lib/services/user.service';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { EditProjectForm } from '@/components/projects/EditProjectSheet';
import { ManageMembersPanel } from '@/components/projects/ManageMembersPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { edit } = await searchParams;

  const [project, allUsers] = await Promise.all([
    projectService.findById(id),
    userService.findAll(),
  ]);

  if (!project) notFound();

  const isEditing = edit === '1';

  // Serializar para Client Components
  const membersForPanel = project.memberships.map((m) => ({
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      imageUrl: m.user.imageUrl,
      specialization: m.user.specialization,
      role: m.user.role,
    },
    isTechLead: m.isTechLead,
  }));

  const usersForPanel = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    imageUrl: u.imageUrl,
    specialization: u.specialization,
    role: u.role,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/admin/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/admin/projects/${id}?edit=1`}>Editar</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Panel de gestión de miembros */}
        <Card className="lg:col-span-2 border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gestión de Miembros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ManageMembersPanel
              projectId={project.id}
              currentMembers={membersForPanel}
              allUsers={usersForPanel}
            />
          </CardContent>
        </Card>

        {/* Sidebar derecho */}
        <div className="space-y-4">
          {isEditing && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Editar proyecto</CardTitle>
              </CardHeader>
              <CardContent>
                <EditProjectForm
                  project={{
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    status: project.status,
                  }}
                  onClose={undefined}
                  onUpdated={undefined}
                />
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total reportes</span>
                <span className="font-medium">{project._count.dailyReports}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Miembros</span>
                <span className="font-medium">{project.memberships.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado</span>
                <span className="font-medium">
                  {new Date(project.createdAt).toLocaleDateString('es-AR')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
