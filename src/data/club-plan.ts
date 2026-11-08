import type { Court } from "./courts";

export type CourtId = Court["id"];

type Rect = { x: number; y: number; width: number; height: number };

export type ClubPlan = {
  site: { width: number; height: number };
  pavilion: Rect & { levels: number };
  courts: readonly (Rect & { id: CourtId })[];
  paths: readonly (Rect & { id: string })[];
  entrance: { x: number; y: number };
};

/**
 * Geometría del club en unidades relativas (no son metros ni medidas constructivas).
 * Planta: x crece hacia el este, y hacia el sur; el norte queda arriba.
 * Copia tipada de docs/exploracion/refinamiento-b/geometria-club.json; una prueba detecta desvíos.
 * Nombre, superficie y fotografías de cada cancha siguen en `courts.ts`, la fuente única de contenido.
 */
export const clubPlan = {
  site: { width: 100, height: 80 },
  pavilion: { x: 12, y: 7, width: 72, height: 10, levels: 1 },
  courts: [
    { id: "01", x: 12, y: 24, width: 20, height: 42 },
    { id: "02", x: 38, y: 24, width: 20, height: 42 },
    { id: "03", x: 64, y: 24, width: 20, height: 42 },
  ],
  paths: [
    { id: "galeria-norte", x: 8, y: 18, width: 80, height: 4 },
    { id: "acceso-oeste", x: 5, y: 18, width: 4, height: 57 },
    { id: "paseo-sur", x: 5, y: 70, width: 83, height: 4 },
  ],
  entrance: { x: 7, y: 74 },
} as const satisfies ClubPlan;
