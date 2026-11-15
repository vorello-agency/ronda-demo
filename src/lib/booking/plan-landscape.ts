import { clubPlan } from "../../data/club-plan.ts";
import { courts as courtContent } from "../../data/courts.ts";
import { demoUnit } from "./availability.ts";
import {
  ROOF_OVERHANG, TERRACE, TREE_LINE, courtDoor, exterior, planAccessGuide, planAccessNote, groundBounds, isoLead, isoTagPoint, mapNotes, modelBase,
  paintedLabels, project, unproject, viewBox, type PlanView, type Rect,
} from "./plan-projection.ts";
import type { CourtId } from "./types.ts";

/**
 * Paisaje del plano: pinos altos, árboles bajos, arbustos, setos, canteros, cercos y césped. Es una capa de dibujo que se calcula a
 * partir de la geometría (`club-plan.ts`) y no forma parte de ella: mover una cancha reacomoda todo.
 * Reglas que cumple en cada vista, y que las pruebas verifican:
 *   · nada sale del encuadre: lo que no entra se achica y, si ni así entra, no se planta;
 *   · no tapa canchas, etiquetas, rótulos ni la guía de la cancha elegida;
 *   · las posiciones salen de un hash fijo: el dibujo es el mismo en cada visita.
 * Cada vista tiene su propio plantado, porque lo que tapa un árbol depende de la proyección.
 */

/** Sombras: ángulo en el suelo (0° = este, 90° = sur) y largo por unidad de altura. Sol de la tarde, desde el noroeste. */
export const SUN = { angle: 38, length: 0.5 } as const;

/** En celular (planta por debajo de 768 px) solo se ven los elementos principales, agrandados por este factor. */
export const MOBILE_SCALE = 1.2;

type Shape = Record<PlanView, number>;
/**
 * Árbol bajo, de copa redonda, por unidad de tamaño: altura del centro de la copa (unidades del plano; en la
 * planta es menor, como la del pabellón) y radios de la copa (unidades de SVG). `reach` cubre la copa partida en dos.
 * Va entre las canchas y en el borde de Jardín, donde un árbol alto taparía las canchas en el isométrico.
 */
export const PINE = { crown: { plan: 2.1, iso: 2.6 } as Shape, rx: { plan: 13, iso: 13.5 } as Shape, ry: { plan: 11.5, iso: 11 } as Shape, reach: 1.1 } as const;
/**
 * Pino del bosque, como los de las fotos: copa ancha, achatada e irregular sobre un tronco oscuro. En el isométrico
 * forman un pinar en capas detrás del pabellón, de alrededor de una vez y media la altura de la cubierta, con copas
 * de más de la mitad del alto del árbol; en la planta son pocos y se dibujan bajos, contra el borde norte de la losa.
 * Solo van detrás del pabellón y en la arboleda del noreste.
 */
export const TALL_PINE = { crown: { plan: 3.9, iso: 6.9 } as Shape, rx: { plan: 38, iso: 35 } as Shape, ry: { plan: 24, iso: 14 } as Shape } as const;
/** Arbusto bajo por unidad de tamaño: altura del centro (unidades del plano) y radios (unidades de SVG). */
export const SHRUB = { lift: 0.5, rx: { plan: 10, iso: 11 } as Shape, ry: { plan: 8.5, iso: 8 } as Shape } as const;

export type Tier = "main" | "fill";
export type PineZone = "treeline" | "grove" | "east" | "garden" | "street";
export type Pine = {
  x: number; y: number; size: number; variant: "a" | "b" | "c"; tier: Tier; zone: PineZone;
  /** Árbol con flor, de copa redonda y más clara: los de Jardín. */
  blossom?: boolean;
  /** Inclinación del tronco, en grados, y si la copa va espejada: rompen el patrón en el pinar. */
  lean?: number; flip?: boolean;
  /** Pino alto (bosque) o árbol bajo (entre canchas). */
  kind: "tall" | "low";
  /** Queda detrás del pabellón: se dibuja antes. */
  back: boolean;
};
export type Shrub = { x: number; y: number; size: number; tier: Tier };
/** Seto, seto perimetral, vegetación tupida al pie de la terraza o cantero: su rectángulo en planta (`height` es el fondo, de norte a sur) y su alto (`tall`). */
export type Block = Rect & { tall: number; kind: "hedge" | "thicket" | "bed" | "perimeter" };
export type Fence = {
  id: CourtId; rect: Rect; height: number; posts: number;
  /** Puerta en el lado norte, el de la galería: de x a x. */
  gate: readonly [number, number];
  /** Lados cubiertos de enredadera y hasta qué altura: solo en Jardín. Al sur es baja, para no tapar el pie de la cancha. */
  vine?: { east: number; south: number };
};
/** Punto del dibujo en el espacio (flor, mata, hoja): se dibuja como un círculo. */
export type Bloom = readonly [x: number, y: number, z: number];
export type Landscape = {
  /** Césped; `vivid` marca el de Jardín, en un verde apenas más vivo. */
  lawns: (Rect & { vivid?: boolean })[];
  pines: Pine[];
  shrubs: Shrub[];
  blocks: Block[];
  /** Flores sobre las matas de los canteros de Jardín: casi todas blancas (`large`, `small`) y pocas hortensias azules (`deep`). */
  blooms: { large: Bloom[]; deep: Bloom[]; small: Bloom[] };
  /** Hojas de la enredadera sobre el cerco de Jardín. */
  fenceVine: { dark: Bloom[]; lit: Bloom[] };
  /** Matas sobre la vegetación tupida, para que no se lea como un seto recortado. */
  tufts: { dark: Bloom[]; lit: Bloom[] };
  fences: Fence[];
};

