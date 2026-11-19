import { courts } from "../../data/courts.ts";
import type { Alternative, Change, Notice, Outcome } from "./conflicts.ts";
import { CLUB_TIME_ZONE, HORIZON_DAYS, SLOT_MINUTES, today, weekday, type Hour, type IsoDate } from "./club-time.ts";
import type { Correction } from "./selection.ts";
import type { Booking, CourtId, Selection } from "./types.ts";

/** Textos de la experiencia de reservas. La lógica devuelve datos; acá se redactan. */
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
export const WEEKDAYS_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
export const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] as const;

/** Franjas de la grilla de horarios. Cubren `HOURS` completo, en orden y sin solaparse. */
export const HOUR_PERIODS = [
  { label: "Mañana", hours: [8, 9, 10, 11] },
  { label: "Tarde", hours: [12, 13, 14, 15, 16, 17] },
  { label: "Noche", hours: [18, 19, 20, 21] },
] as const satisfies readonly { label: string; hours: readonly Hour[] }[];

export const courtName = (id: CourtId): string => courts.find((court) => court.id === id)?.name ?? id;

const pad = (value: number) => String(value).padStart(2, "0");
export const formatHour = (hour: Hour): string => `${pad(hour)}:00`;
/** «19:00 a 20:00». */
export const formatRange = (hour: Hour): string => `${formatHour(hour)} a ${pad(hour + 1)}:00`;
/** «Hasta las 20:00»: el fin del turno que empieza a esa hora. */
export const slotEndText = (hour: Hour): string => `Hasta las ${pad(hour + 1)}:00`;

const dayNumber = (date: IsoDate) => Number(date.slice(8, 10));
const monthIndex = (date: IsoDate) => Number(date.slice(5, 7)) - 1;

/** «Hoy» para el día actual; para el resto, «Vie 06». */
export const dayLabel = (date: IsoDate, nowMs: number): string =>
  date === today(nowMs) ? "Hoy" : `${WEEKDAYS_SHORT[weekday(date)]} ${pad(dayNumber(date))}`;

/** «viernes 6 de noviembre». */
export const longDayLabel = (date: IsoDate): string => `${WEEKDAYS_LONG[weekday(date)]} ${dayNumber(date)} de ${MONTHS[monthIndex(date)]}`;

