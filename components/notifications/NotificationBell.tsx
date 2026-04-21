'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { NotificationList } from './NotificationList';
import { cn } from '@/lib/utils';

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

const POLL_INTERVAL = 30_000;

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) return;
      const json = await res.json() as { data: { count: number } };
      setUnreadCount(json.data.count);
    } catch {
      // silencioso — no interrumpir la UI
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications?take=30');
      if (!res.ok) return;
      const json = await res.json() as { data: { items: Notification[] } };
      setNotifications(json.data.items);
      setUnreadCount(json.data.items.filter((n) => !n.isRead).length);
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Polling cada 30s, pausado con Page Visibility API
  useEffect(() => {
    fetchUnreadCount();

    function startPolling() {
      intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
    }
    function stopPolling() {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    startPolling();

    function handleVisibility() {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchUnreadCount();
        startPolling();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchUnreadCount]);

  // Cargar lista completa al abrir el panel
  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (value) fetchNotifications();
  }

  async function handleMarkAllRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silencioso
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silencioso
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          className="relative flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground',
                unreadCount > 9 && 'w-5 text-[9px]',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[360px] p-0">
        <SheetTitle className="sr-only">Panel de notificaciones</SheetTitle>
        <NotificationList
          notifications={notifications}
          isLoading={isLoading}
          onMarkAllRead={handleMarkAllRead}
          onMarkRead={handleMarkRead}
        />
      </SheetContent>
    </Sheet>
  );
}
