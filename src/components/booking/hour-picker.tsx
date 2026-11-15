"use client";

import type { Hour } from "@/lib/booking/club-time";
import { hourCountText, hourOptionLabel } from "@/lib/booking/copy";
import { hourCourtMarks, type HourPeriod } from "@/lib/booking/flow-view";
import { busyAttribute } from "@/lib/booking/plan-state";
import type { CourtId } from "@/lib/booking/types";
import { useRoving } from "./use-roving";

type Props = { periods: HourPeriod[]; selectedHour: Hour | null; selectedCourt: CourtId | null; onSelect: (hour: Hour) => void };

/**
 * Horarios por franja. Debajo de cada número, tres puntos: uno por cancha en el orden del plano, lleno si tiene lugar
 * (ver `hourCourtMarks`). Con la cancha elegida ocupada, su punto queda vacío; el horario sigue siendo elegible.
 * Tachado y «completo»: ninguna cancha (aria-disabled, pero enfocable y explica por qué al activarlo).
 * `data-busy` permite que el plano previsualice las canchas ocupadas al pasar o enfocar un horario (solo CSS).
 */
export function HourPicker({ periods, selectedHour, selectedCourt, onSelect }: Props) {
  const options = periods.flatMap((period) => period.options);
  const firstOpen = options.find((option) => option.tone !== "full")?.hour ?? null;
  // En grilla: desde 1280 px los horarios son dos filas de 7 y, por debajo, una fila por franja.
  const { itemProps, groupProps } = useRoving(options.map((option) => option.hour), selectedHour ?? firstOpen, { grid: true });

  if (options.length === 0) return <p className="ronda-booking-empty">Ya no quedan turnos este día. Elegí otro día.</p>;

  return <div className="ronda-booking-hours" role="group" aria-labelledby="ronda-when-title" {...groupProps}>
    {periods.map((period) => <div key={period.label} className="ronda-booking-hour-row">
      <span className="ronda-booking-period" aria-hidden="true">{period.label}</span>
      <div className="ronda-booking-hour-list">
        {period.options.map((option) => <button
          key={option.hour}
          type="button"
          className={`ronda-booking-hour is-${option.tone}`}
          data-busy={busyAttribute(option.busy)}
          aria-pressed={option.hour === selectedHour}
          aria-disabled={option.tone === "full" ? true : undefined}
          aria-label={hourOptionLabel(option, selectedCourt)}
          onClick={() => onSelect(option.hour)}
          {...itemProps(option.hour)}
        >
          <span className="ronda-booking-hour-number" aria-hidden="true">{String(option.hour).padStart(2, "0")}</span>
          {option.tone === "full"
            ? <span className="ronda-booking-hour-count" aria-hidden="true">{hourCountText(option)}</span>
            : <span className="ronda-booking-hour-marks" aria-hidden="true">
              {hourCourtMarks(option).map((mark) => <span key={mark.court} className={`ronda-booking-hour-mark${mark.free ? " is-free" : ""}`} />)}
            </span>}
        </button>)}
      </div>
    </div>)}
  </div>;
}