/** «A, B y C». */
export function joinList(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export const alternativeLabel = (alternative: Alternative): string => `${courtName(alternative.court)} a las ${formatHour(alternative.hour)}`;

/** «Jardín está ocupada a las 20:00.», o «Ya reservaste Jardín a las 20:00.» si el turno es de esta visita. */
const taken = (notice: { court: CourtId; hour: Hour; yours?: true }): string =>
  notice.yours
    ? `Ya reservaste ${courtName(notice.court)} a las ${formatHour(notice.hour)}.`
    : `${courtName(notice.court)} está ocupada a las ${formatHour(notice.hour)}.`;

export function noticeText(notice: Notice): string {
  switch (notice.kind) {
    case "court-busy":
      return `${taken(notice)} Elegí otro horario para ${courtName(notice.court)}.`;
    case "hour-busy":
      return `${taken(notice)} Elegí otra cancha u otro horario.`;
    case "hour-full":
      return `A las ${formatHour(notice.hour)} no queda ninguna cancha libre.`;
    case "date-no-room":
      return notice.reason === "past"
        ? `El turno de las ${formatHour(notice.hour)} del ${longDayLabel(notice.date)} ya pasó. Elegí otro horario.`
        : `El ${longDayLabel(notice.date)} no hay lugar a las ${formatHour(notice.hour)}${notice.court ? ` en ${courtName(notice.court)}` : ""}. Elegí otro horario.`;
    case "pick-unavailable":
      return `${courtName(notice.court)} a las ${formatHour(notice.hour)} ya no está disponible. Elegí otro turno.`;
    case "date-expired":
      return `El ${longDayLabel(notice.date)} ya pasó. Te mostramos la disponibilidad actual.`;
    case "hour-expired":
      return notice.reason === "past"
        ? `El turno de las ${formatHour(notice.hour)} ya empezó. Elegí otro horario.`
        : `A las ${formatHour(notice.hour)} ya no queda lugar. Elegí otro horario.`;
  }
}

export function correctionText(correction: Correction): string {
  switch (correction.kind) {
    case "date-invalid":
      return "La fecha del enlace no es válida. Te mostramos la próxima con turnos.";
    case "date-past":
      return "La fecha del enlace ya pasó. Te mostramos la próxima con turnos.";
    case "date-out-of-range":
      return `Solo se puede consultar los próximos ${HORIZON_DAYS} días. Te mostramos la próxima con turnos.`;
    case "court-invalid":
      return "No encontramos esa cancha. Elegí una en el plano.";
    case "hour-invalid":
      return "El horario del enlace no es válido. Elegí uno de la lista.";
    case "hour-unavailable":
      return correction.reason === "past"
        ? `El turno de las ${formatHour(correction.hour)} del enlace ya empezó. Elegí otro horario.`
        : `El horario de las ${formatHour(correction.hour)} del enlace no está disponible${correction.court ? ` en ${courtName(correction.court)}` : ""}. Elegí otro.`;
  }
}

/* ---- Etiquetas y anuncios del flujo interactivo ---- */

type HourOptionLike = { hour: Hour; free: readonly CourtId[]; tone: "free" | "none" };
type CourtOptionLike = { id: CourtId; state: "idle" | "free" | "taken" | "yours"; selected: boolean; freeHours: number };

const surfaceOf = (id: CourtId) => courts.find((court) => court.id === id)?.surface ?? "";

/** Control sobre la grilla: filtra los horarios por cancha. Elegir una opción es elegir la cancha (o ninguna). */
export const COURT_FILTER_LABEL = "Ver horarios de";
export const ALL_COURTS_LABEL = "Todas";

/**
 * Nombre accesible de un horario: el rango y dónde hay lugar.
 *   «19:00 a 20:00. Todas, libre en Club y Jardín.»          con «Todas» (sin cancha elegida);
 *   «19:00 a 20:00. Todas, sin lugar en ninguna cancha.»
 *   «19:00 a 20:00. Libre en Central.»                       con cancha elegida y lugar;
 *   «19:00 a 20:00. Sin lugar en Central. Libre en Club.»    con cancha elegida, sin lugar, y otra cancha libre;
 *   «19:00 a 20:00. Sin lugar en ninguna cancha.»
 */
export function hourOptionLabel(option: HourOptionLike, selectedCourt: CourtId | null): string {
  const range = formatRange(option.hour);
  if (selectedCourt === null) return `${range}. ${ALL_COURTS_LABEL}, ${option.free.length === 0 ? "sin lugar en ninguna cancha" : `libre en ${joinList(option.free.map(courtName))}`}.`;
  if (option.free.length === 0) return `${range}. Sin lugar en ninguna cancha.`;
  if (option.tone === "free") return `${range}. Libre en ${courtName(selectedCourt)}.`;
  return `${range}. Sin lugar en ${courtName(selectedCourt)}. Libre en ${joinList(option.free.map(courtName))}.`;
}

/**
 * Texto bajo la hora: «sin lugar» si no se puede elegir (con la cancha elegida, o en ninguna); vacío si se puede.
 * Una sola palabra para un solo significado: «con lo que elegiste, a esta hora no podés reservar».
 */
export const hourCountText = (option: HourOptionLike): string => (option.tone === "none" ? "sin lugar" : "");

/** Nota bajo la grilla (ver `hourNote` en flow-view). La acción va en el botón «Ver todas»: el texto no la repite. */
export function hourNoteText(note: { kind: "day" | "all" | "some"; court: CourtId }): string {
  if (note.kind === "day") return `${courtName(note.court)} no tiene lugar este día.`;
  return `${note.kind === "all" ? "Las" : "Algunas"} horas tachadas tienen lugar en otras canchas.`;
}
export const ALL_COURTS_ACTION = "Ver todas";

/*
 * Vocabulario: «libre» siempre describe una cancha («2 libres» bajo un horario son canchas). Lo que se cuenta
 * por cancha son «turnos», como en «Tu turno».
 */
const turns = (count: number) => `${count} ${count === 1 ? "turno" : "turnos"}`;

/** Línea de estado visible bajo el nombre de la cancha. */
export function courtStatusText(option: CourtOptionLike): string {
  if (option.selected) return "Elegida";
  if (option.state === "free") return "Libre";
  if (option.state === "taken") return "Ocupada";
  if (option.state === "yours") return "Tu reserva";
  return `${surfaceOf(option.id)} · ${turns(option.freeHours)}`;
}

/** Nombre accesible de una cancha: nombre, número, superficie, si está elegida y su disponibilidad. */
export function courtOptionLabel(option: CourtOptionLike, hour: Hour | null): string {
  const availability = option.state === "idle"
    ? `${turns(option.freeHours)} ${option.freeHours === 1 ? "disponible" : "disponibles"}`
    : `${option.state === "free" ? "Libre" : option.state === "yours" ? "Tu reserva" : "Ocupada"} a las ${formatHour(hour as Hour)}`;
  return `${courtName(option.id)}, cancha ${option.id}, ${surfaceOf(option.id).toLowerCase()}. ${option.selected ? "Elegida. " : ""}${availability}.`;
}

/** El aviso y sus alternativas, para el anuncio de lectores de pantalla. */
export function noticeAnnouncement(notice: Notice): string {
  const alternatives = "alternatives" in notice ? notice.alternatives : [];
  if (alternatives.length === 0) return noticeText(notice);
  const labels = alternatives.map(alternativeLabel);
  const options = labels.length < 2 ? labels.join("") : `${labels.slice(0, -1).join(", ")} o ${labels[labels.length - 1]}`;
  return `${noticeText(notice)} ${labels.length === 1 ? "Alternativa" : "Alternativas"}: ${options}.`;
}

/**
 * Qué se anuncia después de cada cambio. `before` es la selección previa: al elegir «Todas» se nombra la cancha
 * que deja de estar elegida, para que no se pierda en silencio.
 */
export function changeAnnouncement(change: Change, outcome: Outcome, before?: Selection): string {
  if (outcome.notice) return noticeAnnouncement(outcome.notice);
  switch (change.type) {
    case "date": return `Disponibilidad del ${longDayLabel(change.date)}.`;
    case "court":
      if (change.court !== null) return `${courtName(change.court)} elegida.`;
      return before?.court ? `Horarios de todas las canchas. ${courtName(before.court)} ya no está elegida.` : "Horarios de todas las canchas.";
    case "hour": return `Horario de las ${formatHour(change.hour)} elegido.`;
    case "pick": return `Elegiste ${courtName(change.court)} a las ${formatHour(change.hour)}.`;
  }
}

/** Duración de los turnos, junto a «Elegir hora». */
export const SLOT_LENGTH_TEXT = `Turnos de ${SLOT_MINUTES} minutos`;

const wallClock = (nowMs: number, timeZone: string) =>
  new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(nowMs);

/**
 * «En el club son las 10:40», solo si el reloj de quien visita marca otra hora. Explica por qué faltan horarios
 * de hoy sin nombrar una ciudad que la landing no menciona. Sin zona conocida o válida, no dice nada.
 */
export function clubTimeNote(nowMs: number, visitorTimeZone: string | undefined): string | null {
  if (!visitorTimeZone) return null;
  try {
    const club = wallClock(nowMs, CLUB_TIME_ZONE);
    return wallClock(nowMs, visitorTimeZone) === club ? null : `En el club son las ${club}`;
  } catch {
    return null;
  }
}

/* ---- Confirmación y barra fija ---- */

/**
 * Texto de la barra fija en celular, que acompaña mientras «Tu turno» queda fuera de la pantalla.
 * Vacío si no hay nada elegido: la barra no se muestra.
 */
export function barText(selection: Selection, nowMs: number): string {
  const court = selection.court === null ? null : courtName(selection.court);
  const hour = selection.hour === null ? null : formatHour(selection.hour);
  if (court && hour) return `${court} · ${dayLabel(selection.date, nowMs)} · ${hour}`;
  if (court) return `${court} · falta la hora`;
  if (hour) return `${hour} · falta la cancha`;
  return "";
}

const ORDINALS = ["primera", "segunda", "tercera"] as const;

/** «Cómo llegar»: se entra por el pabellón, en el extremo oeste, y las canchas se cuentan desde ahí por la galería. */
export function wayfindingText(court: CourtId): string {
  const position = courts.findIndex((item) => item.id === court);
  return `Entrá por el pabellón y seguí la galería. ${courtName(court)} es la ${ORDINALS[position]} cancha.`;
}

/** Marcador de la confirmación: valor grande y detalle de cancha, día y hora («Central» · «02 · Arcilla», «Vie 06» · «noviembre», «19:00» · «hasta 20:00»). */
export const confirmationScore = (booking: Booking) => [
  { label: "Cancha", value: courtName(booking.court), detail: `${booking.court} · ${surfaceOf(booking.court)}` },
  { label: "Día", value: `${WEEKDAYS_SHORT[weekday(booking.date)]} ${pad(dayNumber(booking.date))}`, detail: MONTHS[monthIndex(booking.date)] },
  { label: "Hora", value: formatHour(booking.hour), detail: `hasta ${pad(booking.hour + 1)}:00` },
];

/** El turno confirmado ya no está disponible (por ejemplo, empezó mientras la página estaba abierta). */
export const confirmFailedText = (selection: Selection): string =>
  selection.hour === null ? "Elegí un horario para confirmar." : `El turno de las ${formatHour(selection.hour)} ya no está disponible. Elegí otro horario.`;

/* ---- Resumen: lo que falta y el aviso junto al botón ---- */

/** Qué falta para confirmar, en una frase; `null` con cancha y hora elegidas. */
export function missingText(selection: Selection): string | null {
  if (selection.court === null && selection.hour === null) return "Falta elegir hora y cancha.";
  if (selection.court === null) return "Falta elegir la cancha.";
  if (selection.hour === null) return "Falta elegir la hora.";
  return null;
}

/** Junto al botón de confirmar, con la selección completa: nadie va a pedir nombre ni pago. */
export const DEMO_CONFIRM_NOTE = "Sin datos personales ni pago: es una demostración.";

/** Qué falta elegir primero: la hora, después la cancha, como en la página. `null` con la selección completa. */
export const firstMissing = (selection: Selection): "court" | "hour" | null =>
  selection.hour === null ? "hour" : selection.court === null ? "court" : null;
