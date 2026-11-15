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
  /** Terraza apenas elevada sobre la que se apoyan el pabellón y la galería. */
  terrace: { plan: 0.4, iso: 0.5 },
  /** Volumen vidriado, de la terraza a la losa: bajo, para que la losa sea lo dominante. */
  pavilion: { plan: 3, iso: 4 },
  /** Canto de la losa de cubierta. */
  slab: { plan: 0.8, iso: 1 },
  net: 1,
} as const;

/**
 * Vuelo de la losa de cubierta sobre el rectángulo del pabellón: maciza y continua sobre la galería (sur). Es más
 * corto que la altura del volumen para que, desde arriba, se vea la fachada en sombra bajo el borde de la losa.
 */
export const ROOF_OVERHANG = { south: 1.8, sides: 1 } as const;
/** Retiro del volumen vidriado en los costados, respecto del rectángulo del pabellón: la losa vuela más. */
export const BODY_INSET = 1.2;
/** Terraza: cuánto sobresale del pabellón a los costados y al norte, y su muro bajo del lado de las canchas. */
export const TERRACE = { sides: 2, north: 0.6, parapet: 0.45, wall: 0.35 } as const;

/**
 * Pinar detrás del pabellón, solo en el isométrico: a qué distancia al norte están los pinos y hasta dónde llegan sus
 * copas (alrededor de una vez y media la cubierta). El encuadre les reserva ese cielo; el paisaje (`plan-landscape.ts`)
 * se acomoda adentro. La planta no lleva pinos detrás del pabellón: en celular empujaban las canchas hacia abajo.
 */
export const TREE_LINE = { y: 4.2, top: { iso: 10.4 } } as const;
/** Alto que ocupa el rótulo «Acceso» de la planta sobre su punto de arranque, en unidades de SVG. */
const PLAN_NOTE_HEIGHT = 30;

/**
 * Lo que el encuadre debe mostrar siempre: el terreno y la cubierta, más un margen por vista.
 * Sale del límite del terreno (`boundary`), no de los caminos: sacar o mover un camino no cambia el tamaño del dibujo.
 */
const FRAME = {
  west: clubPlan.boundary.west,
  east: clubPlan.boundary.east,
  north: 4,
  south: clubPlan.site.height,
} as const;
const FRAME_PAD: Record<PlanView, number> = { plan: 12, iso: 16 };
/** Margen entre la base de la maqueta y el borde del dibujo. */
const BASE_PAD = 6;
/**
 * Suelo que se dibuja en cada vista: el encuadre más el margen que entra en el viewBox. Nada del plano va más
 * allá, porque el SVG no recorta lo que sobra. En la planta el suelo llega hasta el borde superior del dibujo.
 */
export function groundBounds(view: PlanView): Rect {
  const margin = view === "plan" ? FRAME_PAD.plan / UNIT : round(FRAME_PAD.iso / (2 * COS30 * UNIT), 1);
  const x = round(FRAME.west - margin, 2);
  const y = view === "plan" ? round(viewBox("plan").y / UNIT, 2) : round(FRAME.north - margin, 2);
  return { x, y, width: round(FRAME.east + margin - x, 2), height: FRAME.south - y };
}

export const terraceHeight = (view: PlanView): number => HEIGHTS.terrace[view];
export const pavilionHeight = (view: PlanView): number => HEIGHTS.pavilion[view];
/** Altura de la cara superior de la losa: terraza, volumen y canto. */
export const roofHeight = (view: PlanView): number => terraceHeight(view) + pavilionHeight(view) + HEIGHTS.slab[view];

/** Punto del plano (x hacia el este, y hacia el sur, z hacia arriba) en coordenadas de SVG. */
export function project(view: PlanView, x: number, y: number, z = 0): Vec2 {
  return view === "iso"
    ? [(x + y) * COS30 * UNIT, ((y - x) * SIN30 - z) * UNIT]
    : [x * UNIT, (y - z * PLAN_RISE) * UNIT];
}

