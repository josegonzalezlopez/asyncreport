'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoodSelector } from './MoodSelector';
import { createDailySchema, type CreateDailyDto } from '@/lib/validators/daily.schema';

interface Project {
  id: string;
  name: string;
}

interface Props {
  projects: Project[];
  defaultProjectId?: string;
}

export function CreateDailyForm({ projects, defaultProjectId }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateDailyDto>({
    resolver: zodResolver(createDailySchema),
    defaultValues: {
      projectId: defaultProjectId ?? projects[0]?.id ?? '',
      mood: 3,
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Actualiza timezone al montar (siempre desde el cliente)
  useEffect(() => {
    setValue('userTimezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [setValue]);

  async function onSubmit(data: CreateDailyDto) {
    const res = await fetch('/api/daily-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success('¡Daily cargado correctamente!');
      router.refresh();
    } else {
      const body = await res.json() as { error?: string };
      if (res.status === 409) {
        toast.warning(body.error ?? 'Ya cargaste tu daily hoy');
      } else {
        toast.error(body.error ?? 'Error al cargar el daily');
      }
    }
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Cargar daily de hoy</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Proyecto */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Proyecto <span className="text-destructive">*</span>
            </label>
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.projectId && (
              <p className="text-xs text-destructive">{errors.projectId.message}</p>
            )}
          </div>

          {/* Ayer */}
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="yesterday">
              ¿Qué hiciste ayer? <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="yesterday"
              placeholder="Describe las tareas que completaste..."
              rows={3}
              {...register('yesterday')}
            />
            {errors.yesterday && (
              <p className="text-xs text-destructive">{errors.yesterday.message}</p>
            )}
          </div>

          {/* Hoy */}
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="today">
              ¿Qué harás hoy? <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="today"
              placeholder="Describe las tareas que planeas hacer..."
              rows={3}
              {...register('today')}
            />
            {errors.today && (
              <p className="text-xs text-destructive">{errors.today.message}</p>
            )}
          </div>

          {/* Bloqueadores */}
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="blockers">
              Bloqueadores{' '}
              <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <Textarea
              id="blockers"
              placeholder="¿Hay algo que te impida avanzar? Se notificará al Tech Lead..."
              rows={2}
              {...register('blockers')}
            />
            {errors.blockers && (
              <p className="text-xs text-destructive">{errors.blockers.message}</p>
            )}
          </div>

          {/* Mood */}
          <Controller
            name="mood"
            control={control}
            render={({ field }) => (
              <MoodSelector
                value={field.value}
                onChange={field.onChange}
                error={errors.mood?.message}
              />
            )}
          />

          <input type="hidden" {...register('userTimezone')} />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'Enviando...' : 'Enviar daily'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
