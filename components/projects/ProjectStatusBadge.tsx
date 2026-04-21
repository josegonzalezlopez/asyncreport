import { Badge } from '@/components/ui/badge';
import type { ProjectStatus } from '@prisma/client';

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: 'Activo',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  PAUSED: {
    label: 'Pausado',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  FINISHED: {
    label: 'Finalizado',
    className: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  ARCHIVED: {
    label: 'Archivado',
    className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
