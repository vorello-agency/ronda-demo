"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { confirmSelection } from "@/lib/booking/bookings";
import { SLOT_LENGTH_TEXT, WEEKDAYS_LONG, barText, changeAnnouncement, clubTimeNote, confirmFailedText, correctionText, firstMissing, formatHour, noticeAnnouncement } from "@/lib/booking/copy";
import { applyChange, revalidate, type Alternative, type Change, type Notice } from "@/lib/booking/conflicts";
import { today, weekday, type Hour, type IsoDate } from "@/lib/booking/club-time";
import { courtOptions, dayOptions, hourPeriods, noticeOrigin } from "@/lib/booking/flow-view";
import { planStateAttributes } from "@/lib/booking/plan-state";
import { canonicalSearch, parseSelection, type Correction, type ParamReader } from "@/lib/booking/selection";
import type { Booking, Selection } from "@/lib/booking/types";
import { BookingBar } from "./booking-bar";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingNotice } from "./booking-notice";
import { BookingSummary, type SummaryTarget } from "./booking-summary";
import { CourtPlan } from "./court-plan";
import { DayRibbon } from "./day-ribbon";
import { HourPicker } from "./hour-picker";
import { useClubNow } from "./use-club-now";

type Origin = "court" | "hour";
type FlowState = {
  selection: Selection;
  /** La fecha se conserva en la URL si vino en el enlace o si la persona tocó un día (ver `canonicalSearch`). */
  pinDate: boolean;
  notice: { notice: Notice; origin: Origin } | null;
  corrections: Correction[];
  announcement: { text: string; id: number };
  /** Reservas simuladas de esta visita. Viven en memoria: al recargar, la página vuelve a empezar. */
  bookings: readonly Booking[];
  /** Turno recién confirmado: mientras exista, se muestra la confirmación en lugar del flujo. */
  confirmed: Booking | null;
};

type Art = { art: ReactNode; intro: ReactNode; wayfinding: ReactNode };

function initialState(params: ParamReader, nowMs: number): FlowState {
  const { selection, corrections, dateExplicit } = parseSelection(params, nowMs);
  return { selection, pinDate: dateExplicit, notice: null, corrections, announcement: { text: "", id: 0 }, bookings: [], confirmed: null };
}

/**
 * Única frontera interactiva de la página. Lee «ahora» del reloj por minuto; sin reloj (servidor) muestra
 * el esqueleto. Los dibujos y la apertura llegan del servidor (`art`, `wayfinding`, `intro`) y no se vuelven
 * a renderizar en el cliente.
 */
export function BookingFlow({ fallback, ...server }: Art & { fallback: ReactNode }) {
  const nowMs = useClubNow();
  if (nowMs === null) return fallback;
  return <Flow {...server} nowMs={nowMs} />;
}

