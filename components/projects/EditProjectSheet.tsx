'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateProjectSchema, type UpdateProjectDto } from '@/lib/validators/project.schema';
import type { ProjectStatus } from '@prisma/client';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
}

interface Props {
  project: Project;
  onUpdated?: () => void;
  onClose?: () => void;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'PAUSED', label: 'Pausado' },
  { value: 'FINISHED', label: 'Finalizado' },
];

export function EditProjectForm({ project, onUpdated, onClose }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProjectDto>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? '',
      status: project.status,
    },
  });

  useEffect(() => {
    reset({
      name: project.name,
      description: project.description ?? '',
      status: project.status,
    });
  }, [project, reset]);

  const currentStatus = useWatch({ control, name: 'status' });

  async function onSubmit(data: UpdateProjectDto) {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success('Proyecto actualizado');
      onUpdated?.();
      onClose?.();
    } else {
      const body = await res.json() as { error?: string };
      toast.error(body.error ?? 'Error al actualizar');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Nombre</label>
        <Input {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Descripción</label>
        <Textarea rows={3} {...register('description')} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Estado</label>
        <Select
          value={currentStatus}
          onValueChange={(v) => setValue('status', v as ProjectStatus, { shouldDirty: true })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
