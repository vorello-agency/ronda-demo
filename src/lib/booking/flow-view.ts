import { COURT_IDS, freeHoursFor, hourAvailability, slotStatus } from "./availability.ts";
import { bookableHours, horizonDates, isWeekend, today, type Hour, type IsoDate } from "./club-time.ts";
import { HOUR_PERIODS, MONTHS } from "./copy.ts";
import type { Notice } from "./conflicts.ts";
import type { Context, CourtId, Selection } from "./types.ts";

/**
 * Lo que muestra cada control del flujo, derivado de la selección y el contexto. Funciones puras:
 * la interfaz solo dibuja estos datos, y las reglas visuales quedan probadas acá.
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
 * Tono de un horario, relativo a la cancha elegida (o a todas, si no hay):
 *   «free»  hay lugar: se puede elegir.
 *   «none»  tachado y «sin lugar»: no se puede elegir (aria-disabled; al activarlo, explica por qué).
 * No hay un tercer estado: si la cancha elegida no tiene lugar pero otra sí, la hora va tachada y la nota bajo la
 * grilla (`hourNote`) ofrece ver todas las canchas.
 */
export type HourTone = "free" | "none";
export type HourOption = { hour: Hour; free: CourtId[]; busy: CourtId[]; tone: HourTone };
export type HourPeriod = { label: string; options: HourOption[] };

/** Horarios del día agrupados por franja. Los que ya empezaron no se muestran; una franja vacía tampoco. */
export function hourPeriods(selection: Selection, ctx: Context): HourPeriod[] {
  const bookable = new Set(bookableHours(selection.date, ctx.nowMs));
  return HOUR_PERIODS.map((period) => ({
    label: period.label,
    options: period.hours.filter((hour) => bookable.has(hour)).map((hour) => {
      const { free, busy } = hourAvailability(selection.date, hour, ctx);
      const open = selection.court === null ? free.length > 0 : free.includes(selection.court);
      return { hour, free, busy, tone: open ? "free" : "none" } satisfies HourOption;
    }),
  })).filter((period) => period.options.length > 0);
}

/**
 * Nota bajo la grilla, solo con una cancha elegida y alguna hora tachada que tenga lugar en otra cancha:
 *   «day»    la cancha no tiene lugar en todo el día;
 *   «all»    todas las horas tachadas tienen lugar en otra cancha;
 *   «some»   solo algunas (otras no tienen lugar en ninguna).
 * En todos los casos remite a «Todas», en el control sobre la grilla.
 */
export type HourNote = { kind: "day" | "all" | "some"; court: CourtId } | null;

export function hourNote(periods: readonly HourPeriod[], court: CourtId | null): HourNote {
  if (court === null) return null;
  const options = periods.flatMap((period) => period.options);
  const struck = options.filter((option) => option.tone === "none");
  if (!struck.some((option) => option.free.length > 0)) return null;
  if (struck.length === options.length) return { kind: "day", court };
  return { kind: struck.every((option) => option.free.length > 0) ? "all" : "some", court };
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
 * Dónde se muestra un aviso: junto al control que lo originó (`origin`) si fue una cancha o una alternativa
 * (la cancha se elige en el plano o en «Ver horarios de»), junto a los horarios en el resto de los casos.
 */
export function noticeOrigin(notice: Notice, origin: "court" | "hour"): "court" | "hour" {
  if (notice.kind === "court-busy" || notice.kind === "pick-unavailable") return origin;
  return "hour";
}
