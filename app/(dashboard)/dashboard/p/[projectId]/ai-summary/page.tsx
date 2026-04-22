import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { userService } from '@/lib/services/user.service';
import { aiService } from '@/lib/services/ai.service';
import { AISummaryCard } from '@/components/ai/AISummaryCard';
import { GenerateSummaryButton } from '@/components/ai/GenerateSummaryButton';
import { Card, CardContent } from '@/components/ui/card';
import { AISummaryStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Cpu, History, FolderOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectAISummaryPage({ params }: Props) {
  const { projectId } = await params;

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect('/sign-in');

  const user = await userService.findByClerkId(clerkUserId);
  if (!user) redirect('/sign-in');

  if (user.role !== 'TECH_LEAD' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const membership = await prisma.projectUser.findUnique({
    where: {
      userId_projectId: { userId: user.id, projectId },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { memberships: true } },
        },
      },
    },
  });

  if (!membership || membership.project.status !== 'ACTIVE') {
    redirect('/dashboard/projects');
  }

  if (user.role === 'TECH_LEAD' && !membership.isTechLead) {
    redirect('/dashboard');
  }

  const project = membership.project;
  const history = await aiService.getProjectSummaryHistory(projectId);
  const firstCompletedId = history.find((s) => s.status === AISummaryStatus.COMPLETED)?.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="h-8 w-8 text-primary" />
          Resúmenes de IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Proyecto <strong>{project.name}</strong> —{' '}
          {project._count.memberships} miembros
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Generar nuevo resumen</h2>
        <p className="text-sm text-muted-foreground">
          Gemini analizará los reportes del equipo de hoy para{' '}
          <strong>{project.name}</strong> y generará un informe ejecutivo
          estructurado.
        </p>
        <div className="pt-2">
          <GenerateSummaryButton projectId={project.id} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" />
          Historial de resúmenes
        </h2>

        {history.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Aún no hay resúmenes para este proyecto. ¡Genera el primero!
              </p>
            </CardContent>
          </Card>
        ) : (
          history.map((summary) => {
            if (summary.status !== AISummaryStatus.COMPLETED) {
              const label =
                summary.status === AISummaryStatus.PROCESSING
                  ? 'Generando resumen…'
                  : summary.status === AISummaryStatus.PENDING
                    ? 'Resumen en cola'
                    : 'Resumen en proceso';
              return (
                <Card key={summary.id} className="border-border/60">
                  <CardContent className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <Badge variant="secondary">{summary.status}</Badge>
                  </CardContent>
                </Card>
              );
            }
            return (
              <AISummaryCard
                key={summary.id}
                summary={summary}
                isLatest={summary.id === firstCompletedId}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
