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
      return `${taken(notice)} Elegí otra cancha para ese horario.`;
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

type HourOptionLike = { hour: Hour; free: readonly CourtId[]; tone: "free" | "alt" | "full" };
type CourtOptionLike = { id: CourtId; state: "idle" | "free" | "taken" | "yours"; selected: boolean; freeHours: number };

const surfaceOf = (id: CourtId) => courts.find((court) => court.id === id)?.surface ?? "";

/** Nombre accesible de un horario: el rango y qué canchas tienen lugar. */
export function hourOptionLabel(option: HourOptionLike, selectedCourt: CourtId | null): string {
  const range = formatRange(option.hour);
  if (option.tone === "full") return `${range}. Completo: ninguna cancha tiene lugar.`;
  const names = joinList(option.free.map(courtName));
  if (option.tone === "alt" && selectedCourt) return `${range}. ${courtName(selectedCourt)} está ocupada; libre en ${names}. Elegilo para ver alternativas.`;
  return `${range}. ${option.free.length} de ${courts.length} canchas libres: ${names}.`;
}

/**
 * Texto bajo el número de un horario. Solo habla cuando ayuda a decidir: nada si todas las canchas tienen lugar,
 * «1 libre» o «2 libres» si quedan pocas, «otra cancha» si la elegida está ocupada pero otra no, y «completo».
 */
export function hourCountText(option: HourOptionLike): string {
  if (option.tone === "full") return "completo";
  if (option.tone === "alt") return "otra cancha";
  if (option.free.length === courts.length) return "";
  return `${option.free.length} ${option.free.length === 1 ? "libre" : "libres"}`;
}

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

/** Qué se anuncia después de cada cambio. */
export function changeAnnouncement(change: Change, outcome: Outcome): string {
  if (outcome.notice) return noticeAnnouncement(outcome.notice);
  switch (change.type) {
    case "date": return `Disponibilidad del ${longDayLabel(change.date)}.`;
    case "court": return `${courtName(change.court)} elegida.`;
    case "hour": return `Horario de las ${formatHour(change.hour)} elegido.`;
    case "pick": return `Elegiste ${courtName(change.court)} a las ${formatHour(change.hour)}.`;
  }
}

/** Duración de los turnos, junto a «¿A qué hora?». */
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

/** «Cómo llegar»: el acceso está al oeste y las canchas se cuentan desde ahí, en el orden del plano. */
export function wayfindingText(court: CourtId): string {
  const position = courts.findIndex((item) => item.id === court);
  return `Entrá por el acceso oeste y seguí la galería del pabellón. ${courtName(court)} es la ${ORDINALS[position]} cancha desde el acceso.`;
}

/** Marcador de la confirmación: valor grande y detalle de cancha, día y hora («Jardín» · «02 · Arcilla», «Vie 06» · «noviembre», «19:00» · «hasta 20:00»). */
export const confirmationScore = (booking: Booking) => [
  { label: "Cancha", value: courtName(booking.court), detail: `${booking.court} · ${surfaceOf(booking.court)}` },
  { label: "Día", value: `${WEEKDAYS_SHORT[weekday(booking.date)]} ${pad(dayNumber(booking.date))}`, detail: MONTHS[monthIndex(booking.date)] },
  { label: "Hora", value: formatHour(booking.hour), detail: `hasta ${pad(booking.hour + 1)}:00` },
];

/** El turno confirmado ya no está disponible (por ejemplo, empezó mientras la página estaba abierta). */
export const confirmFailedText = (selection: Selection): string =>
  selection.hour === null ? "Elegí un horario para confirmar." : `El turno de las ${formatHour(selection.hour)} ya no está disponible. Elegí otro horario.`;
