"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { courts } from "@/data/courts";
import { SLOT_MINUTES, weekday } from "@/lib/booking/club-time";
import { WEEKDAYS_SHORT, formatHour, formatRange } from "@/lib/booking/copy";
import type { Selection } from "@/lib/booking/types";

export type SummaryTarget = "court" | "date" | "hour";

type Props = { selection: Selection; onJump: (target: SummaryTarget) => void; onConfirm: () => void };

/**
 * «Tu turno»: una línea con cancha, día y hora. Cada dato lleva al control que lo cambia.
 * Con cancha y hora elegidas aparece la acción principal: confirmar la reserva simulada.
 */
export function BookingSummary({ selection, onJump, onConfirm }: Props) {
  const court = courts.find((item) => item.id === selection.court);
  const day = `${WEEKDAYS_SHORT[weekday(selection.date)]} ${selection.date.slice(8, 10)}`;
  const hour = selection.hour === null ? null : formatHour(selection.hour);
  const items: { target: SummaryTarget; label: string; value: string | null; placeholder: string }[] = [
    { target: "court", label: "Cancha", value: court?.name ?? null, placeholder: "Elegí cancha" },
    { target: "date", label: "Día", value: day, placeholder: "" },
    { target: "hour", label: "Hora", value: hour, placeholder: "Elegí hora" },
  ];
  const details = [court?.surface, selection.hour === null ? null : formatRange(selection.hour)].filter(Boolean).join(" · ");

  return <section className="ronda-booking-ticket" aria-labelledby="ronda-ticket-title">
    <h2 className="eyebrow" id="ronda-ticket-title">Tu turno</h2>
    <div className="ronda-booking-summary">
      {items.map((item) => <button
        key={item.target}
        type="button"
        className={`ronda-booking-summary-item${item.value ? "" : " is-empty"}`}
        aria-label={`${item.label}: ${item.value ?? "sin elegir"}. ${item.value ? "Cambiar" : "Elegir"}`}
        onClick={() => onJump(item.target)}
      >
        <span className="ronda-booking-summary-label" aria-hidden="true">{item.label}</span>
        <span className="ronda-booking-summary-value" aria-hidden="true">{item.value ?? item.placeholder}</span>
      </button>)}
    </div>
    <p className="ronda-booking-summary-caption">{details || `Turno de ${SLOT_MINUTES} minutos`}</p>
    {court && hour && <button type="button" className="button ronda-booking-confirm" onClick={onConfirm}>
      Confirmar reserva simulada <ArrowRightIcon size={20} weight="light" aria-hidden="true" />
    </button>}
    <p className="ronda-booking-fine">Simulación: no se reserva la cancha ni se cobra nada.</p>
  </section>;
}
