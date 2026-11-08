import { clubPlan } from "../../data/club-plan.ts";
import type { CourtId } from "./types.ts";

/**
 * Proyecciones del plano del club. Funciones puras: los dibujos (Server Components) y las etiquetas de cancha
 * leen de acá sus coordenadas, así ambas vistas salen de la misma geometría (`src/data/club-plan.ts`).
 *   «plan»  planta con volumen, por debajo de 1280 px: el norte arriba y la altura como un corrimiento al norte.
 *   «iso»   isométrico 2.5D, desde 1280 px: ejes a 30°; el vértice noroeste queda a la izquierda y el acceso,
 *           al sudoeste, en el vértice inferior.
 */
export type PlanView = "plan" | "iso";
export const PLAN_VIEWS = ["plan", "iso"] as const satisfies readonly PlanView[];

export type Vec2 = readonly [number, number];
export type Rect = { x: number; y: number; width: number; height: number };

/** Unidades de SVG por unidad del plano. */
const UNIT = 10;
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;
/** En planta, cada unidad de altura corre el dibujo 1,25 unidades al norte. */
const PLAN_RISE = 1.25;

/** Alturas del dibujo en unidades del plano. Son de representación, no constructivas. */
export const HEIGHTS = {
  pavilion: { plan: 4, iso: 5.6 },
  slab: 0.55,
  gallery: 3,
  net: 1,
  lightPole: 8,
} as const;

/** Vuelo de la losa de cubierta sobre la galería (sur) y sobre los otros tres lados. */
export const ROOF_OVERHANG = { south: 1.4, sides: 1 } as const;

/** Lo que el encuadre debe mostrar siempre: caminos, cubierta y columnas de luz, más un margen por vista. */
const FRAME = { west: 5, east: 92, north: 4, south: clubPlan.site.height } as const;
const FRAME_PAD: Record<PlanView, number> = { plan: 12, iso: 16 };

export const pavilionHeight = (view: PlanView): number => HEIGHTS.pavilion[view];
export const roofHeight = (view: PlanView): number => pavilionHeight(view) + HEIGHTS.slab;

/** Punto del plano (x hacia el este, y hacia el sur, z hacia arriba) en coordenadas de SVG. */
export function project(view: PlanView, x: number, y: number, z = 0): Vec2 {
  return view === "iso"
    ? [(x + y) * COS30 * UNIT, ((y - x) * SIN30 - z) * UNIT]
    : [x * UNIT, (y - z * PLAN_RISE) * UNIT];
}

/** Transformación del suelo (z = 0): permite dibujar rectángulos del plano tal cual. */
export function groundTransform(view: PlanView): string {
  const values = view === "iso" ? [COS30 * UNIT, -SIN30 * UNIT, COS30 * UNIT, SIN30 * UNIT, 0, 0] : [UNIT, 0, 0, UNIT, 0, 0];
  return `matrix(${values.map((value) => round(value, 4)).join(" ")})`;
}

export type ViewBox = { x: number; y: number; width: number; height: number };

const viewBoxes = new Map<PlanView, ViewBox>();
export function viewBox(view: PlanView): ViewBox {
  const cached = viewBoxes.get(view);
  if (cached) return cached;
  const { pavilion } = clubPlan;
  const roof = roofHeight(view);
  const corners = [
    project(view, FRAME.west, FRAME.north), project(view, FRAME.east, FRAME.north),
    project(view, FRAME.east, FRAME.south), project(view, FRAME.west, FRAME.south),
    project(view, pavilion.x - ROOF_OVERHANG.sides, pavilion.y - ROOF_OVERHANG.sides, roof),
    project(view, pavilion.x + pavilion.width + ROOF_OVERHANG.sides, pavilion.y - ROOF_OVERHANG.sides, roof),
    ...lightPoles().map(([x, y]) => project(view, x, y, HEIGHTS.lightPole)),
  ];
  const pad = FRAME_PAD[view];
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  const x = round(Math.min(...xs) - pad);
  const y = round(Math.min(...ys) - pad);
  const box = { x, y, width: round(Math.max(...xs) + pad - x), height: round(Math.max(...ys) + pad - y) };
  viewBoxes.set(view, box);
  return box;
}

export const viewBoxAttribute = (view: PlanView): string => {
  const { x, y, width, height } = viewBox(view);
  return `${x} ${y} ${width} ${height}`;
};

