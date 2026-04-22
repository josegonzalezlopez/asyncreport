import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { userService } from '@/lib/services/user.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Sparkles, Users, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectWorkspacePage({ params }: Props) {
  const { projectId } = await params;

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await userService.findByClerkId(userId);
  if (!user) redirect('/sign-in');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      _count: { select: { memberships: true, dailyReports: true } },
    },
  });

  if (!project) redirect('/dashboard/projects');

  const canTeam =
    user.role === 'TECH_LEAD' || user.role === 'ADMIN';
  const canAi =
    (user.role === 'TECH_LEAD' || user.role === 'ADMIN') &&
    (user.role === 'ADMIN' ||
      (await prisma.projectUser.findFirst({
        where: { projectId, userId: user.id, isTechLead: true },
      })) !== null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-muted-foreground mt-1">
          Código <span className="font-mono text-xs">{project.code}</span> ·{' '}
          {project._count.memberships} miembros · {project._count.dailyReports}{' '}
          reportes
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Mis Dailies
            </CardTitle>
            <CardDescription>
              Carga y revisa tus reportes en este proyecto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/dashboard/p/${projectId}/dailies`}>
                Ir a dailies
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {canTeam && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Equipo
              </CardTitle>
              <CardDescription>
                Feed de reportes del proyecto y miembros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/dashboard/p/${projectId}/team`}>
                  Ver equipo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {canAi && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Resumen IA
              </CardTitle>
              <CardDescription>
                Genera y consulta resúmenes ejecutivos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/dashboard/p/${projectId}/ai-summary`}>
                  Ir a resumen IA
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
