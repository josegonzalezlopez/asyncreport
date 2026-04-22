'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, AlertTriangle, Cpu, UserPlus, Info, CheckCheck } from 'lucide-react';

interface Notification {
  id: string;
  type: 'ASSIGNMENT' | 'BLOCKER_ALERT' | 'AI_SUMMARY_READY' | 'SYSTEM';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  projectId?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface NotificationListProps {
  notifications: Notification[];
  isLoading?: boolean;
  onMarkAllRead: () => Promise<void>;
  onMarkRead: (id: string) => Promise<void>;
}

const TYPE_CONFIG = {
  ASSIGNMENT: {
    icon: UserPlus,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  BLOCKER_ALERT: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
  },
  AI_SUMMARY_READY: {
    icon: Cpu,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
  SYSTEM: {
    icon: Info,
    color: 'text-muted-foreground',
    bg: 'bg-muted/30',
  },
} as const;

function getNavLink(n: Notification): string | null {
  if (n.type === 'BLOCKER_ALERT' && n.projectId) {
    return `/dashboard/p/${n.projectId}/team`;
  }
  if (n.type === 'AI_SUMMARY_READY' && n.projectId) {
    return `/dashboard/p/${n.projectId}/ai-summary`;
  }
  if (n.type === 'AI_SUMMARY_READY') {
    return '/dashboard/ai-summary';
  }
  if (n.type === 'ASSIGNMENT' && n.projectId) return `/dashboard/projects`;
  return null;
}

export function NotificationList({
  notifications,
  isLoading,
  onMarkAllRead,
  onMarkRead,
}: NotificationListProps) {
  const router = useRouter();

  async function handleClick(n: Notification) {
    if (!n.isRead) await onMarkRead(n.id);
    const link = getNavLink(n);
    if (link) router.push(link);
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <span className="font-semibold text-sm">
          Notificaciones
          {unreadCount > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({unreadCount} sin leer)
            </span>
          )}
        </span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={onMarkAllRead}
          >
            <CheckCheck className="h-3 w-3" />
            Marcar todas
          </Button>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Sin notificaciones</p>
          </div>
        )}

        {!isLoading &&
          notifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.SYSTEM;
            const Icon = cfg.icon;
            const timeAgo = formatDistanceToNow(new Date(n.createdAt), {
              addSuffix: true,
              locale: es,
            });

            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'w-full text-left px-4 py-3 flex gap-3 items-start transition-colors hover:bg-accent/50 border-b border-border/30 last:border-0',
                  !n.isRead && 'bg-accent/20',
                )}
              >
                {/* Icono */}
                <div
                  className={cn(
                    'flex-shrink-0 rounded-full p-1.5 mt-0.5',
                    cfg.bg,
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium leading-tight truncate',
                      !n.isRead ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {timeAgo}
                  </p>
                </div>

                {/* Dot sin leer */}
                {!n.isRead && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}