/** Posición de un punto proyectado como porcentaje del dibujo (para ubicar texto HTML encima). */
export function toPercent(view: PlanView, point: Vec2): Vec2 {
  const box = viewBox(view);
  return [round(((point[0] - box.x) / box.width) * 100, 2), round(((point[1] - box.y) / box.height) * 100, 2)];
}

/** Lista de puntos para `<polygon>` o `<polyline>`. */
export const points = (view: PlanView, corners: readonly (readonly [number, number, number?])[]): string =>
  corners.map(([x, y, z = 0]) => project(view, x, y, z).map((value) => round(value)).join(",")).join(" ");

/**
 * Marcas reglamentarias de una cancha (dobles 23,77 × 10,97 m), centradas en su rectángulo con el perímetro de juego.
 * Escala del dibujo: 26,4 unidades para los 23,77 m de largo.
 */
const METRE = 26.4 / 23.77;
export function courtMarkings(court: Rect) {
  const width = round(10.97 * METRE);
  const length = round(23.77 * METRE);
  const inner = { x: round(court.x + (court.width - width) / 2), y: round(court.y + (court.height - length) / 2), width, height: length };
  const singlesInset = round(((10.97 - 8.23) / 2) * METRE, 2);
  const serviceFromNet = round(6.4 * METRE, 2);
  const net = court.y + court.height / 2;
  const center = court.x + court.width / 2;
  return {
    inner,
    singles: [round(inner.x + singlesInset, 2), round(inner.x + inner.width - singlesInset, 2)] as const,
    service: [round(net - serviceFromNet, 2), round(net + serviceFromNet, 2)] as const,
    net,
    center,
    /** Las marcas centrales se exageran (0,5 unidades) para que se lean a escala de pantalla. */
    centerMark: 0.5,
  };
}

/** Columnas de luz: a ambos lados de cada cancha, en los extremos norte y sur. */
export function lightPoles(): Vec2[] {
  const courts = clubPlan.courts;
  const first = courts[0];
  const last = courts[courts.length - 1];
  const xs = [
    first.x - 1.5,
    ...courts.slice(1).map((court, index) => (courts[index].x + courts[index].width + court.x) / 2),
    last.x + last.width + 1.5,
  ];
  const ys = [first.y + 1, first.y + first.height - 1];
  return xs.flatMap((x) => ys.map((y) => [x, y] as const));
}

export type CourtTagAnchor = {
  id: CourtId;
  /** Planta: centro de la cancha, en % del ancho del dibujo. La etiqueta va en una fila debajo. */
  planX: number;
  /** Isométrico: pie de la cancha, en % del dibujo. La etiqueta cuelga de ese punto. */
  isoX: number;
  isoY: number;
};

/** Distancia entre la línea de fondo sur de la cancha y el inicio de su etiqueta en el isométrico. */
const ISO_TAG_GAP = 1.2;

export function courtTagAnchors(): CourtTagAnchor[] {
  return clubPlan.courts.map((court) => {
    const center = court.x + court.width / 2;
    const [planX] = toPercent("plan", project("plan", center, court.y + court.height / 2));
    const [isoX, isoY] = toPercent("iso", project("iso", center, court.y + court.height + ISO_TAG_GAP));
    return { id: court.id, planX, isoX, isoY };
  });
}

export type MapNote = { label: string; x: number; y: number; placement: "center" | "start" | "end"; tone: "roof" | "ground" };

/** Rótulos del plano: el pabellón sobre la cubierta y el acceso junto al camino oeste. */
export function mapNotes(view: PlanView): MapNote[] {
  const { pavilion, entrance } = clubPlan;
  const roof = roofHeight(view);
  if (view === "iso") {
    const [px, py] = toPercent(view, project(view, pavilion.x + pavilion.width * 0.26, pavilion.y + pavilion.height * 0.4, roof));
    const [ax, ay] = toPercent(view, project(view, entrance.x - 4.5, entrance.y - 10));
    return [
      { label: "Pabellón", x: px, y: py, placement: "center", tone: "roof" },
      { label: "Acceso", x: ax, y: ay, placement: "end", tone: "ground" },
    ];
  }
  const [px, py] = toPercent(view, project(view, pavilion.x + pavilion.width / 2, pavilion.y + pavilion.height * 0.35, roof));
  const [ax, ay] = toPercent(view, project(view, entrance.x - 2, entrance.y + 5.6));
  return [
    { label: "Pabellón", x: px, y: py, placement: "center", tone: "roof" },
    { label: "Acceso", x: ax, y: ay, placement: "start", tone: "ground" },
  ];
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
