"use client";

import { useEffect, useRef } from "react";
import { weekday, type IsoDate } from "@/lib/booking/club-time";
import { MONTHS, WEEKDAYS_SHORT } from "@/lib/booking/copy";
import { monthsLabel, type DayOption } from "@/lib/booking/flow-view";
import { useRoving } from "./use-roving";

const dayNumber = (date: IsoDate) => date.slice(8, 10);
const monthName = (date: IsoDate) => MONTHS[Number(date.slice(5, 7)) - 1];

/** Cinta de los 14 días reservables. Un día sin turnos (hoy, tarde) queda visible pero no se elige. */
export function DayRibbon({ days, selected, onSelect }: { days: DayOption[]; selected: IsoDate; onSelect: (date: IsoDate) => void }) {
  const list = useRef<HTMLDivElement>(null);
  // Desde 1280 px la cinta es un calendario de dos semanas: las flechas verticales saltan de semana.
  const { itemProps, groupProps } = useRoving(days.map((day) => day.date), selected, { grid: true });

  // Al montar, la cinta se corre hasta el día elegido (por ejemplo, desde un enlace con fecha) sin mover la página.
  useEffect(() => {
    const element = list.current;
    const current = element?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (element && current) element.scrollLeft = Math.max(0, current.offsetLeft - element.offsetLeft - parseFloat(getComputedStyle(element).paddingLeft));
  }, []);

  return <section className="ronda-booking-days" aria-labelledby="ronda-days-title">
    <div className="ronda-booking-month">
      {/* «Elegir día» es un título como «Elegir hora» y «Elegir cancha», con el mes a la derecha. */}
      <h2 className="eyebrow" id="ronda-days-title">
        <span className="ronda-booking-days-question">Elegir día</span>
        <span className="ronda-booking-days-month">{monthsLabel(days.map((day) => day.date))}</span>
      </h2>
    </div>
    <div ref={list} className="ronda-booking-day-list" role="group" aria-labelledby="ronda-days-title" {...groupProps}>
      {days.map((day) => <button
        key={day.date}
        type="button"
        className={`ronda-booking-day${day.isWeekend ? " is-weekend" : ""}`}
        aria-pressed={day.date === selected}
        aria-disabled={day.bookable ? undefined : true}
        aria-describedby={day.bookable ? undefined : "ronda-day-closed"}
        onClick={() => { if (day.bookable) onSelect(day.date); }}
        {...itemProps(day.date)}
      >
        <span className="ronda-booking-day-weekday">{day.isToday ? "Hoy" : WEEKDAYS_SHORT[weekday(day.date)]}</span>{" "}
        <span className="ronda-booking-day-number">{dayNumber(day.date)}</span>
        <span className="sr-only"> de {monthName(day.date)}</span>
      </button>)}
    </div>
    <span id="ronda-day-closed" hidden>Ya no quedan turnos este día.</span>
  </section>;
}
