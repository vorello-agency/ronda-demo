import { HOURS, horizonDates, type Hour, type IsoDate } from "./club-time.ts";
import type { Booking, Context } from "./types.ts";

/** Viernes 6 de noviembre de 2026, 10:40 en Montevideo (13:40 UTC). */
export const NOW = Date.UTC(2026, 10, 6, 13, 40);

export const contextAt = (nowMs: number = NOW, bookings: readonly Booking[] = []): Context => ({ nowMs, bookings });

/** Días posteriores a hoy: no tienen turnos vencidos, así que la disponibilidad solo depende de la simulación. */
export const FUTURE_DATES: readonly IsoDate[] = horizonDates(NOW).slice(1);

/** Primer día y hora (en orden) para los que `probe` devuelve algo; falla si ninguno cumple. */
export function findScenario<T>(probe: (date: IsoDate, hour: Hour) => T | null | undefined | false): T {
  for (const date of FUTURE_DATES) {
    for (const hour of HOURS) {
      const found = probe(date, hour);
      if (found) return found;
    }
  }
  throw new Error("No hay un escenario con esas condiciones en el horizonte de prueba");
}
