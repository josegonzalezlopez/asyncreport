import { describe, it, expect } from 'vitest';
import {
  toUTCDayStart,
  isSameLocalDay,
  toLocalDateISO,
  formatLocalDate,
} from '@/lib/helpers/dates';

describe('toUTCDayStart', () => {
  it('convierte medianoche en UTC+0 correctamente', () => {
    const result = toUTCDayStart('2026-04-16', 'UTC');
    expect(result.toISOString()).toBe('2026-04-16T00:00:00.000Z');
  });

  it('convierte medianoche en UTC-3 (Buenos Aires) — 03:00 UTC', () => {
    const result = toUTCDayStart('2026-04-16', 'America/Argentina/Buenos_Aires');
    expect(result.toISOString()).toBe('2026-04-16T03:00:00.000Z');
  });

  it('convierte medianoche en UTC+9 (Tokyo) — dia anterior en UTC', () => {
    const result = toUTCDayStart('2026-04-16', 'Asia/Tokyo');
    // Medianoche en Tokyo (UTC+9) = 15:00 del dia anterior en UTC
    expect(result.toISOString()).toBe('2026-04-15T15:00:00.000Z');
  });

  it('convierte medianoche en UTC-5 (Chicago) — 05:00 UTC', () => {
    const result = toUTCDayStart('2026-04-16', 'America/Chicago');
    expect(result.toISOString()).toBe('2026-04-16T05:00:00.000Z');
  });
});

describe('isSameLocalDay', () => {
  it('retorna true cuando la fecha UTC cae en el mismo dia local (UTC+0)', () => {
    const utcDate = new Date('2026-04-16T10:00:00.000Z');
    expect(isSameLocalDay(utcDate, '2026-04-16', 'UTC')).toBe(true);
  });

  it('retorna false cuando la fecha UTC es un dia distinto en la timezone local', () => {
    const utcDate = new Date('2026-04-16T10:00:00.000Z');
    expect(isSameLocalDay(utcDate, '2026-04-15', 'UTC')).toBe(false);
  });

  it('caso critico UTC+9: las 23:00 UTC es el dia siguiente en Tokyo', () => {
    // 2026-04-16T23:00:00Z = 2026-04-17T08:00:00+09:00 en Tokyo
    const utcDate = new Date('2026-04-16T23:00:00.000Z');
    expect(isSameLocalDay(utcDate, '2026-04-17', 'Asia/Tokyo')).toBe(true);
    expect(isSameLocalDay(utcDate, '2026-04-16', 'Asia/Tokyo')).toBe(false);
  });

  it('caso critico UTC-5: las 02:00 UTC es el dia anterior en Chicago', () => {
    // 2026-04-16T02:00:00Z = 2026-04-15T21:00:00-05:00 en Chicago
    const utcDate = new Date('2026-04-16T02:00:00.000Z');
    expect(isSameLocalDay(utcDate, '2026-04-15', 'America/Chicago')).toBe(true);
    expect(isSameLocalDay(utcDate, '2026-04-16', 'America/Chicago')).toBe(false);
  });

  it('caso critico UTC-3: reporta a las 22:30 hora local — mismo dia', () => {
    // 22:30 BUE = 01:30 UTC del dia siguiente
    const utcDate = new Date('2026-04-17T01:30:00.000Z');
    expect(isSameLocalDay(utcDate, '2026-04-16', 'America/Argentina/Buenos_Aires')).toBe(true);
  });
});

describe('toLocalDateISO', () => {
  it('retorna la fecha local en formato yyyy-MM-dd', () => {
    const utcDate = new Date('2026-04-16T23:00:00.000Z');
    expect(toLocalDateISO(utcDate, 'Asia/Tokyo')).toBe('2026-04-17');
    expect(toLocalDateISO(utcDate, 'UTC')).toBe('2026-04-16');
  });
});

describe('formatLocalDate', () => {
  it('formatea correctamente con el patron dado', () => {
    const utcDate = new Date('2026-04-16T15:00:00.000Z');
    const result = formatLocalDate(utcDate, 'America/Argentina/Buenos_Aires', 'dd/MM/yyyy HH:mm');
    expect(result).toBe('16/04/2026 12:00');
  });
});
