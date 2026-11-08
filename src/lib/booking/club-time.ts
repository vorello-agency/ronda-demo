/**
 * Fechas y horarios del club. Todo ocurre en la hora de Montevideo, sin importar la zona del dispositivo.
 * Las funciones son puras: reciben `nowMs` (milisegundos desde epoch) en lugar de leer el reloj.
 */
export const CLUB_TIME_ZONE = "America/Montevideo";
export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] as const;
export type Hour = (typeof HOURS)[number];
export const SLOT_MINUTES = 60;
/** Días reservables contando hoy. */
export const HORIZON_DAYS = 14;

/** Fecha civil del club, «AAAA-MM-DD». */
export type IsoDate = string;

const clubFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLUB_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Fecha y minutos desde la medianoche en el club para un instante dado. */
export function clubClock(nowMs: number): { date: IsoDate; minutes: number } {
  const parts: Record<string, string> = {};
  for (const part of clubFormat.formatToParts(nowMs)) parts[part.type] = part.value;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
  };
}

export const today = (nowMs: number): IsoDate => clubClock(nowMs).date;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Devuelve la fecha solo si existe en el calendario («2026-02-30» no existe). */
export function parseIsoDate(value: string | null | undefined): IsoDate | null {
  const match = value ? ISO_DATE.exec(value) : null;
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value ? (value as IsoDate) : null;
}

const toUtc = (date: IsoDate) => new Date(`${date}T00:00:00Z`);

export function addDays(date: IsoDate, days: number): IsoDate {
  const result = toUtc(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado. */
export const weekday = (date: IsoDate): number => toUtc(date).getUTCDay();
export const isWeekend = (date: IsoDate): boolean => weekday(date) === 0 || weekday(date) === 6;

export const isHour = (value: number): value is Hour => (HOURS as readonly number[]).includes(value);

/** Las fechas reservables: hoy y los siguientes días del horizonte. */
export function horizonDates(nowMs: number): IsoDate[] {
  const first = today(nowMs);
  return Array.from({ length: HORIZON_DAYS }, (_, index) => addDays(first, index));
}

export const isWithinHorizon = (date: IsoDate, nowMs: number): boolean => horizonDates(nowMs).includes(date);

/** Un turno vence cuando empieza. */
export function slotStarted(date: IsoDate, hour: Hour, nowMs: number): boolean {
  const clock = clubClock(nowMs);
  if (date !== clock.date) return date < clock.date;
  return hour * 60 <= clock.minutes;
}

/** Horarios de un día que todavía no empezaron. */
export const bookableHours = (date: IsoDate, nowMs: number): Hour[] =>
  HOURS.filter((hour) => !slotStarted(date, hour, nowMs));

/** Hoy mientras queden turnos; si no, mañana. */
export function defaultDate(nowMs: number): IsoDate {
  const first = today(nowMs);
  return bookableHours(first, nowMs).length > 0 ? first : addDays(first, 1);
}
