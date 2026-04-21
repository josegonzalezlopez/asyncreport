import { notFound } from 'next/navigation';
import Link from 'next/link';
import { projectService } from '@/lib/services/project.service';
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge';
import { EditProjectForm } from '@/components/projects/EditProjectSheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { edit } = await searchParams;

  const project = await projectService.findById(id);
  if (!project) notFound();

  const isEditing = edit === '1';

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
        {/* Miembros */}
        <Card className="lg:col-span-2 border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">
              Miembros ({project.memberships.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sin miembros asignados
              </p>
            ) : (
              <ul className="space-y-3">
                {project.memberships.map(({ user, isTechLead }) => (
                  <li key={user.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.imageUrl ?? undefined} />
                      <AvatarFallback>
                        {user.name?.[0]?.toUpperCase() ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {user.specialization.toLowerCase()}
                      </Badge>
                      {isTechLead && (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Tech Lead
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Editar / Stats */}
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
