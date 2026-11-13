import { HEIGHTS, courtMarkings } from "./booking/plan-projection.ts";

/**
 * Peloteo de la sección Comunidad. Funciones puras, en unidades del plano (1 m ≈ 1,11 unidades; x al este,
 * y al sur, z hacia arriba). Las reglas que cumple cada tiro están probadas en `rally.test.ts`:
 * pasa la red con margen, pica una sola vez dentro de la cancha de singles del lado contrario y llega a quien
 * recibe sin salir de la losa.
 */
export type Point = { x: number; y: number };
export type Ball = Point & { z: number };
/** Tramo entre el pique y el golpe siguiente. */
type AfterBounce = { time: number; distance: number; apex: number; height: number };
type Kind = { apex: readonly [number, number]; depth: readonly [number, number]; flight: number; after: AfterBounce };
export type Shot = {
  hitter: 0 | 1; // 0 juega del lado norte (al fondo), 1 del lado sur (adelante)
  from: Point; // punto de impacto
  fromHeight: number; // altura del impacto
  bounce: Point; // pique
  to: Point; // donde la espera quien recibe
  apex: number;
  flight: number; // segundos hasta el pique
  after: AfterBounce;
  start: number;
};

export const COURT = { x: 0, y: 0, width: 18, height: 36 };
export const MARKS = courtMarkings(COURT);
/** Margen mínimo sobre la red, en unidades. */
export const NET_CLEARANCE = 0.7;
/** Quien recibe nunca pisa el borde de la losa. */
const EDGE = 1;

const LOW: AfterBounce = { time: 0.42, distance: 4.5, apex: 0.5, height: 1 };
/**
 * Un globo rebota alto (unos 3 m): quien recibe retrocede detrás de la línea de fondo, espera a que baje y le
 * pega a la altura del hombro. Por eso pica más corto que un drive.
 */
const HIGH: AfterBounce = { time: 1.35, distance: 7, apex: 2.6, height: 1.6 };

export const KINDS = {
  drive: { apex: [2.2, 2.9], depth: [8, 11], flight: 1.05, after: LOW },
  lob: { apex: [6, 7.2], depth: [7, 9], flight: 1.9, after: HIGH },
  short: { apex: [1.9, 2.2], depth: [4.5, 6.5], flight: 0.95, after: LOW },
} as const satisfies Record<string, Kind>;
const WEIGHTS: readonly [keyof typeof KINDS, number][] = [["drive", 0.55], ["lob", 0.2], ["short", 0.25]];

const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

/** Lo que falta recorrer en un eje hasta el borde de la losa, medido sobre la dirección del tiro. */
function reach(position: number, direction: number, size: number): number {
  if (direction > 0) return (size - EDGE - position) / direction;
  if (direction < 0) return (EDGE - position) / direction;
  return Infinity;
}

export function makeShot(
  hitter: 0 | 1, from: Point, fromHeight: number, bounce: Point, apex: number, flight: number, after: AfterBounce, start: number,
): Shot {
  // La parábola siempre pasa la red con margen.
  const atNet = (MARKS.net - from.y) / (bounce.y - from.y);
  const clearance = (HEIGHTS.net + NET_CLEARANCE - fromHeight * (1 - atNet)) / (4 * atNet * (1 - atNet));
  // Después del pique la pelota sigue en la misma dirección, sin salir de la losa.
  const length = Math.hypot(bounce.x - from.x, bounce.y - from.y);
  const dx = (bounce.x - from.x) / length;
  const dy = (bounce.y - from.y) / length;
  const distance = Math.min(after.distance, reach(bounce.x, dx, COURT.width), reach(bounce.y, dy, COURT.height));
  const to = { x: bounce.x + dx * distance, y: bounce.y + dy * distance };
  return { hitter, from, fromHeight, bounce, to, apex: Math.max(apex, clearance), flight, after, start };
}

/** El tiro siguiente: le pega quien recibió, desde donde le llegó la pelota. */
export function randomShot(previous: Shot, start: number, random: () => number = Math.random): Shot {
  const hitter = previous.hitter === 0 ? 1 : 0;
  const between = ([min, max]: readonly [number, number]) => mix(min, max, random());
  let pick = random();
  const kind = KINDS[(WEIGHTS.find(([, weight]) => (pick -= weight) < 0) ?? WEIGHTS[0])[0]];
  const depth = between(kind.depth);
  const bounce = {
    x: between([MARKS.singles[0] + 1.2, MARKS.singles[1] - 1.2]),
    y: hitter === 0 ? MARKS.net + depth : MARKS.net - depth,
  };
  return makeShot(hitter, previous.to, previous.after.height, bounce, between(kind.apex), kind.flight, kind.after, start);
}

/** Segundos entre un golpe y el siguiente. */
export const duration = (shot: Shot): number => shot.flight + shot.after.time;

/** Posición de la pelota a `elapsed` segundos del golpe. */
export function ballAt(shot: Shot, elapsed: number): Ball {
  if (elapsed <= shot.flight) {
    const u = Math.max(0, elapsed / shot.flight);
    return { x: mix(shot.from.x, shot.bounce.x, u), y: mix(shot.from.y, shot.bounce.y, u), z: shot.fromHeight * (1 - u) + 4 * shot.apex * u * (1 - u) };
  }
  const v = Math.min(1, (elapsed - shot.flight) / shot.after.time);
  return { x: mix(shot.bounce.x, shot.to.x, v), y: mix(shot.bounce.y, shot.to.y, v), z: shot.after.height * v + 4 * shot.after.apex * v * (1 - v) };
}