/** Rectángulo en coordenadas del dibujo (unidades de SVG). */
export type Zone = { x1: number; y1: number; x2: number; y2: number };
const hit = (a: Zone, b: Zone) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

/** Distancia del cerco al borde de la cancha: queda entre la superficie y el anillo de la cancha elegida. */
const FENCE_OFFSET = 0.5;

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
/** Valor fijo en [-1, 1) para una clave: la «semilla» de cada planta. */
const jitter = (key: string) => demoUnit(`ronda-paisaje|${key}`) * 2 - 1;
const rise = (view: PlanView) => -project(view, 0, 0, 1)[1];

/** Cancha por nombre: el paisaje no depende de la posición ni del número. */
const courtNamed = (name: string) => {
  const id = courtContent.find((court) => court.name === name)?.id;
  return clubPlan.courts.find((court) => court.id === id);
};
const pathNamed = (id: string) => clubPlan.paths.find((path) => path.id === id);
const east = (rect: Rect) => rect.x + rect.width;
const south = (rect: Rect) => rect.y + rect.height;

/**
 * Unidades de SVG por píxel en el tamaño más chico de cada vista, que es donde el texto ocupa más dibujo:
 * la planta a 320 px de ancho y el isométrico con la ventana a 1280 px (el dibujo mide ~696 px).
 */
const svgPerPx = (view: PlanView) => viewBox(view).width / (view === "plan" ? 320 : 696);

/**
 * Lo que el paisaje deja libre: en el isométrico, las etiquetas que cuelgan de cada cancha y el rótulo «Acceso»;
 * en la planta, la guía de la cancha elegida, «Acceso» y el norte. «Pabellón» va sobre la cubierta, donde no se planta.
 */
export function keepOut(view: PlanView): Zone[] {
  const box = viewBox(view);
  const k = svgPerPx(view);
  const notes = mapNotes(view);
  // «Pabellón» va centrado sobre la cubierta: las copas pueden montar el borde de la losa, no el rótulo.
  const roof = notes.filter((note) => note.tone === "roof").map((note) => {
    const x = box.x + (box.width * note.x) / 100, y = box.y + (box.height * note.y) / 100;
    return { x1: x - 40 * k, x2: x + 40 * k, y1: y - 8 * k, y2: y + 8 * k };
  });
  if (view === "iso") {
    return [
      // Rótulos pintados: lo que ocupa cada uno, tendido sobre el suelo o la cubierta. Van en diagonal, así que se
      // cubren por tramos cortos: un solo rectángulo abarcaría mucho más que el texto.
      ...paintedLabels().flatMap(({ x, y, z, size, length }) => {
        const cells: Zone[] = [];
        for (let from = x - length / 2 - 0.4; from < x + length / 2 + 0.4; from += 1.2) {
          const to = Math.min(from + 1.2, x + length / 2 + 0.4);
          const corners = [[from, y - size * 0.95], [to, y - size * 0.95], [to, y + 0.35], [from, y + 0.35]].map(([px, py]) => project("iso", px, py, z));
          cells.push({ x1: Math.min(...corners.map(([cx]) => cx)), x2: Math.max(...corners.map(([cx]) => cx)), y1: Math.min(...corners.map(([, cy]) => cy)), y2: Math.max(...corners.map(([, cy]) => cy)) });
        }
        return cells;
      }),
      // Cada etiqueta, en píxeles desde el final de su línea: el número (angosto) y, debajo, nombre y estado.
      ...clubPlan.courts.flatMap((court) => {
        const [x, y] = isoTagPoint(court);
        // La línea que la une con la cancha también queda libre: va en diagonal, así que se cubre por tramos cortos.
        const [from, to] = isoLead(court);
        const lead: Zone[] = [];
        for (let py = from[1]; py < to[1]; py += 1.5) {
          const a = project("iso", from[0], py), b = project("iso", from[0], Math.min(py + 1.5, to[1]));
          lead.push({ x1: a[0] - 3 * k, x2: b[0] + 3 * k, y1: a[1] - 3 * k, y2: b[1] + 3 * k });
        }
        return [
          ...lead,
          { x1: x - 30 * k, x2: x + 30 * k, y1: y - 2 * k, y2: y + 46 * k },
          { x1: x - 56 * k, x2: x + 56 * k, y1: y + 44 * k, y2: y + 100 * k },
        ];
      }),
    ];
  }
  const bottom = box.y + box.height;
  return [
    ...roof,
    ...clubPlan.courts.map((court) => {
      const [x, y] = project("plan", court.x + court.width / 2, south(court));
      return { x1: x - 4 * k, x2: x + 4 * k, y1: y, y2: bottom };
    }),
    // «Acceso», arriba a la izquierda: en celular arranca en el margen de la página, no en su coordenada. Y su guía al portón.
    (() => { const [ax, ay] = planAccessNote(); return { x1: box.x, x2: Math.max(ax, box.x + 24 * k) + 66 * k, y1: ay - 9 * k, y2: ay + 9 * k }; })(),
    (() => { const [from, to] = planAccessGuide(); return { x1: from[0] - 1.5 * k, x2: from[0] + 1.5 * k, y1: from[1], y2: to[1] }; })(),
  ];
}

