import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede superar los 500 caracteres')
    .optional(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar los 100 caracteres')
    .optional(),
  description: z
    .string()
    .max(500, 'La descripción no puede superar los 500 caracteres')
    .optional(),
  status: z
    .enum(['ACTIVE', 'PAUSED', 'FINISHED', 'ARCHIVED'] as const)
    .optional(),
});

export const assignMemberSchema = z.object({
  userId: z.string().min(1, 'El userId es obligatorio'),
  isTechLead: z.boolean().default(false),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type AssignMemberDto = z.infer<typeof assignMemberSchema>;
