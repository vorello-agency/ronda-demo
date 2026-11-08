import type { CourtId } from "../../data/club-plan.ts";
import type { Hour, IsoDate } from "./club-time.ts";

export type { CourtId };

/** Lo que la persona eligió. `null` significa «todavía sin elegir». */
export type Selection = { date: IsoDate; court: CourtId | null; hour: Hour | null };

/** Un turno confirmado durante esta visita (solo en memoria). */
export type Booking = { date: IsoDate; court: CourtId; hour: Hour };

/** Reloj y reservas con los que se evalúa la disponibilidad. */
export type Context = { nowMs: number; bookings: readonly Booking[] };
