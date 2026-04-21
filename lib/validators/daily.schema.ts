import { z } from 'zod';

export const createDailySchema = z.object({
  projectId: z.string().min(1, 'El proyecto es obligatorio'),
  yesterday: z
    .string()
    .min(10, 'Describe al menos qué hiciste ayer (mín. 10 caracteres)')
    .max(1000, 'Máximo 1000 caracteres'),
  today: z
    .string()
    .min(10, 'Describe qué harás hoy (mín. 10 caracteres)')
    .max(1000, 'Máximo 1000 caracteres'),
  blockers: z
    .string()
    .max(500, 'Máximo 500 caracteres')
    .optional(),
  mood: z
    .number({ error: 'El mood debe ser un número' })
    .int('El mood debe ser un número entero')
    .min(1, 'Mood mínimo: 1')
    .max(5, 'Mood máximo: 5'),
  userTimezone: z
    .string()
    .min(1, 'La zona horaria es obligatoria'),
});

export type CreateDailyDto = z.infer<typeof createDailySchema>;
