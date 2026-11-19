import { freeCourtsAt, isFree, nearestFreeHour, slotStatus } from "./availability.ts";
import { clubClock, defaultDate, isWithinHorizon, slotStarted, type Hour, type IsoDate } from "./club-time.ts";
import type { Context, CourtId, Selection } from "./types.ts";

/** Un turno concreto que se ofrece cuando la última elección choca con la anterior. */
export type Alternative = { court: CourtId; hour: Hour };

/** Qué pasó con la selección. Son datos, no texto: la redacción vive en `copy.ts`. */
export type Notice =
  /**
   * Se eligió una cancha ocupada a la hora elegida: se conserva la cancha y se libera el horario.
   * `yours`: el turno no está ocupado por otros, la persona ya lo reservó en esta visita.
   */
  | { kind: "court-busy"; court: CourtId; hour: Hour; alternatives: Alternative[]; yours?: true }
  /**
   * Se activó un horario tachado porque la cancha elegida no tiene lugar (otra sí): no cambia nada, el aviso explica
   * por qué y ofrece alternativas de un toque.
   */
  | { kind: "hour-busy"; court: CourtId; hour: Hour; alternatives: Alternative[]; yours?: true }
  /** Ninguna cancha tiene lugar a esa hora. */
  | { kind: "hour-full"; hour: Hour }
  /** Al cambiar de día, el horario elegido quedó sin lugar. */
  | { kind: "date-no-room"; date: IsoDate; hour: Hour; court: CourtId | null; reason: "past" | "unavailable" }
  /** Una alternativa ofrecida dejó de estar disponible antes de tocarla. */
  | { kind: "pick-unavailable"; court: CourtId; hour: Hour }
  /** Con la página abierta, el día elegido ya pasó. */
  | { kind: "date-expired"; date: IsoDate }
  /** Con la página abierta, el horario elegido empezó o dejó de estar libre. */
  | { kind: "hour-expired"; hour: Hour; reason: "past" | "unavailable" };

export type Change =
  | { type: "date"; date: IsoDate }
  /** `null` es «Todas»: deja la cancha sin elegir. */
  | { type: "court"; court: CourtId | null }
  | { type: "hour"; hour: Hour }
  | { type: "pick"; court: CourtId; hour: Hour };

export type Outcome = { selection: Selection; notice: Notice | null };

const unchanged = (selection: Selection, notice: Notice | null = null): Outcome => ({ selection, notice });

/** Cancha y horario a la vez son válidos solo si ese turno está libre; sin cancha, si alguna lo está. */
function hourWorks(date: IsoDate, court: CourtId | null, hour: Hour, ctx: Context): boolean {
  return court ? isFree(date, court, hour, ctx) : freeCourtsAt(date, hour, ctx).length > 0;
}

/** `{ yours: true }` si el turno es una reserva de esta visita; vacío si está ocupado por otros. */
const yoursFlag = (date: IsoDate, court: CourtId, hour: Hour, ctx: Context): { yours?: true } =>
  slotStatus(date, court, hour, ctx) === "yours" ? { yours: true } : {};

function alternativesFor(origin: "court" | "hour", date: IsoDate, court: CourtId, hour: Hour, ctx: Context): Alternative[] {
  const sameCourt = nearestFreeHour(date, court, hour, ctx);
  const otherCourt = freeCourtsAt(date, hour, ctx)[0];
  const sameCourtOption = sameCourt === null ? [] : [{ court, hour: sameCourt }];
  const otherCourtOption = otherCourt === undefined ? [] : [{ court: otherCourt, hour }];
  return origin === "court" ? [...sameCourtOption, ...otherCourtOption] : [...otherCourtOption, ...sameCourtOption];
}

/**
 * Aplica un cambio de la persona. Manda la última elección: si choca con la anterior, la anterior se libera
 * y el aviso trae alternativas de un toque. Nunca se borra una elección en silencio. La excepción son los horarios
 * tachados (sin lugar en la cancha elegida o en ninguna): no se pueden elegir, así que activarlos solo avisa.
 * Es total: un cambio que no corresponde (día fuera del horizonte, horario ya vencido) devuelve la misma selección.
 */
export function applyChange(selection: Selection, change: Change, ctx: Context): Outcome {
  const { nowMs } = ctx;
  switch (change.type) {
    case "date": {
      if (!isWithinHorizon(change.date, nowMs)) return unchanged(selection);
      const next: Selection = { ...selection, date: change.date };
      if (selection.hour === null || hourWorks(change.date, selection.court, selection.hour, ctx)) return unchanged(next);
      const reason = slotStarted(change.date, selection.hour, nowMs) ? "past" : "unavailable";
      return {
        selection: { ...next, hour: null },
        notice: { kind: "date-no-room", date: change.date, hour: selection.hour, court: selection.court, reason },
      };
    }
    case "court": {
      const next: Selection = { ...selection, court: change.court };
      // Sin cancha, la hora elegida sigue valiendo: tenía lugar en la cancha que se deja.
      if (change.court === null || selection.hour === null || isFree(selection.date, change.court, selection.hour, ctx)) return unchanged(next);
      return {
        selection: { ...next, hour: null },
        notice: { kind: "court-busy", court: change.court, hour: selection.hour, alternatives: alternativesFor("court", selection.date, change.court, selection.hour, ctx), ...yoursFlag(selection.date, change.court, selection.hour, ctx) },
      };
    }
    case "hour": {
      if (slotStarted(selection.date, change.hour, nowMs)) return unchanged(selection, { kind: "hour-expired", hour: change.hour, reason: "past" });
      if (freeCourtsAt(selection.date, change.hour, ctx).length === 0) return unchanged(selection, { kind: "hour-full", hour: change.hour });
      if (selection.court === null || isFree(selection.date, selection.court, change.hour, ctx)) return unchanged({ ...selection, hour: change.hour });
      return unchanged(selection, { kind: "hour-busy", court: selection.court, hour: change.hour, alternatives: alternativesFor("hour", selection.date, selection.court, change.hour, ctx), ...yoursFlag(selection.date, selection.court, change.hour, ctx) });
    }
    case "pick": {
      if (!isFree(selection.date, change.court, change.hour, ctx)) return unchanged(selection, { kind: "pick-unavailable", court: change.court, hour: change.hour });
      return unchanged({ ...selection, court: change.court, hour: change.hour });
    }
  }
}

/**
 * Reevalúa la selección contra el reloj y las reservas actuales (la página puede quedar abierta).
 * Devuelve el mismo objeto cuando nada cambió, para poder derivar el estado en cada render.
 */
export function revalidate(selection: Selection, ctx: Context): Outcome {
  const { nowMs } = ctx;
  if (selection.date < clubClock(nowMs).date) {
    return { selection: { date: defaultDate(nowMs), court: selection.court, hour: null }, notice: { kind: "date-expired", date: selection.date } };
  }
  if (selection.hour !== null && !hourWorks(selection.date, selection.court, selection.hour, ctx)) {
    const reason = slotStarted(selection.date, selection.hour, nowMs) ? "past" : "unavailable";
    return { selection: { ...selection, hour: null }, notice: { kind: "hour-expired", hour: selection.hour, reason } };
  }
  return unchanged(selection);
}
