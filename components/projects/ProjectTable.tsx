'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MoreHorizontal, Archive, Pencil, Users, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { CreateProjectDialog } from './CreateProjectDialog';
import type { ProjectStatus } from '@prisma/client';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  _count: { memberships: number; dailyReports: number };
}

interface Props {
  projects: Project[];
}

export function ProjectTable({ projects }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [archiving, setArchiving] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleArchive(id: string, name: string) {
    setArchiving(id);
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    setArchiving(null);

    if (res.ok) {
      toast.success(`"${name}" archivado correctamente`);
      refresh();
    } else {
      toast.error('Error al archivar el proyecto');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
        </p>
        <CreateProjectDialog onCreated={refresh} />
      </div>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Proyecto</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Miembros</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Reportes</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No hay proyectos creados aún
                </td>
              </tr>
            )}
            {projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {project.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="px-4 py-3 text-center tabular-nums">
                  <span className="flex items-center justify-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    {project._count.memberships}
                  </span>
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                  {project._count.dailyReports}
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/admin/projects/${project.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/admin/projects/${project.id}?edit=1`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={project.status === 'ARCHIVED' || archiving === project.id}
                        onClick={() => handleArchive(project.id, project.name)}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        {archiving === project.id ? 'Archivando...' : 'Archivar'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
