import { courts } from "@/data/courts";
import { HORIZON_DAYS } from "@/lib/booking/club-time";
import { HOUR_PERIODS, SLOT_LENGTH_TEXT } from "@/lib/booking/copy";
import type { ReactNode } from "react";
import { courtTagStyle } from "./court-tag-style";

/**
 * Estructura del flujo sin datos que dependan de la hora: la cinta de días, los horarios y el resumen se
 * resuelven en el cliente (E2). Reserva las mismas dimensiones que el flujo para que no haya saltos al
 * montar el flujo. El plano (que llega como `art`, renderizado en el servidor) y las etiquetas sí son definitivos.
 */
export function BookingSkeleton({ art }: { art: ReactNode }) {
  return <div className="ronda-booking-flow" aria-busy="true">
    <p className="sr-only">Cargando la disponibilidad simulada.</p>
    <noscript>
      <p className="ronda-booking-noscript">Esta demostración necesita JavaScript para mostrar la disponibilidad y elegir un turno.</p>
    </noscript>

    <div className="ronda-booking-days" aria-hidden="true">
      <div className="ronda-booking-month"><span className="ronda-booking-placeholder is-month" /></div>
      <div className="ronda-booking-day-list">
        {Array.from({ length: HORIZON_DAYS }, (_, index) => <span key={index} className="ronda-booking-day is-placeholder">
          <span className="ronda-booking-placeholder is-weekday" />
          <span className="ronda-booking-placeholder is-day" />
        </span>)}
      </div>
    </div>

    <p className="ronda-booking-lead">Elegí cancha u horario, en el orden que prefieras.</p>

    <div className="ronda-booking-stage">
      <section className="ronda-booking-where" aria-labelledby="ronda-where-title">
        <div className="ronda-booking-panel-head">
          <h2 className="ronda-booking-question" id="ronda-where-title">¿Dónde?</h2>
          <span className="ronda-booking-placeholder is-meta" aria-hidden="true" />
        </div>
        <div className="ronda-plan">
          <div className="ronda-plan-figure">{art}</div>
          <div className="ronda-plan-tags" aria-hidden="true">
            {courts.map((court) => <span key={court.id} className="ronda-plan-tag" style={courtTagStyle(court.id)}>
              <span className="ronda-plan-tag-number">{court.id}</span>
              <span className="ronda-plan-tag-name">{court.name}</span>
              <span className="ronda-plan-tag-status">{court.surface}</span>
            </span>)}
          </div>
        </div>
      </section>

      <div className="ronda-booking-side">
        <section aria-labelledby="ronda-when-title">
          <div className="ronda-booking-panel-head">
            <h2 className="ronda-booking-question" id="ronda-when-title">¿A qué hora?</h2>
            <p className="ronda-booking-meta">{SLOT_LENGTH_TEXT}</p>
          </div>
          <div className="ronda-booking-hours" aria-hidden="true">
            {HOUR_PERIODS.map((period) => <div key={period.label} className="ronda-booking-hour-row">
              <span className="ronda-booking-period">{period.label}</span>
              <div className="ronda-booking-hour-list">
                {period.hours.map((hour) => <span key={hour} className="ronda-booking-hour is-placeholder">
                  <span className="ronda-booking-placeholder is-hour" />
                  <span className="ronda-booking-placeholder is-count" />
                </span>)}
              </div>
            </div>)}
          </div>
        </section>

        <section className="ronda-booking-ticket" aria-labelledby="ronda-ticket-title">
          <h2 className="eyebrow" id="ronda-ticket-title">Tu turno</h2>
          <div className="ronda-booking-summary" aria-hidden="true">
            {["Cancha", "Día", "Hora"].map((label) => <span key={label} className="ronda-booking-summary-item">
              <span className="ronda-booking-summary-label">{label}</span>
              <span className="ronda-booking-placeholder is-value" />
            </span>)}
          </div>
          <p className="ronda-booking-summary-caption" aria-hidden="true"><span className="ronda-booking-placeholder is-caption" /></p>
          <p className="ronda-booking-fine">Simulación: no se reserva la cancha ni se cobra nada.</p>
        </section>
      </div>
    </div>
  </div>;
}