/** Punto del suelo (z = 0) que se ve en una coordenada de SVG: la inversa de `project`. */
export function unproject(view: PlanView, sx: number, sy: number): Vec2 {
  if (view === "plan") return [sx / UNIT, sy / UNIT];
  const sum = sx / (COS30 * UNIT);
  const difference = sy / (SIN30 * UNIT);
  return [(sum - difference) / 2, (sum + difference) / 2];
}

/** Transformación del suelo (z = 0): permite dibujar rectángulos del plano tal cual. */
export function groundTransform(view: PlanView): string {
  const values = view === "iso" ? [COS30 * UNIT, -SIN30 * UNIT, COS30 * UNIT, SIN30 * UNIT, 0, 0] : [UNIT, 0, 0, UNIT, 0, 0];
  return `matrix(${values.map((value) => round(value, 4)).join(" ")})`;
}

/**
 * Exterior del club, al oeste del terreno y solo en el isométrico: seto perimetral, vereda, cordón, la calle entera
 * en profundidad, el cordón de enfrente y una franja de la vereda de enfrente (`far`). Todo va sobre la base de la
 * maqueta, que lo corta en sus bordes. Medidas en unidades del plano.
 */
export const EXTERIOR = { gap: 0.4, hedge: 1, sidewalk: 2.4, kerb: 0.25, street: 5, far: 1.1, apron: 3.15, base: 1.2 } as const;

/** Ancho del portón y del umbral que lo cruza. */
export const GATE_WIDTH = 3.4;

/**
 * Puerta de una cancha, del lado de la galería: de x a x. Es la única referencia para la abertura del cerco, el
 * corte de la vegetación, la abertura del muro de la terraza y el tramo de piso que baja de la galería.
 */
export const DOOR_WIDTH = 3.2;
export const courtDoor = (court: Rect): readonly [number, number] => {
  const center = court.x + court.width / 2;
  return [round(center - DOOR_WIDTH / 2, 2), round(center + DOOR_WIDTH / 2, 2)];
};

/**
 * Recorrido a una cancha: sale del pabellón a la galería, sigue la galería y baja por la puerta de la cancha.
 * Es el trazado que dibuja «Cómo llegar» y el mismo que arman, en el plano, la galería y las puertas.
 */
export function courtRoute(court: Rect): Vec2[] {
  const gallery = clubPlan.paths.find((path) => path.id === "galeria-norte");
  const walk = gallery ? gallery.y + gallery.height / 2 : clubPlan.pavilionExit.y + 3;
  const door = court.x + court.width / 2;
  const { x, y } = clubPlan.pavilionExit;
  return [[x, y], [x, walk], [door, walk], [door, court.y]];
}

/** Franjas del exterior, de este a oeste (cada una, de x a x), y el portón: el tramo del seto que se abre en la entrada. */
export function exterior() {
  const edge = clubPlan.boundary.west;
  const hedge = [round(edge - EXTERIOR.gap - EXTERIOR.hedge, 2), round(edge - EXTERIOR.gap, 2)] as const;
  const sidewalk = [round(hedge[0] - EXTERIOR.sidewalk, 2), hedge[0]] as const;
  const kerb = [round(sidewalk[0] - EXTERIOR.kerb, 2), sidewalk[0]] as const;
  const street = [round(kerb[0] - EXTERIOR.street, 2), kerb[0]] as const;
  // El portón está centrado en `entrance`, junto al extremo oeste del pabellón.
  const gate = [round(clubPlan.entrance.y - GATE_WIDTH / 2, 2), round(clubPlan.entrance.y + GATE_WIDTH / 2, 2)] as const;
  const farKerb = [round(street[0] - EXTERIOR.kerb, 2), street[0]] as const;
  const farSidewalk = [round(farKerb[0] - EXTERIOR.far, 2), farKerb[0]] as const;
  // El umbral cruza la vereda y baja a la calle como un vado; desde ahí sigue una senda peatonal hasta enfrente.
  const apron = round(kerb[0] - EXTERIOR.apron, 2);
  return { edge, hedge, sidewalk, kerb, street, farKerb, farSidewalk, gate, apron };
}

