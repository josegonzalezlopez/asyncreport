'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Copy, Key, Trash2, Plus, Terminal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ApiKeyPublic {
  id: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

function TokenRevealDialog({ token, onClose }: { token: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyToken() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-green-400" />
            Token generado — cópialo ahora
          </AlertDialogTitle>
          <AlertDialogDescription>
            Este token <strong>no se mostrará de nuevo</strong>. Si lo pierdes deberás revocar
            esta clave y generar una nueva.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-2 rounded-md bg-muted p-3 font-mono text-sm break-all select-all">
          {token}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={copyToken} className="gap-2">
            <Copy className="h-4 w-4" />
            {copied ? '¡Copiado!' : 'Copiar token'}
          </Button>
          <AlertDialogAction onClick={onClose}>Entendido, ya lo guardé</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKeyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/api-keys');
    if (res.ok) {
      const json = await res.json();
      setKeys(json.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);

    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });

    if (res.ok) {
      const json = await res.json();
      setRevealedToken(json.data.token);
      setNewKeyName('');
      await fetchKeys();
    } else {
      toast.error('Error al crear la API Key');
    }
    setCreating(false);
  }

  async function handleRevoke(id: string, name: string) {
    const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success(`"${name}" revocada`);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } else {
      toast.error('Error al revocar la clave');
    }
  }

  return (
    <div className="space-y-4">
      {revealedToken && (
        <TokenRevealDialog token={revealedToken} onClose={() => setRevealedToken(null)} />
      )}

      {/* Crear nueva clave */}
      <form onSubmit={handleCreate} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label htmlFor="key-name" className="text-xs text-muted-foreground">
            Nombre del dispositivo
          </Label>
          <Input
            id="key-name"
            placeholder='ej. "MacBook José"'
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="h-8 text-sm"
            maxLength={64}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={creating || !newKeyName.trim()}
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          {creating ? 'Generando...' : 'Generar'}
        </Button>
      </form>

      {/* Lista de claves */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-2">Cargando claves...</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No tienes API Keys aún. Genera una para usar el CLI.
        </p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{key.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Creada{' '}
                    {formatDistanceToNow(new Date(key.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                    {key.lastUsedAt && (
                      <>
                        {' · '}Último uso{' '}
                        {formatDistanceToNow(new Date(key.lastUsedAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                  <Badge variant="destructive" className="text-xs">
                    Expirada
                  </Badge>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Revocar "{key.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cualquier CLI configurado con esta clave dejará de funcionar
                        inmediatamente. Esta acción es irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRevoke(key.id, key.name)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Revocar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
