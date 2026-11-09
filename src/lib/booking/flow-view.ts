import { COURT_IDS, freeHoursFor, hourAvailability, isFree } from "./availability.ts";
import { bookableHours, horizonDates, isWeekend, today, type Hour, type IsoDate } from "./club-time.ts";
import { HOUR_PERIODS, MONTHS } from "./copy.ts";
import type { Notice } from "./conflicts.ts";
import type { Context, CourtId, Selection } from "./types.ts";

/**
 * Lo que muestra cada control del flujo, derivado de la selección y el contexto. Funciones puras:
 * la interfaz solo dibuja estos datos, y las reglas visuales aprobadas quedan probadas acá.
 */

export type DayOption = { date: IsoDate; isToday: boolean; isWeekend: boolean; bookable: boolean };

/** Los días del horizonte. Hoy deja de ser reservable cuando ya empezó su último turno. */
export function dayOptions(nowMs: number): DayOption[] {
  const first = today(nowMs);
  return horizonDates(nowMs).map((date) => ({
    date,
    isToday: date === first,
    isWeekend: isWeekend(date),
    bookable: bookableHours(date, nowMs).length > 0,
  }));
}

/** «Noviembre» o, si el horizonte cruza de mes, «Noviembre – Diciembre». */
export function monthsLabel(dates: readonly IsoDate[]): string {
  const months = [...new Set(dates.map((date) => Number(date.slice(5, 7)) - 1))];
  return months.map((month) => MONTHS[month].charAt(0).toUpperCase() + MONTHS[month].slice(1)).join(" – ");
}

/**
 * Tono de un horario:
 *   «free»  hay lugar (en la cancha elegida, o en alguna si no hay cancha).
 *   «alt»   «otra cancha»: sin lugar en la cancha elegida, pero sí en otra. Sigue siendo elegible y abre alternativas.
 *   «full»  tachado y «completo»: ninguna cancha tiene lugar. Es lo único que se presenta como no disponible.
 */
export type HourTone = "free" | "alt" | "full";
export type HourOption = { hour: Hour; free: CourtId[]; busy: CourtId[]; tone: HourTone };
export type HourPeriod = { label: string; options: HourOption[] };

/** Horarios del día agrupados por franja. Los que ya empezaron no se muestran; una franja vacía tampoco. */
export function hourPeriods(selection: Selection, ctx: Context): HourPeriod[] {
  const bookable = new Set(bookableHours(selection.date, ctx.nowMs));
  return HOUR_PERIODS.map((period) => ({
    label: period.label,
    options: period.hours.filter((hour) => bookable.has(hour)).map((hour) => {
      const { free, busy } = hourAvailability(selection.date, hour, ctx);
      const tone: HourTone = free.length === 0 ? "full" : selection.court !== null && !free.includes(selection.court) ? "alt" : "free";
      return { hour, free, busy, tone };
    }),
  })).filter((period) => period.options.length > 0);
}

/**
 * Estado de una cancha en el plano:
 *   «idle»   sin horario elegido: se muestra cuántos horarios libres le quedan en el día.
 *   «free» / «taken»   con horario elegido: si esa cancha tiene lugar a esa hora.
 */
export type CourtOption = { id: CourtId; state: "idle" | "free" | "taken"; selected: boolean; freeHours: number };

export function courtOptions(selection: Selection, ctx: Context): CourtOption[] {
  return COURT_IDS.map((id) => ({
    id,
    state: selection.hour === null ? "idle" : isFree(selection.date, id, selection.hour, ctx) ? "free" : "taken",
    selected: selection.court === id,
    freeHours: freeHoursFor(selection.date, id, ctx).length,
  }));
}

/**
 * Dónde se muestra un aviso: junto al plano si lo originó una cancha, junto a los horarios en el resto de los casos.
 * Una alternativa que dejó de estar libre se avisa donde estaba la alternativa (`previous`).
 */
export function noticeOrigin(notice: Notice, previous: "court" | "hour" = "hour"): "court" | "hour" {
  if (notice.kind === "court-busy") return "court";
  if (notice.kind === "pick-unavailable") return previous;
  return "hour";
}