/** Base de la maqueta (isométrico): el terreno del club más el exterior del oeste. */
export function modelBase(): Rect {
  const ground = groundBounds("iso");
  const x = exterior().farSidewalk[0];
  return { x, y: ground.y, width: round(ground.x + ground.width - x, 2), height: ground.height };
}

/**
 * Rótulos de lugar pintados sobre el plano en el isométrico: se proyectan sobre el suelo o la cubierta, a lo largo
 * del eje este-oeste, que en el dibujo se lee de izquierda a derecha y en subida. `x`, `y`: centro de la línea de base.
 * `size`: alto de la letra en unidades del plano (2,03 son 11 px con la ventana a 1440 px); `length`: largo estimado.
 * Van algo más grandes que los 11 px de la planta para leerse como información y no como textura: «Pabellón» tiene
 * lugar de sobra en la losa; «Acceso» llega hasta donde da el pavimento del umbral.
 */
export type PaintedLabel = { label: string; x: number; y: number; z: number; size: number; length: number; tone: "roof" | "ground" };
export function paintedLabels(): PaintedLabel[] {
  const { pavilion } = clubPlan;
  const { apron, gate } = exterior();
  const size = 2.25, roofSize = 2.5;
  const lengthOf = (base: number, letter: number) => round((base * letter) / 2.03, 1);
  return [
    { label: "Pabellón", tone: "roof", size: roofSize, length: lengthOf(13.2, roofSize), z: roofHeight("iso"), x: pavilion.x + pavilion.width / 2, y: round(pavilion.y + (pavilion.height + ROOF_OVERHANG.south) / 2 + 0.8, 2) },
    // Sobre el umbral: del vado a la terraza de entrada, centrado en el ancho del portón para no rozar el seto.
    { label: "Acceso", tone: "ground", size, length: lengthOf(10.6, size), z: 0, x: round(apron + 0.2 + lengthOf(10.6, size) / 2, 2), y: round((gate[0] + gate[1]) / 2 + size * 0.36, 2) },
  ];
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
  ];
  // Isométrico: el pinar asoma sobre la cubierta. Planta: sin pinos detrás del pabellón; arriba solo entra «Acceso».
  if (view === "iso") corners.push(project(view, pavilion.x, TREE_LINE.y, TREE_LINE.top.iso), project(view, pavilion.x + pavilion.width, TREE_LINE.y, TREE_LINE.top.iso));
  else corners.push([planAccessNote()[0], planAccessNote()[1] - PLAN_NOTE_HEIGHT]);
  const pad = FRAME_PAD[view];
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  let left = Math.min(...xs) - pad, bottom = Math.max(...ys) + pad;
  if (view === "iso") {
    // La base de la maqueta suma el exterior al oeste: el encuadre crece a la izquierda y abajo, con un margen corto,
    // y el dibujo sale hacia el margen de la página (ver `isoBleed`) en vez de achicarse.
    const base = modelBase();
    left = Math.min(left, project(view, base.x, base.y)[0] - BASE_PAD);
    bottom = Math.max(bottom, project(view, base.x, base.y + base.height, -EXTERIOR.base)[1] + BASE_PAD);
  }
  const x = round(left);
  const y = round(Math.min(...ys) - pad);
  const box = { x, y, width: round(Math.max(...xs) + pad - x), height: round(bottom - y) };
  viewBoxes.set(view, box);
  return box;
}

/**
 * Cuánto más ancho es el isométrico por el exterior del oeste, como fracción del ancho que tendría sin él. El CSS
 * corre el plano esa fracción hacia el margen izquierdo de la página (`--iso-bleed`): las canchas no cambian de tamaño.
 */
