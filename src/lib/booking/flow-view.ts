import { COURT_IDS, freeHoursFor, hourAvailability, slotStatus } from "./availability.ts";
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

/**
 * Puntos bajo un horario: uno por cancha, en el orden del plano (01 Club, 02 Central, 03 Jardín), lleno si tiene lugar.
 * Sin puntos cuando no hay ninguna libre: ese horario ya dice «completo».
 */
export function hourCourtMarks(option: Pick<HourOption, "free" | "tone">): { court: CourtId; free: boolean }[] {
  return option.tone === "full" ? [] : COURT_IDS.map((court) => ({ court, free: option.free.includes(court) }));
}

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
 *   «yours»  con horario elegido: la persona ya la reservó en esta visita (no está libre, pero no es «ocupada»).
 */
export type CourtOption = { id: CourtId; state: "idle" | "free" | "taken" | "yours"; selected: boolean; freeHours: number };

function courtState(selection: Selection, id: CourtId, ctx: Context): CourtOption["state"] {
  if (selection.hour === null) return "idle";
  const status = slotStatus(selection.date, id, selection.hour, ctx);
  return status === "free" ? "free" : status === "yours" ? "yours" : "taken";
}

export function courtOptions(selection: Selection, ctx: Context): CourtOption[] {
  return COURT_IDS.map((id) => ({
    id,
    state: courtState(selection, id, ctx),
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
