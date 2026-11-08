import { courts } from "../../data/courts.ts";
import type { Alternative, Notice } from "./conflicts.ts";
import { HORIZON_DAYS, today, weekday, type Hour, type IsoDate } from "./club-time.ts";
import type { Correction } from "./selection.ts";
import type { CourtId } from "./types.ts";

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

export function noticeText(notice: Notice): string {
  switch (notice.kind) {
    case "court-busy":
      return `${courtName(notice.court)} está ocupada a las ${formatHour(notice.hour)}. Mantuvimos la cancha y liberamos el horario.`;
    case "hour-busy":
      return `A las ${formatHour(notice.hour)} ${courtName(notice.court)} está ocupada. Mantuvimos el horario y liberamos la cancha.`;
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
        : `Las ${formatHour(notice.hour)} dejaron de estar libres. Elegí otro horario.`;
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