export function isoBleed(): number {
  const box = viewBox("iso");
  const withoutExterior = Math.min(project("iso", FRAME.west, FRAME.north)[0], project("iso", clubPlan.pavilion.x, TREE_LINE.y, TREE_LINE.top.iso)[0]) - FRAME_PAD.iso;
  return round((round(withoutExterior) - box.x) / (box.width - (round(withoutExterior) - box.x)), 4);
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

export type CourtTagAnchor = {
  id: CourtId;
  /** Planta: centro de la cancha, en % del ancho del dibujo. La etiqueta va en una fila debajo. */
  planX: number;
  /** Isométrico: final de la línea que sale del pie de la cancha, en % del dibujo. La etiqueta se ubica ahí. */
  isoX: number;
  isoY: number;
};

/**
 * Isométrico: línea que une cada cancha con su etiqueta. Prolonga el eje largo de la cancha sobre el suelo, hacia
 * el sur (en el dibujo baja hacia la derecha), así no se lee como un poste. Arranca en el anillo de la
 * cancha elegida y mide lo mismo en las tres, para conservar la diagonal escalonada de etiquetas. Es larga a
 * propósito: cruza el paseo y el borde sur y termina fuera de la base, para que la etiqueta no pise el dibujo.
 */
export const ISO_LEAD = { start: 1.4, length: 18.6 } as const;

/** Extremos de esa línea en el suelo: del borde sur de la cancha hacia afuera. */
export function isoLead(court: Rect): readonly [from: Vec2, to: Vec2] {
  const x = court.x + court.width / 2, foot = court.y + court.height + ISO_LEAD.start;
  return [[x, foot], [x, round(foot + ISO_LEAD.length, 2)]];
}

/** Isométrico: punto del dibujo (en unidades de SVG) donde termina la línea y se ubica la etiqueta de una cancha. */
export const isoTagPoint = (court: Rect): Vec2 => project("iso", ...isoLead(court)[1]);

export function courtTagAnchors(): CourtTagAnchor[] {
  return clubPlan.courts.map((court) => {
    const center = court.x + court.width / 2;
    const [planX] = toPercent("plan", project("plan", center, court.y + court.height / 2));
    const [isoX, isoY] = toPercent("iso", isoTagPoint(court));
    return { id: court.id, planX, isoX, isoY };
  });
}

export type MapNote = { label: string; x: number; y: number; placement: "center" | "start" | "end"; tone: "roof" | "ground" };

/** Rótulos de la planta, como texto sobre el dibujo: el pabellón sobre la cubierta y el acceso junto al portón. */
export function mapNotes(view: PlanView): MapNote[] {
  const { pavilion } = clubPlan;
  const roof = roofHeight(view);
  // En el isométrico los rótulos de lugar van pintados sobre el dibujo (`paintedLabels`), no como texto encima.
  if (view === "iso") return [];
  const [px, py] = toPercent(view, project(view, pavilion.x + pavilion.width / 2, pavilion.y + pavilion.height * 0.35, roof));
  const [ax, ay] = toPercent(view, planAccessNote());
  return [
    { label: "Pabellón", x: px, y: py, placement: "center", tone: "roof" },
    { label: "Acceso", x: ax, y: ay, placement: "start", tone: "ground" },
  ];
}

/**
 * Planta: «Acceso» va horizontal, fuera de la silueta del plano. El umbral es demasiado angosto para el texto, así
 * que se ubica arriba, junto al extremo oeste del pabellón, con una guía corta que baja hasta el portón.
 * Devuelve el punto del dibujo (unidades de SVG) donde arranca el texto.
 */
export function planAccessNote(): Vec2 {
  const { pavilion } = clubPlan;
  const [, roofEdge] = project("plan", pavilion.x, pavilion.y - ROOF_OVERHANG.sides, roofHeight("plan"));
  return [round(planAccessGuide()[0][0] + 7), round(roofEdge - 17)];
}

/**
 * Planta: guía de «Acceso», del rótulo a la entrada, en unidades de SVG. Baja por el césped, justo al este del seto
 * perimetral, y termina sobre la terraza de entrada, al lado del portón.
 */
export function planAccessGuide(): readonly [from: Vec2, to: Vec2] {
  const { gate, edge } = exterior();
  const [x] = project("plan", edge + 0.55, 0);
  const [, noteY] = project("plan", 0, clubPlan.pavilion.y - ROOF_OVERHANG.sides, roofHeight("plan"));
  return [[round(x), round(noteY - 17)], [round(x), round(project("plan", 0, gate[0] + 0.5)[1])]];
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
