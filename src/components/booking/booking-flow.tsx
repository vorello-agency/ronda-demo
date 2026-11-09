"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { SLOT_LENGTH_TEXT, WEEKDAYS_LONG, changeAnnouncement, clubTimeNote, correctionText, formatHour, noticeAnnouncement } from "@/lib/booking/copy";
import { applyChange, revalidate, type Alternative, type Change, type Notice } from "@/lib/booking/conflicts";
import { today, weekday, type Hour, type IsoDate } from "@/lib/booking/club-time";
import { courtOptions, dayOptions, hourPeriods, noticeOrigin } from "@/lib/booking/flow-view";
import { planStateAttributes } from "@/lib/booking/plan-state";
import { canonicalSearch, parseSelection, type Correction, type ParamReader } from "@/lib/booking/selection";
import type { Booking, Selection } from "@/lib/booking/types";
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
};

/** Las reservas confirmadas llegan en E3; hasta entonces el contexto no tiene ninguna. */
const NO_BOOKINGS: readonly Booking[] = [];

function initialState(params: ParamReader, nowMs: number): FlowState {
  const { selection, corrections, dateExplicit } = parseSelection(params, nowMs, NO_BOOKINGS);
  return { selection, pinDate: dateExplicit, notice: null, corrections, announcement: { text: "", id: 0 } };
}

/**
 * Única frontera interactiva de la página. Lee «ahora» del reloj por minuto; sin reloj (servidor) muestra
 * el esqueleto. Los dibujos llegan del servidor como `art` y no se vuelven a renderizar.
 */
export function BookingFlow({ art, fallback }: { art: ReactNode; fallback: ReactNode }) {
  const nowMs = useClubNow();
  if (nowMs === null) return fallback;
  return <Flow art={art} nowMs={nowMs} />;
}

function Flow({ art, nowMs }: { art: ReactNode; nowMs: number }) {
  const params = useSearchParams();
  const root = useRef<HTMLDivElement>(null);
  // El estado se inicializa una sola vez desde la URL; después, la URL solo refleja el estado.
  const [state, setState] = useState(() => initialState(params, nowMs));
  const ctx = { nowMs, bookings: NO_BOOKINGS };

  // La selección efectiva se deriva en cada render: si con la página abierta vence el horario o el día, se corrige y se avisa.
  const checked = revalidate(state.selection, ctx);
  const selection = checked.selection;
  const notice = checked.notice ? { notice: checked.notice, origin: "hour" as const } : state.notice;
  const announcement = checked.notice ? { text: noticeAnnouncement(checked.notice), id: -1 } : state.announcement;

  const search = canonicalSearch(selection, nowMs, { pinDate: state.pinDate });
  useEffect(() => {
    const next = search ? `?${search}` : "";
    if (window.location.search !== next) window.history.replaceState(null, "", `${window.location.pathname}${next}`);
  }, [search]);

  function change(next: Change, origin: Origin = next.type === "court" ? "court" : "hour") {
    const outcome = applyChange(selection, next, ctx);
    setState((previous) => ({
      selection: outcome.selection,
      pinDate: previous.pinDate || next.type === "date",
      notice: outcome.notice ? { notice: outcome.notice, origin: noticeOrigin(outcome.notice, origin) } : null,
      corrections: [],
      announcement: { text: changeAnnouncement(next, outcome), id: previous.announcement.id + 1 },
    }));
    return outcome;
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
    else focusIn('.ronda-booking-hour[aria-pressed="true"], .ronda-booking-hour:not(.is-full)', true);
  }

  const periods = hourPeriods(selection, ctx);
  // Solo si quien visita está en otra zona horaria: explica por qué faltan horarios de hoy.
  const clubNote = clubTimeNote(nowMs, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const courtsNow = courtOptions(selection, ctx);

  return <div className="ronda-booking-flow" ref={root}>
    <p className="sr-only" role="status"><span key={announcement.id}>{announcement.text}</span></p>

    <DayRibbon days={dayOptions(nowMs)} selected={selection.date} onSelect={(date) => change({ type: "date", date })} />

    {state.corrections.length > 0 && <p className="ronda-booking-correction">{state.corrections.map(correctionText).join(" ")}</p>}

    <p className="ronda-booking-lead">Elegí cancha u horario, en el orden que prefieras.</p>

    <div className="ronda-booking-stage">
      <section className="ronda-booking-where" aria-labelledby="ronda-where-title">
        <div className="ronda-booking-panel-head">
          <h2 className="ronda-booking-question" id="ronda-where-title">¿Dónde?</h2>
          <p className="ronda-booking-meta">{whereMeta(selection.date, selection.hour, nowMs)}</p>
        </div>
        <CourtPlan
          art={art}
          options={courtsNow}
          hour={selection.hour}
          attributes={planStateAttributes(selection, ctx)}
          onSelect={(court) => change({ type: "court", court })}
        />
        {notice?.origin === "court" && <BookingNotice notice={notice.notice} onPick={(alternative) => pick(alternative, "court")} />}
      </section>

      <div className="ronda-booking-side">
        <section aria-labelledby="ronda-when-title">
          <div className="ronda-booking-panel-head">
            <h2 className="ronda-booking-question" id="ronda-when-title">¿A qué hora?</h2>
            <p className="ronda-booking-meta">
              {SLOT_LENGTH_TEXT}
              {/* El espacio separa las dos frases para lectores de pantalla; visualmente la nota va en su renglón. */}
              {clubNote && <> <span className="ronda-booking-meta-note">{clubNote}</span></>}
            </p>
          </div>
          <HourPicker periods={periods} selectedHour={selection.hour} selectedCourt={selection.court} onSelect={(hour) => change({ type: "hour", hour })} />
          {notice?.origin === "hour" && <BookingNotice notice={notice.notice} onPick={(alternative) => pick(alternative, "hour")} />}
        </section>
        <BookingSummary selection={selection} onJump={jump} />
      </div>
    </div>
  </div>;
}

/** Qué momento muestra el plano: el día entero o la hora elegida. */
function whereMeta(date: IsoDate, hour: Hour | null, nowMs: number): string {
  const day = date === today(nowMs) ? "Hoy" : `${capitalize(WEEKDAYS_LONG[weekday(date)])} ${Number(date.slice(8, 10))}`;
  return `${day}, ${hour === null ? "todo el día" : formatHour(hour)}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
