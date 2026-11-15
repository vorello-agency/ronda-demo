import type { Court } from "./courts";

export type CourtId = Court["id"];

type Rect = { x: number; y: number; width: number; height: number };

export type ClubPlan = {
  site: { width: number; height: number };
  pavilion: Rect & { levels: number };
  courts: readonly (Rect & { id: CourtId })[];
  paths: readonly (Rect & { id: string })[];
  /** Límite del terreno del club al oeste y al este: de ahí salen el encuadre y el exterior, no de los caminos. */
  boundary: { west: number; east: number };
  /** Portón: donde el umbral cruza el límite oeste, junto al extremo del pabellón. */
  entrance: { x: number; y: number };
  /** Salida del pabellón a la galería: ahí empieza el recorrido hacia las canchas. */
  pavilionExit: { x: number; y: number };
};

/**
 * Geometría del club en unidades relativas (no son metros ni medidas constructivas).
 * Planta: x crece hacia el este, y hacia el sur; el norte queda arriba.
 * Copia tipada de docs/exploracion/refinamiento-b/geometria-club.json; una prueba detecta desvíos.
 * Nombre, superficie y fotografías de cada cancha siguen en `courts.ts`, la fuente única de contenido.
 * De oeste a este: 01, un jardín ancho (12), 02, un seto (6) y 03, que sobresale 6 del pabellón hacia el este.
 * Recorrido único: calle → portón → terraza de entrada → pabellón → galería → puerta de cada cancha. No hay otros
 * caminos: el oeste y el sur de las canchas son jardín.
 */
export const clubPlan = {
  site: { width: 110, height: 80 },
  pavilion: { x: 12, y: 7, width: 72, height: 10, levels: 1 },
  courts: [
    { id: "01", x: 12, y: 24, width: 20, height: 42 },
    { id: "02", x: 44, y: 24, width: 20, height: 42 },
    { id: "03", x: 70, y: 24, width: 20, height: 42 },
  ],
  paths: [
    { id: "galeria-norte", x: 8, y: 18, width: 86, height: 4 },
    { id: "terraza-entrada", x: 5, y: 11.5, width: 5, height: 6 },
  ],
  boundary: { west: 5, east: 98 },
  entrance: { x: 5, y: 14.5 },
  pavilionExit: { x: 16.68, y: 17 },
} as const satisfies ClubPlan;
