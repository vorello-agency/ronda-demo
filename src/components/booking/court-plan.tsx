"use client";

import type { MouseEvent, ReactNode } from "react";
import { courts } from "@/data/courts";
import { COURT_IDS } from "@/lib/booking/availability";
import type { Hour } from "@/lib/booking/club-time";
import { courtOptionLabel, courtStatusText } from "@/lib/booking/copy";
import type { CourtOption } from "@/lib/booking/flow-view";
import type { PlanAttributes } from "@/lib/booking/plan-state";
import type { CourtId } from "@/lib/booking/types";
import { courtTagStyle } from "./court-tag-style";
import { useRoving } from "./use-roving";

type Props = {
  art: ReactNode;
  options: CourtOption[];
  hour: Hour | null;
  attributes: PlanAttributes;
  onSelect: (court: CourtId) => void;
};

/**
 * El plano como selector. El dibujo llega renderizado del servidor y no se vuelve a dibujar: solo cambian los
 * atributos del contenedor. Las etiquetas son los controles accesibles; tocar la cancha en el dibujo es un
 * atajo para puntero que hace lo mismo.
 */
export function CourtPlan({ art, options, hour, attributes, onSelect }: Props) {
  const selected = options.find((option) => option.selected)?.id ?? null;
  const { itemProps, groupProps } = useRoving(options.map((option) => option.id), selected);

  function onMapClick(event: MouseEvent<HTMLDivElement>) {
    const court = (event.target as Element).closest("svg [data-court-id]")?.getAttribute("data-court-id");
    const id = COURT_IDS.find((item) => item === court);
    if (id) onSelect(id);
  }

  return <div className="ronda-plan" data-interactive="" {...attributes} onClick={onMapClick}>
    <div className="ronda-plan-figure">{art}</div>
    <div className="ronda-plan-tags" role="group" aria-labelledby="ronda-where-title" {...groupProps}>
      {options.map((option) => {
        const court = courts.find((item) => item.id === option.id)!;
        return <button
          key={option.id}
          type="button"
          className={`ronda-plan-tag${option.state === "taken" ? " is-taken" : ""}`}
          style={courtTagStyle(option.id)}
          data-court-tag={option.id}
          aria-pressed={option.selected}
          aria-label={courtOptionLabel(option, hour)}
          onClick={() => onSelect(option.id)}
          {...itemProps(option.id)}
        >
          <span className="ronda-plan-tag-number" aria-hidden="true">{court.id}</span>
          <span className="ronda-plan-tag-name" aria-hidden="true">{court.name}</span>
          <span className="ronda-plan-tag-status" aria-hidden="true"><TagStatus text={courtStatusText(option)} /></span>
        </button>;
      })}
    </div>
  </div>;
}

/** «Arcilla · 9 turnos»: en celular la cantidad pasa a su propio renglón en lugar de cortarse entre número y palabra. */
function TagStatus({ text }: { text: string }) {
  const [surface, count] = text.split(" · ");
  if (!count) return text;
  return <>{surface}<span className="ronda-plan-tag-sep"> · </span><span className="ronda-plan-tag-count">{count}</span></>;
}
