import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { userService } from '@/lib/services/user.service';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { ApiKeysManager } from '@/components/profile/ApiKeysManager';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FolderKanban, User, ShieldCheck, KeyRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  TECH_LEAD: 'Tech Lead',
  USER: 'Usuario',
};

const SPEC_LABEL: Record<string, string> = {
  DEVELOPER: 'Developer',
  DESIGNER: 'Designer',
  ANALYST: 'Analyst',
  QA: 'QA',
  DEVOPS: 'DevOps',
  OTHER: 'Otro',
};

export default async function ProfilePage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect('/sign-in');

  const user = await userService.findByClerkId(clerkUserId);
  if (!user) redirect('/sign-in');

  const memberships = await prisma.projectUser.findMany({
    where: { userId: user.id },
    include: {
      project: { select: { id: true, name: true, code: true, status: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu información personal y preferencias
        </p>
      </div>

      {/* Info personal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar + nombre */}
          <div className="flex items-center gap-4">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.name ?? 'Avatar'}
                width={64}
                height={64}
                className="rounded-full border border-border/50"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground">
                {user.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <p className="font-semibold text-lg">{user.name ?? '—'}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">
              <ShieldCheck className="h-3 w-3 mr-1" />
              {ROLE_LABEL[user.role] ?? user.role}
            </Badge>
            <Badge variant="outline">
              {SPEC_LABEL[user.specialization] ?? user.specialization}
            </Badge>
          </div>

          <Separator />

          {/* Formulario de edición */}
          <EditProfileForm
            currentName={user.name ?? ''}
            currentSpecialization={user.specialization}
          />
        </CardContent>
      </Card>

      {/* API Keys para CLI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            API Keys (CLI)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Genera tokens para autenticar el CLI sin exponer tu contraseña.
            Cada token se muestra una sola vez al generarlo.
          </p>
        </CardHeader>
        <CardContent>
          <ApiKeysManager />
        </CardContent>
      </Card>

      {/* Proyectos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Mis Proyectos ({memberships.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aún no estás asignado a ningún proyecto.
            </p>
          ) : (
            <div className="space-y-2">
              {memberships.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{m.project.name}</p>
                    {m.project.code && (
                      <p className="text-xs text-muted-foreground">
                        {m.project.code}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.isTechLead && (
                      <Badge variant="secondary" className="text-xs">
                        Tech Lead
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        m.project.status === 'ACTIVE'
                          ? 'border-green-500/30 text-green-400'
                          : 'text-muted-foreground'
                      }
                    >
                      {m.project.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
