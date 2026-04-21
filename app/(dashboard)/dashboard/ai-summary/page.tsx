import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { userService } from '@/lib/services/user.service';
import { aiService } from '@/lib/services/ai.service';
import { AISummaryCard } from '@/components/ai/AISummaryCard';
import { GenerateSummaryButton } from '@/components/ai/GenerateSummaryButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Cpu, History, FolderOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AISummaryPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect('/sign-in');

  const user = await userService.findByClerkId(clerkUserId);
  if (!user) redirect('/sign-in');

  // Solo TECH_LEAD y ADMIN acceden a esta sección
  if (user.role !== 'TECH_LEAD' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Proyectos donde es Tech Lead o Admin (ve todos)
  const projects = await prisma.projectUser.findMany({
    where: {
      userId: user.id,
      ...(user.role === 'TECH_LEAD' ? { isTechLead: true } : {}),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          _count: {
            select: { dailyReports: true, memberships: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const activeProjects = projects
    .map((p) => p.project)
    .filter((p) => p.status === 'ACTIVE');

  // Pre-cargar historial del primer proyecto activo
  const firstProjectId = activeProjects[0]?.id ?? null;
  const initialHistory = firstProjectId
    ? await aiService.getProjectSummaryHistory(firstProjectId)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="h-8 w-8 text-primary" />
          Resúmenes de IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Genera análisis ejecutivos inteligentes del progreso del equipo con
          Gemini
        </p>
      </div>

      {activeProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No tienes proyectos activos como Tech Lead.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Un Admin debe asignarte a un proyecto activo primero.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={activeProjects[0]!.id}>
          <TabsList className="flex-wrap h-auto gap-1">
            {activeProjects.map((p) => (
              <TabsTrigger key={p.id} value={p.id} className="text-sm">
                {p.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({p._count.memberships} miembros)
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {activeProjects.map((project, idx) => (
            <TabsContent key={project.id} value={project.id} className="mt-6 space-y-6">
              {/* Sección de generación */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Generar Nuevo Resumen</h2>
                <p className="text-sm text-muted-foreground">
                  Gemini analizará todos los reportes del equipo de hoy para{' '}
                  <strong>{project.name}</strong> y generará un informe
                  ejecutivo estructurado.
                </p>
                <div className="pt-2">
                  <GenerateSummaryButton projectId={project.id} />
                </div>
              </div>

              {/* Historial de resúmenes */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial de Resúmenes
                </h2>

                {idx === 0 && initialHistory.length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Aún no se han generado resúmenes para este proyecto. ¡Genera
                      el primero!
                    </CardContent>
                  </Card>
                )}

                {idx === 0 &&
                  initialHistory.map((summary, i) => (
                    <AISummaryCard
                      key={summary.id}
                      summary={summary}
                      isLatest={i === 0}
                    />
                  ))}

                {idx !== 0 && (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Selecciona este proyecto para ver su historial.
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
