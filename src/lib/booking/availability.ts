import { courts } from "../../data/courts.ts";
import { HOURS, isWeekend, slotStarted, type Hour, type IsoDate } from "./club-time.ts";
import type { Context, CourtId } from "./types.ts";

/**
 * Disponibilidad SIMULADA. Es determinista (igual para todos los visitantes y estable entre recargas)
 * y no representa reservas reales: se deriva de un hash de «semilla | fecha | cancha | hora».
 */
export const COURT_IDS: readonly CourtId[] = courts.map((court) => court.id);

/** Cambiar la semilla o las tasas cambia toda la disponibilidad de la demo. */
export const DEMO_SEED = "ronda-demo-v1";

export type SlotStatus = "free" | "taken" | "yours" | "past";

/**
 * FNV-1a de 32 bits con un mezclador final (fmix32 de MurmurHash3), normalizado a [0, 1).
 * Sin el mezclador, claves que solo difieren en el último carácter (horas consecutivas) dan valores
 * casi iguales y la ocupación sale en rachas.
 */
export function demoUnit(key: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index++) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}

/** Probabilidad de que un turno figure ocupado: más ocupación al caer la tarde y en la mañana del fin de semana. */
export function busyRate(date: IsoDate, hour: Hour): number {
  if (isWeekend(date)) return hour < 13 ? 0.58 : 0.38;
  return hour >= 17 ? 0.62 : 0.28;
}

export function slotStatus(date: IsoDate, court: CourtId, hour: Hour, ctx: Context): SlotStatus {
  if (ctx.bookings.some((booking) => booking.date === date && booking.court === court && booking.hour === hour)) return "yours";
  if (slotStarted(date, hour, ctx.nowMs)) return "past";
  return demoUnit(`${DEMO_SEED}|${date}|${court}|${hour}`) < busyRate(date, hour) ? "taken" : "free";
}

export const isFree = (date: IsoDate, court: CourtId, hour: Hour, ctx: Context): boolean =>
  slotStatus(date, court, hour, ctx) === "free";

export type HourAvailability = { hour: Hour; free: CourtId[]; busy: CourtId[] };

/** Canchas libres y no libres a una hora, en el orden del plano (oeste → este). */
export function hourAvailability(date: IsoDate, hour: Hour, ctx: Context): HourAvailability {
  const free: CourtId[] = [];
  const busy: CourtId[] = [];
  for (const court of COURT_IDS) (isFree(date, court, hour, ctx) ? free : busy).push(court);
  return { hour, free, busy };
}

export const freeCourtsAt = (date: IsoDate, hour: Hour, ctx: Context): CourtId[] => hourAvailability(date, hour, ctx).free;

export const freeHoursFor = (date: IsoDate, court: CourtId, ctx: Context): Hour[] =>
  HOURS.filter((hour) => isFree(date, court, hour, ctx));

/** Horario libre más cercano en la misma cancha; ante un empate gana el más temprano. */
export function nearestFreeHour(date: IsoDate, court: CourtId, around: Hour, ctx: Context): Hour | null {
  const candidates = freeHoursFor(date, court, ctx).sort((a, b) => Math.abs(a - around) - Math.abs(b - around) || a - b);
  return candidates[0] ?? null;
}
