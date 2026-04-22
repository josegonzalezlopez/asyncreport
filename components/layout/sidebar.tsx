'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Sparkles,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';

type NavKey =
  | 'dashboard'
  | 'projects'
  | 'dailies'
  | 'team'
  | 'ai-summary'
  | 'admin';

interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

interface SidebarProps {
  userRole?: string;
  workspaceProjectId: string | null;
  aiWorkspaceProjectId: string | null;
}

function buildNavItems(
  workspaceProjectId: string | null,
  aiWorkspaceProjectId: string | null,
): NavItem[] {
  const dailiesHref = workspaceProjectId
    ? `/dashboard/p/${workspaceProjectId}/dailies`
    : '/dashboard/projects';
  const teamHref = workspaceProjectId
    ? `/dashboard/p/${workspaceProjectId}/team`
    : '/dashboard/projects';
  const aiHref = aiWorkspaceProjectId
    ? `/dashboard/p/${aiWorkspaceProjectId}/ai-summary`
    : '/dashboard/projects';

  return [
    {
      key: 'dashboard',
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      key: 'projects',
      href: '/dashboard/projects',
      label: 'Proyectos',
      icon: FolderKanban,
    },
    {
      key: 'dailies',
      href: dailiesHref,
      label: 'Mis Dailies',
      icon: FileText,
    },
    {
      key: 'team',
      href: teamHref,
      label: 'Equipo',
      icon: Users,
      roles: ['TECH_LEAD', 'ADMIN'],
    },
    {
      key: 'ai-summary',
      href: aiHref,
      label: 'Resumen IA',
      icon: Sparkles,
      roles: ['TECH_LEAD', 'ADMIN'],
    },
    {
      key: 'admin',
      href: '/dashboard/admin',
      label: 'Admin',
      icon: Settings,
      roles: ['ADMIN'],
    },
  ];
}

function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.key === 'dashboard') {
    return pathname === '/dashboard';
  }
  if (item.key === 'dailies') {
    return /^\/dashboard\/p\/[^/]+\/dailies$/.test(pathname);
  }
  if (item.key === 'team') {
    return /^\/dashboard\/p\/[^/]+\/team$/.test(pathname);
  }
  if (item.key === 'ai-summary') {
    return /^\/dashboard\/p\/[^/]+\/ai-summary$/.test(pathname);
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Sidebar({
  userRole,
  workspaceProjectId,
  aiWorkspaceProjectId,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = buildNavItems(workspaceProjectId, aiWorkspaceProjectId);

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole ?? ''),
  );

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-2 px-5 border-b border-border/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-tight">AsyncReport</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item);

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <UserButton
            appearance={{
              variables: {
                colorBackground: 'hsl(222, 84%, 5%)',
                colorText: 'hsl(210, 40%, 98%)',
                colorTextSecondary: 'hsl(215, 20%, 65%)',
                colorNeutral: 'hsl(210, 40%, 98%)',
                colorPrimary: 'hsl(199, 89%, 48%)',
                colorInputBackground: 'hsl(217, 33%, 17%)',
                colorInputText: 'hsl(210, 40%, 98%)',
                borderRadius: '0.75rem',
              },
              elements: {
                userButtonAvatarBox: 'h-8 w-8',
                card: 'border border-white/10 shadow-2xl',
                userPreviewMainIdentifier: 'text-white font-semibold',
                userPreviewSecondaryIdentifier: 'text-slate-400',
                menuItem: 'hover:bg-white/5',
                menuItemText: 'text-slate-200',
                footerActionText: 'text-slate-500',
                footerActionLink: 'text-sky-400 hover:text-sky-300',
              },
            }}
          />
          <Link
            href="/dashboard/profile"
            className={cn(
              'text-sm font-medium truncate transition-colors hover:text-foreground',
              pathname === '/dashboard/profile'
                ? 'text-primary'
                : 'text-muted-foreground',
            )}
          >
            Mi perfil
          </Link>
        </div>
        <NotificationBell />
      </div>
    </aside>
  );
}
