'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SPECIALIZATIONS = [
  { value: 'DEVELOPER', label: 'Developer', icon: '💻' },
  { value: 'DESIGNER', label: 'Designer', icon: '🎨' },
  { value: 'ANALYST', label: 'Analyst', icon: '📊' },
  { value: 'QA', label: 'QA Engineer', icon: '🧪' },
  { value: 'DEVOPS', label: 'DevOps', icon: '⚙️' },
  { value: 'OTHER', label: 'Other', icon: '🔧' },
] as const;

type SpecializationValue = (typeof SPECIALIZATIONS)[number]['value'];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<SpecializationValue | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!selected) return;

    startTransition(async () => {
      const res = await fetch('/api/users/me/specialization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialization: selected }),
      });

      if (res.ok) {
        router.push('/dashboard');
      }
    });
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">¡Bienvenido a AsyncReport!</CardTitle>
        <CardDescription className="text-base">
          ¿Cuál es tu especialización en el equipo?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {SPECIALIZATIONS.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                'hover:border-primary/50 hover:bg-primary/5',
                selected === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background/50 text-muted-foreground',
              )}
            >
              <span className="text-2xl">{icon}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>

        <Button
          className="w-full"
          disabled={!selected || isPending}
          onClick={handleSubmit}
        >
          {isPending ? 'Guardando...' : 'Continuar al Dashboard →'}
        </Button>
      </CardContent>
    </Card>
  );
}
