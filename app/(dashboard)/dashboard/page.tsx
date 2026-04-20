import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { userService } from '@/lib/services/user.service';
import {
  FileText,
  FolderKanban,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STAT_CARDS = [
  {
    title: 'Proyectos activos',
    value: '—',
    icon: FolderKanban,
    description: 'Próximamente',
  },
  {
    title: 'Dailies esta semana',
    value: '—',
    icon: FileText,
    description: 'Próximamente',
  },
  {
    title: 'Resúmenes IA',
    value: '—',
    icon: Sparkles,
    description: 'Próximamente',
  },
  {
    title: 'Racha actual',
    value: '—',
    icon: TrendingUp,
    description: 'Próximamente',
  },
];

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await userService.findByClerkId(userId);
  if (!user) redirect('/sign-in');

  const firstName = user.name?.split(' ')[0] ?? 'equipo';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Hola, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aquí tienes el resumen de tu actividad
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ title, value, icon: Icon, description }) => (
          <Card key={title} className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder para próximas fases */}
      <Card className="border-border/50 border-dashed bg-transparent">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">
            El feed de dailies y métricas del equipo se implementan en la Fase 2 y 3
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Base de autenticación lista ✓
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
