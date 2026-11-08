import { slotStarted } from "./club-time.ts";
import { slotStatus } from "./availability.ts";
import type { Booking, Context, Selection } from "./types.ts";

export type ConfirmResult =
  | { ok: true; booking: Booking; bookings: readonly Booking[]; repeated: boolean }
  | { ok: false; reason: "incomplete" | "past" | "unavailable" };

/**
 * Confirma la selección contra el estado actual. Es idempotente: confirmar dos veces el mismo turno
 * (doble toque) devuelve el mismo arreglo de reservas con `repeated: true`.
 * La reserva es simulada y vive solo en memoria durante la visita.
 */
export function confirmSelection(selection: Selection, ctx: Context): ConfirmResult {
  const { date, court, hour } = selection;
  if (court === null || hour === null) return { ok: false, reason: "incomplete" };
  const booking: Booking = { date, court, hour };
  const status = slotStatus(date, court, hour, ctx);
  if (status === "yours") return { ok: true, booking, bookings: ctx.bookings, repeated: true };
  if (slotStarted(date, hour, ctx.nowMs)) return { ok: false, reason: "past" };
  if (status !== "free") return { ok: false, reason: "unavailable" };
  return { ok: true, booking, bookings: [...ctx.bookings, booking], repeated: false };
}
