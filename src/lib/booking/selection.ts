import { COURT_IDS, freeCourtsAt, isFree } from "./availability.ts";
import { defaultDate, isHour, isWithinHorizon, parseIsoDate, slotStarted, today, type Hour } from "./club-time.ts";
import type { Booking, Context, CourtId, Selection } from "./types.ts";

export const BOOKING_PATH = "/reservar";

/** Compatible con `URLSearchParams` y con `ReadonlyURLSearchParams` de Next. */
export type ParamReader = { get(name: string): string | null };

/** Qué se descartó o ajustó al leer la URL, para avisarlo en una línea. */
export type Correction =
  | { kind: "date-invalid"; value: string }
  | { kind: "date-past"; value: string }
  | { kind: "date-out-of-range"; value: string }
  | { kind: "court-invalid"; value: string }
  | { kind: "hour-invalid"; value: string }
  | { kind: "hour-unavailable"; hour: Hour; court: CourtId | null; reason: "past" | "unavailable" };

/**
 * Lee `cancha`, `fecha` y `hora`. Siempre devuelve una selección válida: lo inválido se descarta y se informa.
 * Un parámetro ausente no es una corrección. Si falta `fecha`, se usa la fecha por defecto.
 * `dateExplicit` indica que la URL traía una `fecha` válida; quien reescriba la URL debe pasarla como
 * `pinDate` a `canonicalSearch` para no perder esa fecha, aunque coincida con la de por defecto.
 */
export function parseSelection(params: ParamReader, nowMs: number, bookings: readonly Booking[] = []): { selection: Selection; corrections: Correction[]; dateExplicit: boolean } {
  const ctx: Context = { nowMs, bookings };
  const corrections: Correction[] = [];

  let date = defaultDate(nowMs);
  let dateExplicit = false;
  const rawDate = params.get("fecha");
  if (rawDate !== null) {
    const parsed = parseIsoDate(rawDate);
    if (!parsed) corrections.push({ kind: "date-invalid", value: rawDate });
    else if (parsed < today(nowMs)) corrections.push({ kind: "date-past", value: rawDate });
    else if (!isWithinHorizon(parsed, nowMs)) corrections.push({ kind: "date-out-of-range", value: rawDate });
    else {
      date = parsed;
      dateExplicit = true;
    }
  }

  let court: CourtId | null = null;
  const rawCourt = params.get("cancha");
  if (rawCourt !== null) {
    const found = COURT_IDS.find((id) => id === rawCourt);
    if (found) court = found;
    else corrections.push({ kind: "court-invalid", value: rawCourt });
  }

  let hour: Hour | null = null;
  const rawHour = params.get("hora");
  if (rawHour !== null) {
    const value = /^\d{1,2}$/.test(rawHour) ? Number(rawHour) : Number.NaN;
    if (!isHour(value)) corrections.push({ kind: "hour-invalid", value: rawHour });
    else if (slotStarted(date, value, nowMs)) corrections.push({ kind: "hour-unavailable", hour: value, court, reason: "past" });
    else if (court ? !isFree(date, court, value, ctx) : freeCourtsAt(date, value, ctx).length === 0) corrections.push({ kind: "hour-unavailable", hour: value, court, reason: "unavailable" });
    else hour = value;
  }

  return { selection: { date, court, hour }, corrections, dateExplicit };
}

/**
 * Parámetros canónicos (sin «?»), en orden estable. La fecha se escribe siempre que:
 *  - no sea la de por defecto, o
 *  - haya hora (un horario sin día sería ambiguo si el enlace se abre otro día), o
 *  - `pinDate` sea verdadero: la persona eligió esa fecha (o el enlace recibido la traía), así que no puede
 *    perderse al compartir, aunque hoy coincida con la de por defecto.
 * Solo un enlace relativo, como el de «Reservar esta cancha» (`?cancha=02`), omite la fecha.
 * Quien guarda el estado debe fijar `pinDate` desde `dateExplicit` y en cuanto la persona toque un día.
 */
export function canonicalSearch(selection: Selection, nowMs: number, options: { pinDate?: boolean } = {}): string {
  const parts: string[] = [];
  if (selection.court !== null) parts.push(`cancha=${selection.court}`);
  if (options.pinDate || selection.date !== defaultDate(nowMs) || selection.hour !== null) parts.push(`fecha=${selection.date}`);
  if (selection.hour !== null) parts.push(`hora=${selection.hour}`);
  return parts.join("&");
}

/** Destino de los accesos de reserva; con cancha, la deja elegida. */
export const bookingHref = (court?: CourtId): string => (court ? `${BOOKING_PATH}?cancha=${court}` : BOOKING_PATH);
