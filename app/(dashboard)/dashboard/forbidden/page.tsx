import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card className="border-destructive/40 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Acceso denegado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No tienes permisos para acceder a esta sección con tu rol o membresía actual.
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/dashboard">Volver al dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/projects">Ir a proyectos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
