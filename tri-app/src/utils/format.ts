/** Formatação pt-BR e cálculos de pace/tempo. */

import type { Sport } from '@/db/types';

/** 28.4 -> "28,4" · 96 -> "96" · 72.5 -> "72,5" */
export function fmtNumber(n: number, maxDecimals = 1): string {
  const fixed = n.toFixed(maxDecimals);
  const trimmed = maxDecimals > 0 ? fixed.replace(/\.?0+$/, '') : fixed;
  return trimmed.replace('.', ',');
}

/** Segundos -> "45:10" ou "1:22:30" */
export function fmtDuration(totalSec: number): string {
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** "45:10", "1:22:30", "42" -> segundos (null se inválido) */
export function parseDuration(input: string): number | null {
  const parts = input.trim().split(':').map((p) => p.trim());
  if (parts.some((p) => p === '' || !/^\d+$/.test(p))) return null;
  if (parts.length === 1) return Number(parts[0]) * 60; // só minutos
  if (parts.length === 2) return Number(parts[0]) * 60 + Number(parts[1]);
  if (parts.length === 3)
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  return null;
}

/** "8,2" ou "8.2" -> número (null se inválido) */
export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (normalized === '' || !/^\d*\.?\d+$/.test(normalized)) return null;
  return Number(normalized);
}

export interface PaceValue {
  /** valor formatado, ex. "5:30" ou "27,4" */
  value: string;
  /** unidade, ex. "/km", "/100m", "km/h" */
  unit: string;
  /** métrica bruta para comparação (menor = melhor p/ pace; p/ km/h invertido) */
  raw: number;
}

/**
 * Pace/velocidade por modalidade:
 * corrida e outro -> min/km · natação -> min/100m · pedal -> km/h
 */
export function paceFor(sport: Sport, distanceM: number, durationSec: number): PaceValue | null {
  if (distanceM <= 0 || durationSec <= 0) return null;
  if (sport === 'bike') {
    const kmh = distanceM / 1000 / (durationSec / 3600);
    return { value: fmtNumber(kmh, 1), unit: 'km/h', raw: kmh };
  }
  const per = sport === 'swim' ? durationSec / (distanceM / 100) : durationSec / (distanceM / 1000);
  return { value: fmtPaceSec(per), unit: sport === 'swim' ? '/100m' : '/km', raw: per };
}

/** segundos por unidade -> "5:30" */
export function fmtPaceSec(secPerUnit: number): string {
  const s = Math.round(secPerUnit);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "menor é melhor" vale para pace; para km/h (pedal) maior é melhor */
export function isBetterPace(sport: Sport, a: number, b: number): boolean {
  return sport === 'bike' ? a > b : a < b;
}

/** Distância: corrida/pedal em km ("8,2 km"), natação em m ("2 000 m") */
export function fmtDistance(sport: Sport, distanceM: number): string {
  if (sport === 'swim') {
    const m = Math.round(distanceM);
    return `${m.toLocaleString('pt-BR').replace(/\./g, ' ')} m`;
  }
  return `${fmtNumber(distanceM / 1000, 1)} km`;
}

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
/** índice = getDay() (0 = domingo) */
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
/** rótulos do eixo do gráfico semanal, começando na segunda */
export const WEEK_AXIS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** Date -> 'YYYY-MM-DD' (fuso local) */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' -> Date local (meio-dia, evita bordas de DST) */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

/** número da semana ISO 8601 */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** segunda-feira da semana da data */
export function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d;
}

/** "15 jul" */
export function fmtDayMonth(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "17 mai 2026" */
export function fmtDayMonthYear(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "10 AGO" (datas de prova) */
export function fmtDayMonthCaps(iso: string): string {
  return fmtDayMonth(iso).toUpperCase();
}

/** "hoje" | "ontem" | dia da semana curto ("seg") | "15 jul" se > 6 dias */
export function relativeDayLabel(iso: string): string {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const d = fromISODate(iso);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff <= 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 7) return WEEKDAYS_SHORT[d.getDay()];
  return fmtDayMonth(iso);
}

/** dias (arredondando p/ cima a partir de hoje) até uma data futura */
export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = fromISODate(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/** "1 km" | "750 m" | "20 km" — distância de segmento de prova */
export function fmtSegmentDistance(distanceM: number): string {
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  return `${fmtNumber(distanceM / 1000, 1)} km`;
}
