import { hourAvailability } from "./availability.ts";
import type { Context, CourtId, Selection } from "./types.ts";

/**
 * Contrato entre el estado del cliente y los dibujos del plano, que se renderizan en el servidor.
 * El cliente no vuelve a dibujar el SVG: solo escribe estos atributos en el contenedor del mapa y el CSS reacciona.
 *   [data-court="02"]       cancha elegida → anillo, borde y velo sobre las demás
 *   [data-busy~="01"]       canchas sin lugar a la hora elegida → rayado
 * Los botones de horario llevan el mismo `data-busy` para previsualizar en el mapa con :hover / :focus-visible.
 */
export type PlanAttributes = { "data-court"?: CourtId; "data-busy"?: string };

/** Lista de canchas separada por espacios, o `undefined` para omitir el atributo. */
export const busyAttribute = (busy: readonly CourtId[]): string | undefined => (busy.length > 0 ? busy.join(" ") : undefined);

export function planStateAttributes(selection: Selection, ctx: Context): PlanAttributes {
  const attributes: PlanAttributes = {};
  if (selection.court !== null) attributes["data-court"] = selection.court;
  if (selection.hour !== null) {
    const busy = busyAttribute(hourAvailability(selection.date, selection.hour, ctx).busy);
    if (busy !== undefined) attributes["data-busy"] = busy;
  }
  return attributes;
}
