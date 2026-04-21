import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { Specialization } from '@prisma/client';

const MOOD_EMOJI: Record<number, string> = {
  1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄',
};

interface DailyUser {
  id: string;
  name: string | null;
  imageUrl: string | null;
  specialization: Specialization;
}

interface DailyCardProps {
  id: string;
  yesterday: string;
  today: string;
  blockers?: string | null;
  isBlocker: boolean;
  mood: number;
  reportDate: string;
  user: DailyUser;
}

export function DailyCard({
  yesterday,
  today,
  blockers,
  isBlocker,
  mood,
  reportDate,
  user,
}: DailyCardProps) {
  const date = new Date(reportDate).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 transition-colors ${
        isBlocker
          ? 'border-destructive/40 bg-destructive/5'
          : 'border-border/50 bg-card/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.imageUrl ?? undefined} />
            <AvatarFallback>{user.name?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {user.specialization.toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isBlocker && (
            <Badge variant="outline" className="border-destructive/50 text-destructive text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Bloqueador
            </Badge>
          )}
          <span className="text-lg" title={`Mood: ${mood}/5`}>
            {MOOD_EMOJI[mood] ?? '😐'}
          </span>
        </div>
      </div>

      {/* Fecha */}
      <p className="text-xs text-muted-foreground capitalize">{date}</p>

      {/* Contenido */}
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Ayer
          </p>
          <p className="leading-relaxed">{yesterday}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Hoy
          </p>
          <p className="leading-relaxed">{today}</p>
        </div>
        {blockers && (
          <div>
            <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-1">
              Bloqueadores
            </p>
            <p className="leading-relaxed text-destructive/80">{blockers}</p>
          </div>
        )}
      </div>
    </div>
  );
}
