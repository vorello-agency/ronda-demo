"use client";

import { courts } from "@/data/courts";
import type { Hour } from "@/lib/booking/club-time";
import { ALL_COURTS_ACTION, ALL_COURTS_LABEL, COURT_FILTER_LABEL, hourCountText, hourNoteText, hourOptionLabel } from "@/lib/booking/copy";
import { hourNote, type HourPeriod } from "@/lib/booking/flow-view";
import { busyAttribute } from "@/lib/booking/plan-state";
import type { CourtId } from "@/lib/booking/types";
import { useRoving } from "./use-roving";

type Props = {
  periods: HourPeriod[];
  selectedHour: Hour | null;
  selectedCourt: CourtId | null;
  onSelect: (hour: Hour) => void;
  onCourt: (court: CourtId | null) => void;
};

/**
 * «Ver horarios de» y los horarios por franja. Cada hora tiene dos estados, relativos a la cancha elegida (o a
 * todas): se puede elegir, o va tachada con «sin lugar» (aria-disabled, pero enfocable y explica por qué al
 * activarla). Si alguna hora tachada tiene lugar en otra cancha, una nota debajo lo dice y ofrece «Ver todas».
 * `data-busy` permite que el plano previsualice las canchas ocupadas al pasar o enfocar un horario (solo CSS).
 */
export function HourPicker({ periods, selectedHour, selectedCourt, onSelect, onCourt }: Props) {
  const options = periods.flatMap((period) => period.options);
  const firstOpen = options.find((option) => option.tone === "free")?.hour ?? null;
  // En grilla: desde 1280 px los horarios son dos filas de 7 y, por debajo, una fila por franja.
  const { itemProps, groupProps } = useRoving(options.map((option) => option.hour), selectedHour ?? firstOpen, { grid: true });
  const note = hourNote(periods, selectedCourt);

  return <>
    <CourtFilter selected={selectedCourt} onSelect={onCourt} />
    {options.length === 0
      ? <p className="ronda-booking-empty">Ya no quedan turnos este día. Elegí otro día.</p>
      : <div className="ronda-booking-hours" role="group" aria-labelledby="ronda-when-title" {...groupProps}>
        {periods.map((period) => <div key={period.label} className="ronda-booking-hour-row">
          <span className="ronda-booking-period" aria-hidden="true">{period.label}</span>
          <div className="ronda-booking-hour-list">
            {period.options.map((option) => <button
              key={option.hour}
              type="button"
              className={`ronda-booking-hour is-${option.tone}`}
              data-busy={busyAttribute(option.busy)}
              aria-pressed={option.hour === selectedHour}
              aria-disabled={option.tone === "none" ? true : undefined}
              aria-label={hourOptionLabel(option, selectedCourt)}
              onClick={() => onSelect(option.hour)}
              {...itemProps(option.hour)}
            >
              <span className="ronda-booking-hour-number" aria-hidden="true">{String(option.hour).padStart(2, "0")}<span className="ronda-booking-hour-unit">hs</span></span>
              <span className="ronda-booking-hour-count" aria-hidden="true">{hourCountText(option)}</span>
            </button>)}
          </div>
        </div>)}
      </div>}
    {note && <div className="ronda-booking-hour-note">
      <p>{hourNoteText(note)}</p>
      <button type="button" className="ronda-booking-hour-note-action" onClick={() => onCourt(null)}>{ALL_COURTS_ACTION}</button>
    </div>}
  </>;
}

type FilterKey = CourtId | "all";

/**
 * «Ver horarios de: Todas · Club · Central · Jardín». No es un filtro aparte: elegir una opción es elegir la
 * cancha, igual que en el plano, y los dos quedan sincronizados. Activación manual, como en el plano: recorrer con
 * flechas no elige ni dispara conflictos.
 */
function CourtFilter({ selected, onSelect }: { selected: CourtId | null; onSelect: (court: CourtId | null) => void }) {
  const items: { key: FilterKey; label: string }[] = [{ key: "all", label: ALL_COURTS_LABEL }, ...courts.map((court) => ({ key: court.id, label: court.name }))];
  const current: FilterKey = selected ?? "all";
  const { itemProps, groupProps } = useRoving(items.map((item) => item.key), current);
  return <div className="ronda-booking-filter">
    <span className="ronda-booking-filter-label" id="ronda-filter-label">{COURT_FILTER_LABEL}</span>
    <div className="ronda-booking-filter-list" role="group" aria-labelledby="ronda-filter-label" {...groupProps}>
      {items.map((item) => <button
        key={item.key}
        type="button"
        className="ronda-booking-filter-option"
        aria-pressed={item.key === current}
        onClick={() => { if (item.key !== current) onSelect(item.key === "all" ? null : item.key); }}
        {...itemProps(item.key)}
      >{item.label}</button>)}
    </div>
  </div>;
}

/** Lo mismo, sin interacción, para el esqueleto: reserva su alto y sus textos son definitivos. */
export function CourtFilterPlaceholder() {
  return <div className="ronda-booking-filter" aria-hidden="true">
    <span className="ronda-booking-filter-label">{COURT_FILTER_LABEL}</span>
    <div className="ronda-booking-filter-list">
      {[ALL_COURTS_LABEL, ...courts.map((court) => court.name)].map((label) => <span key={label} className="ronda-booking-filter-option">{label}</span>)}
    </div>
  </div>;
}
