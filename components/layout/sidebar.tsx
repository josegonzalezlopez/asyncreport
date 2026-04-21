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

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Proyectos', icon: FolderKanban },
  { href: '/dashboard/dailies', label: 'Mis Dailies', icon: FileText },
  { href: '/dashboard/team', label: 'Equipo', icon: Users, roles: ['TECH_LEAD', 'ADMIN'] },
  { href: '/dashboard/ai-summary', label: 'Resumen IA', icon: Sparkles, roles: ['TECH_LEAD', 'ADMIN'] },
  { href: '/dashboard/admin', label: 'Admin', icon: Settings, roles: ['ADMIN'] },
];

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole ?? ''),
  );

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5 border-b border-border/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-tight">AsyncReport</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer con perfil, campana y UserButton */}
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
