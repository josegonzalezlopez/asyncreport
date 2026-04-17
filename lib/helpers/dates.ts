import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';

/**
 * Convierte una fecha local ISO (ej: "2026-04-16") a las 00:00:00 UTC
 * correspondientes a ese día en la timezone dada.
 *
 * Ejemplo: "2026-04-16" en "America/Argentina/Buenos_Aires" (UTC-3)
 * → 2026-04-16T03:00:00.000Z (medianoche BUE = 03:00 UTC)
 */
export function toUTCDayStart(localDateISO: string, timezone: string): Date {
  return fromZonedTime(`${localDateISO}T00:00:00`, timezone);
}

/**
 * Verifica si una fecha UTC corresponde a un día local específico
 * en la timezone dada. Usado en canUserReport para evitar duplicados.
 */
export function isSameLocalDay(
  utcDate: Date,
  localDateISO: string,
  timezone: string,
): boolean {
  const localDate = toZonedTime(utcDate, timezone);
  const formatted = format(localDate, 'yyyy-MM-dd', { timeZone: timezone });
  return formatted === localDateISO;
}

/**
 * Formatea una fecha UTC en la timezone del cliente.
 * Para uso en Server Components que pre-formatean fechas antes de enviarlas al cliente.
 */
export function formatLocalDate(
  utcDate: Date,
  timezone: string,
  formatStr: string,
): string {
  return format(toZonedTime(utcDate, timezone), formatStr, { timeZone: timezone });
}

/**
 * Retorna la fecha local ISO (yyyy-MM-dd) de una fecha UTC en una timezone dada.
 * Conveniente para obtener el "día de hoy" del usuario sin instanciar Date en el cliente.
 */
export function toLocalDateISO(utcDate: Date, timezone: string): string {
  return format(toZonedTime(utcDate, timezone), 'yyyy-MM-dd', { timeZone: timezone });
}
