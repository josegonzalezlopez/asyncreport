'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, { error: 'Mínimo 2 caracteres' }),
  specialization: z.enum(
    ['DEVELOPER', 'DESIGNER', 'ANALYST', 'QA', 'DEVOPS', 'OTHER'] as const,
  ),
});

type FormData = z.infer<typeof schema>;

const SPECIALIZATIONS = [
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'QA', label: 'QA' },
  { value: 'DEVOPS', label: 'DevOps' },
  { value: 'OTHER', label: 'Otro' },
] as const;

interface EditProfileFormProps {
  currentName: string;
  currentSpecialization: string;
}

export function EditProfileForm({
  currentName,
  currentSpecialization,
}: EditProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: currentName,
      specialization: currentSpecialization as FormData['specialization'],
    },
  });

  const spec = watch('specialization');

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        toast.error(json.error ?? 'Error al actualizar el perfil');
        return;
      }

      toast.success('Perfil actualizado correctamente');
      router.refresh();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Especialización</Label>
        <Select
          value={spec}
          onValueChange={(v) =>
            setValue('specialization', v as FormData['specialization'], {
              shouldDirty: true,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPECIALIZATIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={!isDirty || isSubmitting} size="sm">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar cambios
      </Button>
    </form>
  );
}