function Flow({ art, intro, wayfinding, nowMs }: Art & { nowMs: number }) {
  const params = useSearchParams();
  const root = useRef<HTMLDivElement>(null);
  const confirmTitle = useRef<HTMLHeadingElement>(null);
  // El estado se inicializa una sola vez desde la URL; después, la URL solo refleja el estado.
  const [state, setState] = useState(() => initialState(params, nowMs));
  // Se asume visible hasta que el observador diga lo contrario: así la barra no aparece un instante al cargar.
  const [ticketVisible, setTicketVisible] = useState(true);
  const ctx = { nowMs, bookings: state.bookings };

  // La selección efectiva se deriva en cada render: si con la página abierta vence el horario o el día, se corrige y se avisa.
  // Con la confirmación a la vista no se revalida: el turno propio ya no está «libre» y no hay nada que corregir.
  const checked = state.confirmed ? { selection: state.selection, notice: null } : revalidate(state.selection, ctx);
  const selection = checked.selection;
  const notice = checked.notice ? { notice: checked.notice, origin: "hour" as const } : state.notice;
  const announcement = checked.notice ? { text: noticeAnnouncement(checked.notice), id: -1 } : state.announcement;

  const search = canonicalSearch(selection, nowMs, { pinDate: state.pinDate });
  useEffect(() => {
    const next = search ? `?${search}` : "";
    if (window.location.search !== next) window.history.replaceState(null, "", `${window.location.pathname}${next}`);
  }, [search]);

  // Al confirmar, el foco va al título de la confirmación; al volver con «Hacer otra reserva», al título de la página.
  const shown = useRef(state.confirmed);
  useEffect(() => {
    if (shown.current === state.confirmed) return;
    shown.current = state.confirmed;
    const target = state.confirmed ? confirmTitle.current : document.getElementById("ronda-booking-title");
    target?.focus({ preventScroll: true });
    // La vista cambia entera: se muestra desde arriba, sin animar. Se repite en el cuadro siguiente porque el anclaje
    // de scroll del navegador puede correrla unos px al terminar de maquetar la vista nueva.
    const top = () => window.scrollTo({ top: 0, behavior: "instant" });
    top();
    const frame = requestAnimationFrame(top);
    return () => cancelAnimationFrame(frame);
  }, [state.confirmed]);

  // La barra fija acompaña solo mientras «Tu turno» está fuera de la pantalla.
  useEffect(() => {
    const ticket = root.current?.querySelector(".ronda-booking-ticket");
    if (!ticket) return;
    const observer = new IntersectionObserver(([entry]) => setTicketVisible(entry.isIntersecting), { rootMargin: "0px 0px -8px 0px" });
    observer.observe(ticket);
    return () => observer.disconnect();
  }, [state.confirmed]);

  function change(next: Change, origin: Origin = next.type === "court" ? "court" : "hour") {
    const outcome = applyChange(selection, next, ctx);
    setState((previous) => ({
      selection: outcome.selection,
      pinDate: previous.pinDate || next.type === "date",
      notice: outcome.notice ? { notice: outcome.notice, origin: noticeOrigin(outcome.notice, origin) } : null,
      corrections: [],
      announcement: { text: changeAnnouncement(next, outcome, selection), id: previous.announcement.id + 1 },
      bookings: previous.bookings,
      confirmed: null,
    }));
    return outcome;
  }

  /** Confirma contra las reservas del estado anterior: un doble toque devuelve el mismo turno, sin duplicarlo. */
  function confirm() {
    setState((previous) => {
      const result = confirmSelection(selection, { nowMs, bookings: previous.bookings });
      if (!result.ok) return { ...previous, announcement: { text: confirmFailedText(selection), id: previous.announcement.id + 1 } };
      return { ...previous, selection, bookings: result.bookings, confirmed: result.booking, notice: null, corrections: [], announcement: { text: "", id: previous.announcement.id + 1 } };
    });
  }

  /** «Hacer otra reserva»: conserva el día y vuelve a empezar con cancha y hora. */
  function again() {
    setState((previous) => ({
      ...previous,
      selection: { date: previous.selection.date, court: null, hour: null },
      confirmed: null,
      notice: null,
      announcement: { text: "", id: previous.announcement.id + 1 },
    }));
  }

  /** Botón de la barra: con la selección completa, «Revisar» lleva a «Tu turno» y deja el foco en la confirmación; si falta algo, lleva a elegirlo. */
  function review() {
    const missing = firstMissing(selection);
    if (missing) jump(missing);
    else focusIn(".ronda-booking-confirm", true);
  }

  function pick(alternative: Alternative, origin: Origin) {
    change({ type: "pick", ...alternative }, origin);
    focusIn(`[data-court-tag="${alternative.court}"]`);
  }

  function focusIn(selector: string, scroll = false) {
    const element = root.current?.querySelector<HTMLElement>(selector);
    if (!element) return;
    if (scroll) element.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    element.focus({ preventScroll: scroll });
  }

  function jump(target: SummaryTarget) {
    if (target === "court") focusIn('[data-court-tag][aria-pressed="true"], [data-court-tag]', true);
    else if (target === "date") focusIn('.ronda-booking-day[aria-pressed="true"]', true);
    else focusIn('.ronda-booking-hour[aria-pressed="true"], .ronda-booking-hour.is-free', true);
  }

  const status = <p className="sr-only" role="status"><span key={announcement.id}>{announcement.text}</span></p>;
  if (state.confirmed) return <>
    {status}
    <BookingConfirmation booking={state.confirmed} wayfinding={wayfinding} titleRef={confirmTitle} onAgain={again} />
  </>;

  const periods = hourPeriods(selection, ctx);
  // Solo si quien visita está en otra zona horaria: explica por qué faltan horarios de hoy.
  const clubNote = clubTimeNote(nowMs, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const courtsNow = courtOptions(selection, ctx);

  const bar = barText(selection, nowMs);

  return <>{intro}<div className="ronda-booking-flow" data-motion={state.announcement.id > 0 ? "ready" : undefined} ref={root}>
    {status}

    <DayRibbon days={dayOptions(nowMs)} selected={selection.date} onSelect={(date) => change({ type: "date", date })} />

    {state.corrections.length > 0 && <p className="ronda-booking-correction">{state.corrections.map(correctionText).join(" ")}</p>}

    {/* Orden del DOM = orden en celular y tablet: hora, cancha y tu turno. Desde 1024 px la grilla pone el plano a la izquierda. */}
    <div className="ronda-booking-stage">
      <section className="ronda-booking-when" aria-labelledby="ronda-when-title">
        <div className="ronda-booking-panel-head">
          <h2 className="ronda-booking-question" id="ronda-when-title">Elegir hora</h2>
          <p className="ronda-booking-meta">
            {SLOT_LENGTH_TEXT}
            {/* El espacio separa las dos frases para lectores de pantalla; visualmente la nota va en su renglón. */}
            {clubNote && <> <span className="ronda-booking-meta-note">{clubNote}</span></>}
          </p>
        </div>
        {/* La clave es el día: al cambiarlo, los horarios se vuelven a montar y su disponibilidad entra con un fundido. */}
        <HourPicker
          key={selection.date}
          periods={periods}
          selectedHour={selection.hour}
          selectedCourt={selection.court}
          onSelect={(hour) => change({ type: "hour", hour })}
          onCourt={(court) => change({ type: "court", court }, "hour")}
        />
        {notice?.origin === "hour" && <BookingNotice key={JSON.stringify(notice.notice)} notice={notice.notice} onPick={(alternative) => pick(alternative, "hour")} />}
      </section>

      <section className="ronda-booking-where" aria-labelledby="ronda-where-title">
        <div className="ronda-booking-panel-head">
          <h2 className="ronda-booking-question" id="ronda-where-title">Elegir cancha</h2>
          <p className="ronda-booking-meta">{whereMeta(selection.date, selection.hour, nowMs)}</p>
        </div>
        <CourtPlan
          art={art}
          options={courtsNow}
          hour={selection.hour}
          attributes={planStateAttributes(selection, ctx)}
          onSelect={(court) => change({ type: "court", court })}
        />
        {notice?.origin === "court" && <BookingNotice key={JSON.stringify(notice.notice)} notice={notice.notice} onPick={(alternative) => pick(alternative, "court")} />}
      </section>

      <BookingSummary selection={selection} onJump={jump} onConfirm={confirm} />
    </div>

    <BookingBar text={bar} visible={!ticketVisible} missing={firstMissing(selection)} onReview={review} />
  </div></>;
}

/** Qué momento muestra el plano: el día entero o la hora elegida. */
function whereMeta(date: IsoDate, hour: Hour | null, nowMs: number): string {
  const day = date === today(nowMs) ? "Hoy" : `${capitalize(WEEKDAYS_LONG[weekday(date)])} ${Number(date.slice(8, 10))}`;
  return `${day}, ${hour === null ? "todo el día" : formatHour(hour)}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
