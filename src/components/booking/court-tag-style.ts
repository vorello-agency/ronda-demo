import type { CSSProperties } from "react";
import type { CourtId } from "@/data/club-plan";
import { courtTagAnchors } from "@/lib/booking/plan-projection";

const anchors = courtTagAnchors();

/**
 * Posición de la etiqueta de una cancha en ambas vistas, como variables CSS. La usan el esqueleto y los
 * botones de cancha del flujo: una sola capa de etiquetas sirve a los dos dibujos.
 */
export function courtTagStyle(id: CourtId): CSSProperties {
  const anchor = anchors.find((item) => item.id === id);
  if (!anchor) throw new Error(`Cancha sin posición en el plano: ${id}`);
  return { "--plan-x": `${anchor.planX}%`, "--iso-x": `${anchor.isoX}%`, "--iso-y": `${anchor.isoY}%` } as CSSProperties;
}
