export type {
  Role,
  Specialization,
  ProjectStatus,
  NotificationSeverity,
  NotificationType,
  AISummaryStatus,
} from '@prisma/client';

export interface AuthContext {
  clerkUserId: string;
  dbUserId: string;
  role: import('@prisma/client').Role;
}

/** Forma del usuario expuesta por la API — sin campos internos sensibles. */
export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: import('@prisma/client').Role;
  specialization: import('@prisma/client').Specialization;
}

/** Respuesta estandarizada de éxito de la API. */
export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

/** Respuesta estandarizada de error de la API. */
export interface ApiError {
  error: string;
  code: number;
  details?: unknown;
}