/** Aire entre lo plantado y el borde del dibujo, en unidades de SVG: en celular ese borde es el de la pantalla. */
const FRAME_INSET = 7;
function inFrame(view: PlanView, zone: Zone, inset = FRAME_INSET): boolean {
  const box = viewBox(view);
  return zone.x1 >= box.x + inset && zone.y1 >= box.y + inset
    && zone.x2 <= box.x + box.width - inset && zone.y2 <= box.y + box.height - inset;
}

/** ¿Algún punto de una elipse del dibujo cae sobre una cancha? Se pregunta por el suelo que queda debajo. */
function overCourt(view: PlanView, cx: number, cy: number, rx: number, ry: number): boolean {
  for (let step = 0; step <= 16; step++) {
    const angle = (step / 16) * Math.PI * 2;
    const [x, y] = step === 16 ? unproject(view, cx, cy) : unproject(view, cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
    if (clubPlan.courts.some((court) => x > court.x && x < east(court) && y > court.y && y < south(court))) return true;
  }
  return false;
}

/** Tamaño con el que se ve un elemento: en la planta, los principales se agrandan en celular. */
export const shownScale = (view: PlanView, tier: Tier) => (view === "plan" && tier === "main" ? MOBILE_SCALE : 1);

/** Copa de un pino en el dibujo (centro y radios) y el rectángulo que ocupa el árbol entero. */
export function pineShape(view: PlanView, pine: Pick<Pine, "x" | "y" | "size" | "kind"> & { lean?: number }, scale = 1) {
  const size = pine.size * scale;
  const [bx, by] = project(view, pine.x, pine.y);
  const tall = pine.kind === "tall";
  const cy = by - (tall ? TALL_PINE : PINE).crown[view] * rise(view) * size;
  // La inclinación corre la copa hacia un costado: el rectángulo la cubre de los dos lados.
  const sway = "lean" in pine && pine.lean ? Math.abs(Math.tan((pine.lean * Math.PI) / 180)) * (by - cy) : 0;
  const rx = (tall ? TALL_PINE.rx[view] : PINE.rx[view] * PINE.reach) * size + sway;
  const ry = (tall ? TALL_PINE.ry[view] : PINE.ry[view]) * size;
  return { base: [bx, by] as const, cx: bx, cy, rx, ry, zone: { x1: bx - rx, x2: bx + rx, y1: cy - ry, y2: by + 1 } };
}

export function shrubShape(view: PlanView, shrub: Pick<Shrub, "x" | "y" | "size">, scale = 1) {
  const size = shrub.size * scale;
  const [bx, by] = project(view, shrub.x, shrub.y);
  const cy = by - SHRUB.lift * rise(view) * size;
  const rx = SHRUB.rx[view] * size;
  const ry = SHRUB.ry[view] * size;
  return { cx: bx, cy, rx, ry, zone: { x1: bx - rx, x2: bx + rx, y1: cy - ry, y2: cy + ry } };
}

/** Rectángulo del dibujo que ocupa un bloque (seto, cantero) con su altura. */
export function blockZone(view: PlanView, block: Rect & { tall: number }): Zone {
  const points = [0, block.tall].flatMap((z) => [
    project(view, block.x, block.y, z), project(view, east(block), block.y, z),
    project(view, east(block), south(block), z), project(view, block.x, south(block), z),
  ]);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { x1: Math.min(...xs), x2: Math.max(...xs), y1: Math.min(...ys), y2: Math.max(...ys) };
}

/** Claros del pinar del isométrico: posición a lo largo del frente (0 a 1) y medio ancho, en unidades del plano. */
export const FOREST_CLEARINGS = [[0.22, 3.3], [0.53, 3.9], [0.79, 3.1]] as const;

/** Tamaño mínimo con el que todavía se planta: por debajo, el árbol no se dibuja. */
export const MIN_SIZE = { tall: 0.6, low: 1.1 } as const;
/** Planta un pino con el mayor tamaño que entra en el encuadre sin tapar nada; si no entra ni chico, no va. */
function fitPine(view: PlanView, zones: Zone[], candidate: Omit<Pine, "back">): Pine | null {
  const { pavilion } = clubPlan;
  const scale = shownScale(view, candidate.tier);
  const step = candidate.kind === "tall" ? 0.05 : 0.1;
  for (let size = candidate.size; size >= MIN_SIZE[candidate.kind] - 1e-9; size -= step) {
    const shape = pineShape(view, { ...candidate, size }, scale);
    // Detrás del pabellón: al norte de la fachada y, en el isométrico, no al oeste del muro (eso queda adelante).
    const back = candidate.y < south(pavilion) && (view === "plan" || candidate.x > pavilion.x - ROOF_OVERHANG.sides);
    // De un pino alto que queda detrás de la losa solo cuenta la copa: el pabellón tapa el tronco.
    const hidden = back && candidate.kind === "tall" && candidate.x > pavilion.x - ROOF_OVERHANG.sides && candidate.x < east(pavilion) + ROOF_OVERHANG.sides;
    const seen = hidden ? { ...shape.zone, y2: shape.cy + shape.ry } : shape.zone;
    if (!inFrame(view, shape.zone) || zones.some((zone) => hit(zone, seen))) continue;
    if (overCourt(view, shape.cx, shape.cy, shape.rx, shape.ry)) continue;
    return { ...candidate, x: round(candidate.x), y: round(candidate.y), size: round(size), back };
  }
  return null;
}

function fitShrub(view: PlanView, zones: Zone[], candidate: Shrub): Shrub | null {
  const shape = shrubShape(view, candidate, shownScale(view, candidate.tier));
  if (!inFrame(view, shape.zone) || zones.some((zone) => hit(zone, shape.zone))) return null;
  if (overCourt(view, shape.cx, shape.cy, shape.rx, shape.ry)) return null;
  return { ...candidate, x: round(candidate.x), y: round(candidate.y), size: round(candidate.size) };
}

/** Un bloque partido en tramos de una unidad a lo largo de su lado mayor: así su rectángulo en el dibujo es ajustado. */
export function blockCells<T extends Rect>(block: T): T[] {
  const lengthwise = block.width >= block.height;
  const from = lengthwise ? block.x : block.y;
  const length = lengthwise ? block.width : block.height;
  const cells: T[] = [];
  for (let offset = 0; offset < length - 1e-9; offset += 1) {
    const size = Math.min(1, length - offset);
    cells.push(lengthwise ? { ...block, x: from + offset, width: size } : { ...block, y: from + offset, height: size });
  }
  return cells;
}

/** Se queda con los tramos de un bloque que entran en el encuadre y no pisan una zona libre. */
function clearSpans(view: PlanView, zones: Zone[], block: Block, minimum = 2, inset = FRAME_INSET): Block[] {
  const lengthwise = block.width >= block.height;
  const spans: Block[] = [];
  let run: Block[] = [];
  const close = () => {
    if (run.length > 0) {
      const first = run[0], last = run[run.length - 1];
      const span = lengthwise ? { ...block, x: first.x, width: east(last) - first.x } : { ...block, y: first.y, height: south(last) - first.y };
      if ((lengthwise ? span.width : span.height) >= minimum) spans.push(span);
    }
    run = [];
  };
  for (const cell of blockCells(block)) {
    const zone = blockZone(view, cell);
    if (zones.some((item) => hit(item, zone)) || !inFrame(view, zone, inset)) close();
    else run.push(cell);
  }
  close();
  return spans;
}

function build(view: PlanView): Landscape {
  const { courts, pavilion } = clubPlan;
  const ground = groundBounds(view);
  const groundEast = east(ground);
  const zones = keepOut(view);
  const first = courts[0];
  const last = courts[courts.length - 1];
  const gallery = pathNamed("galeria-norte");
  const entry = pathNamed("terraza-entrada");
  /** Borde interior del seto perimetral del oeste: desde ahí hacia el este es jardín. */
  const inside = exterior().hedge[1] + 0.1;
  /** El sur de las canchas es todo jardín: su fondo. */
  const southTop = south(last) + 2.6;
  const garden = courtNamed("Jardín");
  const terraceEast = east(pavilion) + TERRACE.sides;
  /** Pares de canchas vecinas con su separación: un jardín ancho lleva pinos; una separación corta, un seto. */
  const gaps = courts.slice(1).map((court, index) => ({ west: courts[index], east: court, gap: court.x - east(courts[index]) }));

  const pines: Pine[] = [];
  const shrubs: Shrub[] = [];
  const blocks: Block[] = [];
  /** Seto perimetral: va contra el borde del dibujo, con menos aire que el resto, y respeta las mismas zonas libres. */
  const perimeter: Block[] = [];
  const lawns: (Rect & { vivid?: boolean })[] = [];
  const plant = (candidate: Omit<Pine, "back" | "variant" | "kind"> & { kind?: Pine["kind"]; variant?: Pine["variant"] }, key: string) => {
    const pine = fitPine(view, zones, { kind: "low", variant: jitter(`${key}|forma`) > 0.1 ? "a" : "b", ...candidate });
    if (pine) pines.push(pine);
  };

  // 1 · Bosque detrás del pabellón. En el isométrico es un pinar: tres hileras salteadas de copas que se pisan, con
  // altura, separación e inclinación irregulares, y unos pocos claros donde se ve el cielo para que no sea una
  // pared continua. La planta no lleva este bosque.
  /** Un pino del pinar: forma, espejo e inclinación salen de su clave, para que no se repita un patrón. */
  const forestPine = (key: string, x: number, y: number, size: number, zone: PineZone) => plant({
    kind: "tall", tier: "main", zone, x, y, size,
    variant: (["a", "b", "c"] as const)[Math.floor(((jitter(`${key}|forma`) + 1) / 2) * 3) % 3],
    flip: jitter(`${key}|espejo`) > 0,
    lean: Math.abs(jitter(`${key}|inclina`)) > 0.55 ? Math.round(jitter(`${key}|grados`) * 7) : 0,
  }, key);
  if (view === "iso") {
    const from = pavilion.x - ROOF_OVERHANG.sides - 2.5, to = east(pavilion) + ROOF_OVERHANG.sides + 1;
    // Claros: tramos sin pinos en ninguna hilera, a distancias y con anchos desparejos.
    const clearings = FOREST_CLEARINGS.map(([at, half]) => [from + (to - from) * at, half] as const);
    const inClearing = (x: number) => clearings.some(([center, half]) => Math.abs(x - center) < half);
    // De atrás hacia adelante: los del fondo son más altos y asoman sobre los de adelante.
    [{ y: TREE_LINE.y - 0.9, size: 1.14, step: 5.6 }, { y: TREE_LINE.y, size: 1, step: 5.1 }, { y: TREE_LINE.y + 0.95, size: 0.86, step: 4.7 }].forEach((row, depth) => {
      for (let index = 0, x = from + depth * 1.7; x < to; index++) {
        const key = `pinar|${depth}|${index}`;
        const px = x + jitter(`${key}|x`) * 0.9;
        if (!inClearing(px)) forestPine(key, px, row.y + jitter(`${key}|y`) * 0.3, row.size * (1 + jitter(`${key}|s`) * 0.16), "treeline");
        // Separación irregular: entre el 70 % y el 130 % del paso de la hilera.
        x += row.step * (1 + jitter(`${key}|paso`) * 0.3);
      }
    });
  }
  lawns.push({ x: ground.x, y: ground.y + 0.4, width: ground.width, height: pavilion.y - TERRACE.north - 0.4 - (ground.y + 0.4) });

  // 2 · Jardín (la cancha, por nombre): arboleda al noreste, pinos en el borde exterior y canteros con hortensias.
  const beds: Block[] = [];
  if (garden) {
    const outside = east(garden);
    const northEdge = (gallery?.y ?? garden.y) - 0.6;
    lawns.push({ x: terraceEast + 0.6, y: pavilion.y - 1.5, width: groundEast - terraceEast - 0.6, height: northEdge - pavilion.y + 1.5 });
    // Arboleda del noreste: el pinar sigue junto al extremo del pabellón; cerca del borde los pinos entran más chicos.
    if (view === "iso") {
      [[2.2, 1.2, 1.05], [6.4, 0.4, 1], [10.4, 1.6, 0.9], [4.4, 4.4, 0.95], [8.6, 5, 0.9], [2.4, 7.6, 0.85], [6.6, 8.6, 0.82], [11, 8.2, 0.8]].forEach(([dx, dy, size], index) => {
        const key = `arboleda|iso|${index}`;
        forestPine(key, terraceEast + dx + jitter(`${key}|x`) * 0.6, pavilion.y + dy + jitter(`${key}|y`) * 0.5, size * (1 + jitter(`${key}|s`) * 0.1), "grove");
      });
    } else {
      // Planta: sin pinar detrás del pabellón, la arboleda llena el rincón libre al este de la cubierta. Todos son
      // principales, para que también se vean en celular.
      [[3.4, 0.4], [8.6, -0.4], [5.6, 4.6], [10.6, 4.2], [4.6, 8.6], [9.4, 8.4]].forEach(([dx, dy], index) => {
        const key = `arboleda|${index}`;
        plant({
          kind: "tall", tier: "main", zone: "grove",
          x: terraceEast + dx + jitter(`${key}|x`) * 0.5, y: pavilion.y + dy + jitter(`${key}|y`) * 0.4, size: 0.92 + jitter(`${key}|s`) * 0.06,
        }, key);
      });
    }
    // Jardín tiene su propio lenguaje: césped más vivo, canteros en tres lados y un par de árboles con flor.
    const top = (gallery ? south(gallery) : garden.y) + 0.6;
    const bedWest = outside + 2.1;
    lawns.push({ vivid: true, x: outside + 1.5, y: top, width: groundEast - outside - 1.5, height: southTop + 3.2 - top });
    // La esquina noreste, al final del piso de la galería.
    if (gallery) lawns.push({ vivid: true, x: east(gallery) + 0.2, y: gallery.y - 0.6, width: groundEast - east(gallery) - 0.2, height: top - gallery.y + 0.8 });
    lawns.push({ vivid: true, x: garden.x - 1.4, y: southTop, width: outside + 1.5 - garden.x + 1.4, height: 3.2 });
    // Este, sur y la esquina noreste que sobresale del pabellón. El del este no llega al seto perimetral.
    beds.push({ kind: "bed", tall: 0.3, x: bedWest, y: garden.y + 0.4, width: groundEast - 1.3 - bedWest, height: garden.height - 0.8 });
    beds.push({ kind: "bed", tall: 0.3, x: garden.x + 0.6, y: south(garden) + 2.1, width: garden.width - 1.2, height: 2.4 });
    if (gallery) beds.push({ kind: "bed", tall: 0.3, x: east(gallery) + 0.4, y: gallery.y - 0.2, width: groundEast - 1.3 - east(gallery) - 0.4, height: garden.y - gallery.y });
    // En lugar de la fila de árboles del borde: dos árboles con flor, uno en cada punta.
    [[groundEast - 3.3, (gallery?.y ?? garden.y) + 1.2, 1.75], [groundEast - 3.6, south(garden) + 1.4, 1.6]].forEach(([x, y, size], index) => {
      plant({ blossom: true, variant: index === 0 ? "b" : "a", x, y, size, tier: "main", zone: "east" }, `flor-arbol|${index}`);
    });
  }

  // 3 · Entre canchas: jardín ancho con pinos y arbustos, o seto bajo.
  gaps.forEach(({ west, east: next, gap }, pair) => {
    const edge = east(west);
    if (gap <= 8) {
      blocks.push({ kind: "hedge", tall: 0.9, x: edge + 1.7, y: west.y + 0.5, width: gap - 3.4, height: west.height - 1 });
      return;
    }
    lawns.push({ x: edge + 2.6, y: west.y, width: gap - 5.2, height: west.height });
    const middle = edge + gap / 2;
    for (let index = 0, y = west.y + 6; y <= south(west) - 3; index++, y += 6.6) {
      const key = `jardin|${pair}|${index}`;
      const side = index % 2 === 0 ? -1 : 1;
      // En el isométrico la copa se corre hacia el este: los pinos van pegados a la cancha del oeste y son más chicos.
      const pine = view === "iso"
        ? { x: edge + 4.5 + jitter(`${key}|x`) * 0.25, size: 1.75 + jitter(`${key}|s`) * 0.08 }
        : { x: middle + side * 1.1 + jitter(`${key}|x`) * 0.3, size: 1.85 + jitter(`${key}|s`) * 0.15 };
      plant({ ...pine, y: y + jitter(`${key}|y`) * 0.7, tier: index % 2 === 0 ? "main" : "fill", zone: "garden" }, key);
      const shrub = fitShrub(view, zones, {
        x: view === "iso" ? next.x - 4.4 + jitter(`${key}|ax`) * 0.5 : middle - side * 1.7,
        y: y + 3.3 + jitter(`${key}|ay`) * 0.5, size: 1 + jitter(`${key}|as`) * 0.15, tier: index % 2 === 0 ? "fill" : "main",
      });
      if (shrub && shrub.y < south(west) - 1.5) shrubs.push(shrub);
    }
  });

  // 4 · Oeste de la primera cancha: donde estaba el camino ahora hay jardín. Un seto bajo junto a la cancha,
  // césped hasta el seto perimetral y una hilera de arbustos bajos.
  {
    const hedge: Block = { kind: "hedge", tall: 0.9, x: round(first.x - 3), y: first.y + 0.5, width: 1.3, height: first.height - 1 };
    blocks.push(hedge);
    const top = (gallery ? south(gallery) : first.y) + 0.6;
    lawns.push({ x: inside, y: top, width: hedge.x - 0.1 - inside, height: southTop - top });
    for (let index = 0, y = first.y + 3; y < south(first); index++, y += 6.4) {
      const key = `oeste|${index}`;
      const shrub = fitShrub(view, zones, { x: (inside + hedge.x) / 2 + jitter(`${key}|x`) * 0.7, y: y + jitter(`${key}|y`) * 0.8, size: 1.05 + jitter(`${key}|s`) * 0.2, tier: index % 2 === 0 ? "main" : "fill" });
      if (shrub) shrubs.push(shrub);
    }
    // Alrededor de la terraza de entrada, césped sin plantas: el ingreso queda despejado.
    if (entry) {
      lawns.push({ x: inside, y: pavilion.y - TERRACE.north, width: pavilion.x - TERRACE.sides - 0.2 - inside, height: entry.y - 0.3 - (pavilion.y - TERRACE.north) });
      if (gallery) lawns.push({ x: inside, y: south(entry) + 0.3, width: gallery.x - 0.2 - inside, height: south(gallery) + 0.4 - south(entry) - 0.3 });
    }
  }

  // 5 · Vegetación tupida al pie de la terraza, contra el cerco de las canchas y abierta frente a cada puerta.
  const tufts = { dark: [] as Bloom[], lit: [] as Bloom[] };
  if (gallery) {
    // Se corta en la puerta de cada cancha, con un respiro a cada lado del piso que baja de la galería.
    const stops = [first.x - 1.5, ...courts.flatMap((court) => { const [from, to] = courtDoor(court); return [from - 0.35, to + 0.35]; }), east(last) + 1];
    for (let index = 0; index < stops.length; index += 2) {
      const thicket: Block = { kind: "thicket", tall: 1.1, x: round(stops[index]), y: south(gallery) + 0.1, width: round(stops[index + 1] - stops[index]), height: 1.25 };
      blocks.push(thicket);
      for (let step = 0, x = thicket.x + 0.55; x < east(thicket) - 0.3; step++, x += 0.95) {
        const key = `mata|${index}|${step}`;
        (step % 2 === 0 ? tufts.dark : tufts.lit).push([round(x + jitter(`${key}|x`) * 0.2), round(thicket.y + thicket.height * (0.5 + jitter(`${key}|y`) * 0.28)), round(thicket.tall + 0.1 + jitter(`${key}|z`) * 0.2)]);
      }
    }
  }

  // Cerco perimetral: un seto continuo, con el portón donde el paseo sur llega al borde oeste. En el isométrico
  // lo acompaña, afuera, una fila de árboles de calle: iguales y a distancia pareja, más formales que el pinar.
  {
    const { hedge, sidewalk, gate } = exterior();
    const tall = 1;
    if (view === "iso") {
      const base = modelBase();
      const north = base.y + 0.3, southEdge = south(base);
      perimeter.push({ kind: "perimeter", tall, x: hedge[0], y: north, width: hedge[1] - hedge[0], height: gate[0] - north });
      perimeter.push({ kind: "perimeter", tall, x: hedge[0], y: gate[1], width: hedge[1] - hedge[0], height: southEdge - 0.1 - gate[1] });
      perimeter.push({ kind: "perimeter", tall, x: groundEast - 0.9, y: (gallery ? south(gallery) : first.y) + 0.8, width: 0.8, height: southEdge - 0.9 - (gallery ? south(gallery) : first.y) - 0.8 });
      // Al sur, las etiquetas de cancha cuelgan sobre el borde: del seto queda el tramo que cierra la esquina sudeste.
      const southSide: Block = { kind: "perimeter", tall, x: hedge[1], y: southEdge - 0.9, width: groundEast - 0.1 - hedge[1], height: 0.8 };
      perimeter.push(...clearSpans(view, zones, southSide).filter((span) => east(span) > groundEast - 1.2));
      const x = (sidewalk[0] + sidewalk[1]) / 2;
      for (let index = 0, y = north + 4.5; y < southEdge - 2; index++, y += 8) {
        if (y > gate[0] - 3 && y < gate[1] + 3) continue;
        plant({ kind: "low", variant: "a", tier: "main", zone: "street", x, y, size: 1.3 }, `calle|${index}`);
      }
    } else {
      // Planta: solo el seto, en el margen que ya había al oeste del camino de acceso; no quita ancho.
      const west = Math.max(hedge[0], ground.x + 0.15), top = pavilion.y - TERRACE.north;
      perimeter.push({ kind: "perimeter", tall, x: west, y: top, width: hedge[1] + 0.2 - west, height: gate[0] - top });
      perimeter.push({ kind: "perimeter", tall, x: west, y: gate[1], width: hedge[1] + 0.2 - west, height: south(ground) - 0.3 - gate[1] });
    }
  }

  // 6 · Sur: sin paseo, es el fondo de las canchas. Césped de lado a lado y una sola hilera de arbustos bajos,
  // centrada en la franja; no llega al pie de las canchas ni a sus etiquetas.
  const southBand = { x: inside, y: southTop, width: groundEast - inside, height: south(ground) - 0.4 - southTop };
  lawns.push(southBand);
  [0.5].forEach((depth, row) => {
    // Arranca y termina separada de los setos perimetrales del oeste y del este.
    for (let index = 0, x = inside + 4 + row * 1.2; x < groundEast - 4.2; index++, x += 2.6) {
      const key = `sur|${row}|${index}`;
      const shrub = fitShrub(view, zones, {
        x: x + jitter(`${key}|x`) * 0.5, y: southBand.y + southBand.height * depth + jitter(`${key}|y`) * 0.6,
        size: 1.05 + jitter(`${key}|s`) * 0.22, tier: (index + row) % 2 === 0 ? "main" : "fill",
      });
      if (shrub) shrubs.push(shrub);
    }
  });

  // Los canteros se abren donde pasan una etiqueta o la guía de la cancha.
  const clearBeds = beds.flatMap((bed) => clearSpans(view, zones, bed));
  // Matas redondeadas de distintas alturas, repartidas sin formar fila; cada una con sus flores arriba.
  const blooms = { large: [] as Bloom[], deep: [] as Bloom[], small: [] as Bloom[] };
  clearBeds.forEach((bed, index) => {
    // Los canteros angostos (el del sur) llevan las matas más juntas y en zigzag; los anchos, con lugares vacíos.
    const narrow = Math.min(bed.width, bed.height) < 3;
    const cell = narrow ? 1.4 : 1.75;
    for (let row = 0, y = bed.y + 0.7; y < south(bed) - 0.4; row++, y += cell) {
      for (let column = 0, x = bed.x + 0.7 + (row % 2) * 0.6; x < east(bed) - 0.4; column++, x += cell) {
        const key = `mata|${index}|${row}|${column}`;
        // Uno de cada cinco lugares queda vacío, para que no se lea como hilera ni como tribuna.
        if (!narrow && jitter(`${key}|hueco`) > 0.6) continue;
        const size = round(0.7 + ((jitter(`${key}|s`) + 1) / 2) * 0.7);
        // Las matas chicas no se plantan: casi no se notaban y pesaban en el HTML (cada una va con su sombra).
        if (size < 1) continue;
        const mound = fitShrub(view, zones, {
          x: Math.min(east(bed) - 0.5, Math.max(bed.x + 0.5, x + jitter(`${key}|x`) * 0.6)),
          y: Math.min(south(bed) - 0.4, Math.max(bed.y + 0.4, y + (narrow ? (column % 2 === 0 ? 0.25 : 0.75) : 0) + jitter(`${key}|y`) * (narrow ? 0.2 : 0.6))),
          size, tier: "main",
        });
        if (!mound) continue;
        shrubs.push(mound);
        const blue = jitter(`${key}|azul`) > 0.62;
        const z = round(0.95 * mound.size);
        const flower = (dx: number, dy: number): Bloom => [round(mound.x + dx * mound.size), round(mound.y + dy * mound.size), z];
        (blue ? blooms.deep : blooms.large).push(flower(-0.25, -0.1), flower(0.3, 0.15));
        (blue ? blooms.deep : blooms.small).push(flower(0.05, -0.4));
      }
    }
  });

  // Enredadera sobre el cerco de Jardín, del lado este y del sur: hojas claras sobre el paño y un borde irregular arriba.
  const fenceVine = { dark: [] as Bloom[], lit: [] as Bloom[] };
  const vineHeights = { east: 2.6, south: 1 };
  if (garden) {
    const x2 = east(garden) + FENCE_OFFSET, y1 = garden.y - FENCE_OFFSET, y2 = south(garden) + FENCE_OFFSET, x1 = garden.x - FENCE_OFFSET;
    for (let step = 0, y = y1 + 0.5; y < y2; step++, y += 1.05) {
      const key = `cerco|e|${step}`;
      fenceVine.dark.push([x2, round(y + jitter(`${key}|y`) * 0.2), round(vineHeights.east - 0.05 + jitter(`${key}|z`) * 0.25)]);
      fenceVine.lit.push([x2, round(y + 0.5), round(0.5 + ((step * 7) % 3) * 0.65 + jitter(`${key}|l`) * 0.15)]);
    }
    for (let step = 0, x = x1 + 0.5; x < x2; step++, x += 1.05) {
      const key = `cerco|s|${step}`;
      fenceVine.dark.push([round(x + jitter(`${key}|x`) * 0.2), y2, round(vineHeights.south - 0.05 + jitter(`${key}|z`) * 0.2)]);
      if (step % 2 === 0) fenceVine.lit.push([round(x + 0.5), y2, 0.45]);
    }
  }

  const fences: Fence[] = courts.map((court) => {
    return {
      id: court.id, height: 2.6, posts: 4,
      rect: { x: court.x - FENCE_OFFSET, y: court.y - FENCE_OFFSET, width: court.width + FENCE_OFFSET * 2, height: court.height + FENCE_OFFSET * 2 },
      gate: courtDoor(court),
      ...(garden && court.id === garden.id ? { vine: vineHeights } : {}),
    };
  });

  const byDepth = <T extends { x: number; y: number }>(items: T[]) => [...items].sort((a, b) => project(view, a.x, a.y)[1] - project(view, b.x, b.y)[1]);
  return {
    lawns: lawns.map((lawn) => ({ ...clip(lawn, ground), vivid: lawn.vivid })).map(({ x, y, width, height, vivid }) => ({ x: round(x), y: round(y), width: round(width), height: round(height), ...(vivid ? { vivid } : {}) })),
    // Los árboles de calle son todos iguales: el que no entra con su tamaño, no va.
    pines: byDepth(pines.filter((pine) => pine.zone !== "street" || pine.size === 1.3)),
    shrubs: byDepth(shrubs),
    blocks: byDepth([...blocks.flatMap((block) => clearSpans(view, zones, block)), ...clearBeds, ...perimeter.flatMap((block) => clearSpans(view, zones, block, 1.5, 1))]).map((block) => ({ ...block, x: round(block.x), y: round(block.y), width: round(block.width), height: round(block.height) })),
    blooms,
    fenceVine,
    tufts,
    fences,
  };
}

function clip(rect: Rect, bounds: Rect): Rect {
  const x = Math.max(rect.x, bounds.x);
  const y = Math.max(rect.y, bounds.y);
  return { x, y, width: Math.min(east(rect), east(bounds)) - x, height: Math.min(south(rect), south(bounds)) - y };
}

const cache = new Map<PlanView, Landscape>();
/** Paisaje de una vista. Se calcula una vez: los dibujos son Server Components y no cambia entre renders. */
export function landscape(view: PlanView): Landscape {
  let value = cache.get(view);
  if (!value) cache.set(view, value = build(view));
  return value;
}

/** Sin caché, para comprobar que dos cálculos dan exactamente el mismo dibujo. */
export const buildLandscape = build;
