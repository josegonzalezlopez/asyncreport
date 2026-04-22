import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { userService } from '@/lib/services/user.service';
import { dailyService } from '@/lib/services/daily.service';
import { prisma } from '@/lib/db';
import { DailyCard } from '@/components/dailies/DailyCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectTeamPage({ params }: Props) {
  const { projectId } = await params;

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await userService.findByClerkId(userId);
  if (!user) redirect('/sign-in');

  if (user.role !== 'TECH_LEAD' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      name: true,
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
              specialization: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const feed = await dailyService.findByProject(projectId, { take: 20 });
  const blockers = feed.items.filter((d) => d.isBlocker);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vista de Equipo</h1>
          <p className="text-muted-foreground mt-1">
            {project ? `Proyecto: ${project.name}` : 'Proyecto'}
          </p>
        </div>
        {blockers.length > 0 && (
          <Badge
            variant="outline"
            className="border-destructive/50 text-destructive gap-1.5 px-3 py-1.5"
          >
            <AlertTriangle className="h-4 w-4" />
            {blockers.length} bloqueador{blockers.length > 1 ? 'es' : ''} activo
            {blockers.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {project && project.memberships.length > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Miembros del proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-4">
              {project.memberships.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.user.imageUrl ?? undefined} alt="" />
                    <AvatarFallback>
                      {(m.user.name ?? m.user.email).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium leading-tight">
                      {m.user.name ?? m.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.isTechLead ? 'Tech Lead' : m.user.role} ·{' '}
                      {m.user.specialization}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Feed de reportes</h2>
        {feed.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16 text-center px-4">
            <p className="font-medium text-muted-foreground">
              No hay dailies cargados en este proyecto todavía
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Cuando el equipo cargue reportes, aparecerán aquí. Arriba ves quién
              forma parte del proyecto.
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
    </div>
  );
}
