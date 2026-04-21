'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Crown, Trash2, UserPlus, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  specialization: string;
  role: string;
}

interface Member {
  user: User;
  isTechLead: boolean;
}

interface ManageMembersPanelProps {
  projectId: string;
  currentMembers: Member[];
  allUsers: User[];
}

export function ManageMembersPanel({
  projectId,
  currentMembers,
  allUsers,
}: ManageMembersPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isTechLead, setIsTechLead] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const memberIds = new Set(currentMembers.map((m) => m.user.id));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id));

  async function handleAssign() {
    if (!selectedUserId) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedUserId, isTechLead }),
        });

        const json = await res.json() as { error?: string };
        if (!res.ok) {
          toast.error(json.error ?? 'Error al asignar miembro');
          return;
        }

        const user = allUsers.find((u) => u.id === selectedUserId);
        toast.success(`${user?.name ?? 'Usuario'} asignado al proyecto`);
        setSelectedUserId('');
        setIsTechLead(false);
        router.refresh();
      } catch {
        toast.error('Error de conexión');
      }
    });
  }

  async function handleRemove(userId: string, userName: string | null) {
    setRemoving(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const json = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? 'Error al remover miembro');
        return;
      }

      toast.success(`${userName ?? 'Usuario'} removido del proyecto`);
      router.refresh();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Asignar nuevo miembro */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Agregar miembro</p>

        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar usuario..." />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.length === 0 ? (
              <div className="py-3 text-center text-sm text-muted-foreground">
                Todos los usuarios ya son miembros
              </div>
            ) : (
              availableUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  <span className="flex items-center gap-2">
                    <span>{u.name ?? u.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.specialization.toLowerCase()}
                    </span>
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isTechLead}
              onChange={(e) => setIsTechLead(e.target.checked)}
              className="rounded border-border accent-amber-500"
            />
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-sm">Asignar como Tech Lead</span>
          </label>
        </div>

        <Button
          onClick={handleAssign}
          disabled={!selectedUserId || isPending}
          size="sm"
          className="w-full"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Asignar al proyecto
        </Button>
      </div>

      <Separator />

      {/* Lista de miembros actuales */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          Miembros actuales ({currentMembers.length})
        </p>

        {currentMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Sin miembros asignados
          </p>
        ) : (
          <ul className="space-y-2">
            {currentMembers.map(({ user, isTechLead: isTL }) => (
              <li
                key={user.id}
                className="flex items-center gap-3 rounded-md border border-border/40 px-3 py-2"
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={user.imageUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name ?? user.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.specialization.toLowerCase()}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {isTL && (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs h-5 px-1.5">
                      <Crown className="h-2.5 w-2.5 mr-0.5" />
                      TL
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={removing === user.id}
                    onClick={() => handleRemove(user.id, user.name)}
                  >
                    {removing === user.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
