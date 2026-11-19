import type { CSSProperties } from "react";
import { clubPlan } from "@/data/club-plan";
import { courts as courtContent } from "@/data/courts";
import { PINE, SHRUB, SUN, TALL_PINE, landscape, type Block, type Bloom, type Fence, type Pine, type Shrub } from "@/lib/booking/plan-landscape";
import {
  BODY_INSET, EXTERIOR, HEIGHTS, ROOF_OVERHANG, TERRACE, courtDoor, courtMarkings, exterior, planAccessGuide, groundBounds, groundTransform, isoLead, mapNotes, modelBase, paintedLabels, pavilionHeight, points, project, roofHeight, terraceHeight, viewBox, viewBoxAttribute,
  type PaintedLabel, type PlanView,
} from "@/lib/booking/plan-projection";

/**
 * Los dos dibujos del club (planta con volumen e isométrico 2.5D). Server Component sin estado: no recibe la
 * selección. El flujo del cliente escribe `data-court` y `data-busy` en el contenedor `.ronda-plan` y el CSS
 * reacciona sobre los elementos de cada cancha (`[data-court-id]`). Ambos dibujos están en el DOM; `@media`
 * muestra la planta por debajo de 1280 px y el isométrico desde 1280 px. Son decorativos: los controles
 * accesibles son las etiquetas de cancha, que viven fuera del SVG.
 * El paisaje (`plan-landscape.ts`) va en grupos `.l-scape`: se simplifica en celular y se oculta en colores forzados.
 */
export function ClubPlanArt() {
  return <>
    <PlanView view="plan" />
    <PlanView view="iso" />
  </>;
}

function PlanView({ view }: { view: PlanView }) {
  return <div className={`ronda-plan-view ronda-plan-view--${view}`}>
    <svg className="ronda-plan-svg" viewBox={viewBoxAttribute(view)} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`ronda-plan-hatch-${view}`} width="1.3" height="1.3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line className="ronda-plan-hatch-line" x1="0" y1="0" x2="0" y2="1.3" />
        </pattern>
        <Symbols view={view} />
      </defs>
      {view === "iso" && <ModelBase />}
      <Ground view={view} />
      <g className="ronda-plan-volumes"><Volumes view={view} /></g>
      {view === "plan" ? <Leaders /> : <IsoLeads />}
    </svg>
    {mapNotes(view).map((note) => <span
      key={note.label}
      className={`ronda-plan-note is-${note.placement} is-${note.tone}`}
      style={{ "--x": `${note.x}%`, "--y": `${note.y}%` } as CSSProperties}
      aria-hidden="true"
    >{note.label}</span>)}
  </div>;
}

function Ground({ view }: { view: PlanView }) {
  const { pavilion, courts, paths } = clubPlan;
  const scape = landscape(view);
  // Sombra de un bloque: su huella corrida hacia donde cae el sol (exagerada, para que se lea a esta escala).
  const angle = (SUN.angle * Math.PI) / 180;
  const blockShade = (block: Block) => {
    const reach = block.tall * SUN.length * 1.6;
    const dx = round(Math.cos(angle) * reach, 2), dy = round(Math.sin(angle) * reach, 2);
    const x2 = round(block.x + block.width, 2), y2 = round(block.y + block.height, 2);
    return `${block.x},${block.y} ${x2},${block.y} ${round(x2 + dx, 2)},${round(block.y + dy, 2)} ${round(x2 + dx, 2)},${round(y2 + dy, 2)} ${round(block.x + dx, 2)},${round(y2 + dy, 2)} ${block.x},${y2}`;
  };
  return <g transform={groundTransform(view)}>
    {view === "iso" && <Exterior />}
    <g className="l-scape">
      {scape.lawns.map((lawn) => <rect key={`${lawn.x}-${lawn.y}`} className={lawn.vivid ? "l-lawn is-vivid" : "l-lawn"} x={lawn.x} y={lawn.y} width={lawn.width} height={lawn.height} rx="1.4" />)}
    </g>
    {paths.map((path) => <rect key={path.id} className="g-pave" x={path.x} y={path.y} width={path.width} height={path.height} />)}
    {/* Puerta de cada cancha: un tramo corto de piso que baja de la galería hasta la abertura del cerco. */}
    {courts.map((court) => {
      const [from, to] = courtDoor(court);
      const top = Math.max(...paths.filter((path) => path.id === "galeria-norte").map((path) => path.y + path.height), court.y - 2);
      return <rect key={court.id} className="g-pave g-door" x={from} y={top} width={round(to - from, 2)} height={round(court.y - top, 2)} />;
    })}
    {/* Planta: el umbral cruza el seto perimetral por el portón (en el isométrico lo dibuja el exterior). */}
    {view === "plan" && (() => {
      const { gate, edge } = exterior();
      const west = groundBounds("plan").x;
      return <rect className="g-pave" x={west} y={gate[0]} width={round(edge - west, 2)} height={round(gate[1] - gate[0], 2)} />;
    })()}
    {view === "iso" && paintedLabels().filter((item) => item.tone === "ground").map((item) => <Painted key={item.label} item={item} />)}
    {/* Flecha de «Acceso»: sobre la terraza de entrada, del portón hacia el pabellón. Va después del piso, que si no la tapa. */}
    {view === "iso" && (() => {
      const { edge, gate } = exterior();
      const y = round(gate[1] + 0.55, 2);
      return <path className="g-arrow" d={`M${edge + 0.6} ${y}H${edge + 4.4}m-1 -0.6l1 0.6l-1 0.6`} />;
    })()}
    {/* Sombras del paisaje: van debajo de las canchas, para no ensuciar sus estados. */}
    <g className="l-scape l-shades" clipPath={`url(#ronda-plan-ground-${view})`}>
      {scape.blocks.map((block) => <polygon key={`${block.x}-${block.y}`} points={blockShade(block)} />)}
      {scape.shrubs.map((shrub, index) => <g key={`s${index}`} transform={`translate(${round(shrub.x)} ${round(shrub.y)}) scale(${shrub.size})`}>
        <use className={`is-${shrub.tier}`} href={`#rp-ts-${view}`} />
      </g>)}
      {/* La sombra de los pinos de atrás cae bajo la cubierta, salvo en los que sobresalen por los costados. */}
      {scape.pines.filter((pine) => !pine.back || pine.x < pavilion.x + 4 || pine.x > pavilion.x + pavilion.width - 2).map((pine, index) => <g key={`p${index}`} transform={`translate(${round(pine.x)} ${round(pine.y)}) scale(${pine.size})`}>
        <use className={`is-${pine.tier}`} href={`#rp-${pine.kind === "tall" ? "tt" : "tp"}-${view}`} />
      </g>)}
    </g>
    {courts.map((court) => {
      const { inner, singles, service, center, centerMark } = courtMarkings(court);
      const bottom = court.y + court.height;
      return <g key={court.id} className={`ronda-plan-court is-${surfaceOf(court.id)}`} data-court-id={court.id}>
        <rect className="c-out" x={court.x} y={court.y} width={court.width} height={court.height} />
        <rect className="c-in" x={inner.x} y={inner.y} width={inner.width} height={inner.height} />
        <g className="c-lines">
          <rect x={inner.x} y={inner.y} width={inner.width} height={inner.height} />
          {singles.map((x) => <line key={x} x1={x} y1={inner.y} x2={x} y2={inner.y + inner.height} />)}
          <line x1={singles[0]} y1={service[0]} x2={singles[1]} y2={service[0]} />
          <line x1={singles[0]} y1={service[1]} x2={singles[1]} y2={service[1]} />
          <line x1={center} y1={service[0]} x2={center} y2={service[1]} />
          <line x1={center} y1={inner.y} x2={center} y2={inner.y + centerMark} />
          <line x1={center} y1={inner.y + inner.height} x2={center} y2={inner.y + inner.height - centerMark} />
        </g>
        <rect className="c-veil" x={court.x} y={court.y} width={court.width} height={court.height} />
        <rect className="c-hatch" x={court.x} y={court.y} width={court.width} height={court.height} fill={`url(#ronda-plan-hatch-${view})`} />
        <rect className="c-edge" x={court.x} y={bottom - 1.8} width={court.width} height="1.8" />
      </g>;
    })}
    {/* Planta: el cerco es una línea fina alrededor de cada cancha, abierta en la puerta del lado de la galería. */}
    {view === "plan" && <g className="l-scape">
      {scape.fences.map(({ id, rect, gate }) => <path
        key={id}
        className="l-fence-line"
        d={`M${gate[1]} ${rect.y}H${rect.x + rect.width}V${rect.y + rect.height}H${rect.x}V${rect.y}H${gate[0]}`}
      />)}
      {/* Jardín: el cerco del este y del sur va cubierto de enredadera; en planta es una franja verde. */}
      {scape.fences.filter((fence) => fence.vine).map(({ id, rect }) => <path
        key={id}
        className="l-fence-vine"
        d={`M${rect.x + rect.width} ${rect.y}V${rect.y + rect.height}H${rect.x}`}
      />)}
    </g>}
  </g>;
}

/** Costados de la base de la maqueta (isométrico): el canto sur y el oeste, que es donde se corta la calle. */
function ModelBase() {
  const base = modelBase();
  const x2 = base.x + base.width, y2 = base.y + base.height, depth = -EXTERIOR.base;
  return <>
    <polygon className="g-base-west" points={points("iso", [[base.x, base.y], [base.x, y2], [base.x, y2, depth], [base.x, base.y, depth]])} />
    <polygon className="g-base-south" points={points("iso", [[base.x, y2], [x2, y2], [x2, y2, depth], [base.x, y2, depth]])} />
  </>;
}

/** Exterior (isométrico), en coordenadas del suelo: base, calle con su línea, cordón, vereda y umbral del portón. */
function Exterior() {
  const base = modelBase();
  const { edge, sidewalk, kerb, street, farKerb, farSidewalk, gate, apron } = exterior();
  const y2 = base.y + base.height;
  const strip = (className: string, [from, to]: readonly [number, number]) =>
    <rect className={className} x={from} y={base.y} width={round(to - from, 2)} height={base.height} />;
  const lane = round((street[0] + street[1]) / 2, 2);
  return <>
    <rect className="g-base" x={base.x} y={base.y} width={base.width} height={base.height} />
    <g className="l-scape">
      {strip("g-sidewalk", farSidewalk)}
      {strip("g-kerb", farKerb)}
      {strip("g-street", street)}
      <line className="g-lane" x1={lane} y1={base.y + 1} x2={lane} y2={y2 - 1} />
      {/* Senda peatonal tenue frente al portón: franjas a lo ancho de la calle, del vado a la vereda de enfrente. */}
      {Array.from({ length: Math.floor((apron - street[0] - 0.3) / 0.9) }, (_, index) => <rect key={index} className="g-crossing" x={round(street[0] + 0.35 + index * 0.9, 2)} y={gate[0] + 0.2} width="0.45" height={round(gate[1] - gate[0] - 0.4, 2)} />)}
      {strip("g-kerb", kerb)}
      {strip("g-sidewalk", sidewalk)}
    </g>
    {/* Umbral: un vado que sube de la calle, cruza la vereda y entra por el portón del seto hasta el camino de acceso. */}
    <rect className="g-pave" x={apron} y={gate[0]} width={round(edge - apron, 2)} height={round(gate[1] - gate[0], 2)} />
  </>;
}

/** Rótulo de lugar pintado sobre un plano horizontal: el texto se tiende con la misma transformación que el suelo. */
function Painted({ item, lifted = false }: { item: PaintedLabel; lifted?: boolean }) {
  const text = <text className={`ronda-plan-paint is-${item.tone}`} x={item.x} y={item.y} fontSize={item.size} textAnchor="middle">{item.label}</text>;
  // Dentro del grupo del suelo ya está proyectado; sobre la cubierta hay que subirlo a su altura.
  return lifted ? <g transform={`translate(0 ${round(-item.z * 10)}) ${groundTransform("iso")}`}>{text}</g> : text;
}

/**
 * Formas que se repiten (pinos, arbustos y sus sombras): se definen una vez por vista y se ubican con `<use>`.
 * Los colores van en línea, como variables de `.ronda-plan`: las reglas con ancestros no llegan a las copias de `<use>`.
 */
function Symbols({ view }: { view: PlanView }) {
  const rise = -project(view, 0, 0, 1)[1];
  const ground = view === "iso" ? modelBase() : groundBounds(view);
  type Lobe = readonly [x: number, y: number, width: number, height: number];
  const crown = (tone: "pine" | "shrub" | "blossom", cy: number, rx: number, ry: number, lobes: readonly Lobe[], lit: readonly Lobe[]) => <>
    {lobes.map(([x, y, w, h], index) => <ellipse key={`d${index}`} style={{ fill: `var(--plan-${tone})` }} cx={round(x * rx)} cy={round(cy + y * ry)} rx={round(w * rx)} ry={round(h * ry)} />)}
    {lit.map(([x, y, w, h], index) => <ellipse key={`l${index}`} style={{ fill: `var(--plan-${tone}-lit)` }} cx={round(x * rx)} cy={round(cy + y * ry)} rx={round(w * rx)} ry={round(h * ry)} />)}
  </>;
  const trunk = <line style={{ stroke: "var(--plan-trunk)" }} strokeWidth="1.5" strokeLinecap="round" x1="0" y1="0" x2="0" y2={round(-PINE.crown[view] * rise + PINE.ry[view] * 0.5)} />;
  const pineY = -PINE.crown[view] * rise, shrubY = -SHRUB.lift * rise;
  // La sombra sale de la altura real del pino (la del isométrico), igual en las dos vistas.
  const reach = PINE.crown.iso * SUN.length;
  return <>
    <clipPath id={`ronda-plan-ground-${view}`}><rect x={ground.x} y={ground.y} width={ground.width} height={ground.height} /></clipPath>
    {/* Pino de copa redonda y tronco alto, en dos formas: una copa entera y otra partida en dos. */}
    <g id={`rp-pa-${view}`}>
      {trunk}
      {crown("pine", pineY, PINE.rx[view], PINE.ry[view], [[0, 0, 1, 1]], [[-0.22, -0.24, 0.66, 0.6]])}
    </g>
    {/* Árbol con flor: la misma forma, en un tono claro. */}
    <g id={`rp-pf-${view}`}>
      {trunk}
      {crown("blossom", pineY, PINE.rx[view], PINE.ry[view], [[-0.3, 0.14, 0.74, 0.72], [0.28, -0.18, 0.78, 0.8]], [[-0.44, -0.04, 0.44, 0.4], [0.14, -0.4, 0.5, 0.46]])}
    </g>
    <g id={`rp-pb-${view}`}>
      {trunk}
      {crown("pine", pineY, PINE.rx[view], PINE.ry[view], [[-0.3, 0.14, 0.74, 0.72], [0.28, -0.18, 0.78, 0.8]], [[-0.44, -0.04, 0.44, 0.4], [0.14, -0.4, 0.5, 0.46]])}
    </g>
    {/* Pino del bosque. Isométrico: copa ancha y achatada en varias masas, sobre un tronco grueso y oscuro (tres formas).
        Planta: tronco fino y copa en dos o tres masas, y además copas sueltas para las que montan la losa. */}
    {(view === "iso" ? ["a", "b", "c"] as const : ["a", "b"] as const).map((variant) => {
      const forest: Record<string, readonly [readonly Lobe[], readonly Lobe[]]> = {
        a: [[[-0.52, 0.18, 0.48, 0.62], [0.02, -0.14, 0.62, 0.8], [0.54, 0.2, 0.46, 0.6], [0.06, 0.52, 0.5, 0.4]], [[-0.56, -0.02, 0.34, 0.36], [-0.04, -0.44, 0.46, 0.42], [0.52, -0.02, 0.32, 0.32]]],
        b: [[[-0.36, -0.12, 0.64, 0.76], [0.46, 0.12, 0.54, 0.66], [0, 0.5, 0.52, 0.42], [-0.7, 0.36, 0.3, 0.38]], [[-0.42, -0.42, 0.46, 0.4], [0.44, -0.14, 0.38, 0.34], [-0.7, 0.2, 0.2, 0.2]]],
        c: [[[-0.6, 0.06, 0.4, 0.56], [-0.12, -0.2, 0.5, 0.72], [0.38, -0.02, 0.58, 0.7], [0.74, 0.34, 0.26, 0.36], [-0.1, 0.5, 0.56, 0.4]], [[-0.62, -0.12, 0.28, 0.32], [-0.16, -0.5, 0.36, 0.36], [0.36, -0.32, 0.42, 0.36]]],
      };
      const sparse: Record<string, readonly [readonly Lobe[], readonly Lobe[]]> = {
        a: [[[-0.5, 0.2, 0.48, 0.6], [0, -0.12, 0.6, 0.78], [0.52, 0.16, 0.46, 0.58], [0.1, 0.5, 0.38, 0.34]], [[-0.54, 0.02, 0.34, 0.34], [-0.06, -0.4, 0.44, 0.42], [0.5, -0.04, 0.32, 0.3]]],
        b: [[[-0.34, -0.1, 0.62, 0.74], [0.44, 0.1, 0.52, 0.62], [0, 0.46, 0.44, 0.38], [-0.66, 0.34, 0.3, 0.34]], [[-0.4, -0.38, 0.44, 0.4], [0.42, -0.14, 0.36, 0.32]]],
      };
      const [lobes, lit] = (view === "iso" ? forest : sparse)[variant];
      const tallY = -TALL_PINE.crown[view] * rise;
      const shape = crown("pine", tallY, TALL_PINE.rx[view], TALL_PINE.ry[view], lobes, lit);
      const trunkTop = round(tallY + TALL_PINE.ry[view] * 0.3);
      return <g key={variant}>
        <g id={`rp-t${variant}-${view}`}>
          {view === "iso"
            // Tronco que se afina hacia arriba, con una rama que entra en la copa.
            ? <path style={{ fill: "var(--plan-trunk-deep)" }} d={`M-3.4 0L-1.9 ${trunkTop}L-9 ${round(tallY + 2)}L-7.6 ${round(tallY)}L-0.6 ${round(trunkTop + 7)}L1.9 ${trunkTop}L3.4 0Z`} />
            : <line style={{ stroke: "var(--plan-trunk-tall)" }} strokeWidth="3.2" strokeLinecap="round" x1="0" y1="0" x2="0" y2={trunkTop} />}
          {shape}
        </g>
        {view === "plan" && <g id={`rp-c${variant}-${view}`}>{shape}</g>}
      </g>;
    })}
    <g id={`rp-sh-${view}`}>{crown("shrub", shrubY, SHRUB.rx[view], SHRUB.ry[view], [[0, 0, 1, 1]], [[-0.2, -0.28, 0.62, 0.52]])}</g>
    {/* Sombras en el suelo, hacia el este (x); el CSS las gira hacia donde cae el sol. */}
    <g id={`rp-tp-${view}`}>
      <line x1="0" y1="0" x2={reach} y2="0" />
      <ellipse cx={reach} cy="0" rx="1.45" ry="1.1" />
    </g>
    <ellipse id={`rp-ts-${view}`} cx="0.5" cy="0" rx="1.15" ry="0.85" />
    <g id={`rp-tt-${view}`}>
      <line x1="0" y1="0" x2={TALL_PINE.crown.iso * SUN.length} y2="0" />
      <ellipse cx={TALL_PINE.crown.iso * SUN.length} cy="0" rx="4.4" ry="2.8" />
    </g>
  </>;
}

/**
 * Pabellón de una planta, largo y bajo: una losa gruesa que domina, el volumen vidriado retirado debajo y todo
 * sobre una terraza apenas elevada. Después, el paisaje y las redes.
 */
function Volumes({ view }: { view: PlanView }) {
  const { pavilion, courts, paths } = clubPlan;
  const scape = landscape(view);
  const t = terraceHeight(view);
  const h = pavilionHeight(view);
  const soffit = t + h;
  const top = roofHeight(view);
  const x1 = pavilion.x, x2 = pavilion.x + pavilion.width, y1 = pavilion.y, y2 = pavilion.y + pavilion.height;
  const sx1 = x1 - ROOF_OVERHANG.sides, sx2 = x2 + ROOF_OVERHANG.sides, sy1 = y1 - ROOF_OVERHANG.sides, sy2 = y2 + ROOF_OVERHANG.south;
  const bx1 = x1 + BODY_INSET, bx2 = x2 - BODY_INSET;
  type Corner = readonly [number, number, number?];
  const poly = (className: string, corners: readonly Corner[], key?: string | number) =>
    <polygon key={key} className={className} points={points(view, corners)} />;
  const seg = (className: string, a: readonly [number, number, number], b: readonly [number, number, number], key?: string | number) => {
    const [ax, ay] = project(view, ...a);
    const [bx, by] = project(view, ...b);
    return <line key={key} className={className} x1={round(ax)} y1={round(ay)} x2={round(bx)} y2={round(by)} />;
  };
  const at = (x: number, y: number, z = 0) => project(view, x, y, z).map((value) => round(value)).join(" ");
  /** Varias caras en un solo `<path>`: menos elementos para paños, pilares y perfiles. */
  const faces = (list: readonly (readonly Corner[])[]) => list.map((corners) => `M${corners.map(([x, y, z = 0]) => at(x, y, z)).join("L")}Z`).join("");

  // Terraza: del pabellón hacia los costados y hasta el borde sur de la galería, con muro bajo abierto frente a cada cancha.
  const gallery = paths.find((path) => path.id === "galeria-norte");
  const tx1 = x1 - TERRACE.sides, tx2 = x2 + TERRACE.sides, ty1 = y1 - TERRACE.north, ty2 = gallery ? gallery.y + gallery.height : sy2 + 3;
  // El muro se abre en la puerta de cada cancha (`courtDoor`), igual que el cerco y la vegetación.
  const doors = courts.map(courtDoor).filter(([from, to]) => from > tx1 + 1 && to < tx2 - 1);
  const stops = [tx1, ...doors.flat(), tx2];
  const walls = Array.from({ length: stops.length / 2 }, (_, index) => [stops[index * 2], stops[index * 2 + 1]] as const);
  const wallTop = t + TERRACE.parapet, wallY = ty2 - TERRACE.wall;

  // Fachada sur: paños de vidrio oscuro con luz cálida adentro, perfiles negros finos y un pilar de madera cada cinco.
  // Desde arriba solo se ve la parte baja; el resto queda bajo el vuelo de la losa.
  const bays = 30;
  const bay = (bx2 - bx1) / bays;
  const visible = t + h - ROOF_OVERHANG.south / (view === "iso" ? 1 : 1.25);
  const glow: Corner[][] = [], dim: Corner[][] = [], timber: Corner[][] = [], mullions: Corner[][] = [], exit: Corner[][] = [], doorstep: Corner[][] = [];
  // Ingreso al edificio: una puerta en el muro oeste, frente al portón.
  const entryY = clubPlan.entrance.y;
  const entryTop = t + Math.max(1.2, h - BODY_INSET - ROOF_OVERHANG.sides - 0.4);
  for (let index = 0; index < bays; index++) {
    const a = round(bx1 + bay * index, 2), b = round(a + bay, 2);
    if (index > 0) mullions.push([[a, y2, t], [a, y2, soffit]]);
    // Salida a la galería: el paño que coincide con `pavilionExit` es una puerta abierta, toda iluminada.
    if (clubPlan.pavilionExit.x > a && clubPlan.pavilionExit.x < b) {
      exit.push([[a + 0.1, y2, t], [b - 0.1, y2, t], [b - 0.1, y2, visible], [a + 0.1, y2, visible]]);
      doorstep.push([[a - 0.3, y2, t], [b + 0.3, y2, t], [b + 0.3, y2 + 1.4, t], [a - 0.3, y2 + 1.4, t]]);
      continue;
    }
    if (index % 5 === 2) {
      timber.push([[a + 0.45, y2, t], [b - 0.45, y2, t], [b - 0.45, y2, soffit], [a + 0.45, y2, soffit]]);
      continue;
    }
    // Vidrio oscuro con luz adentro: de cada cinco paños, dos brillan, uno apenas y otro queda a oscuras.
    if (index % 5 === 4) continue;
    (index % 5 === 1 ? dim : glow).push([[a + 0.22, y2, t + 0.18], [b - 0.22, y2, t + 0.18], [b - 0.22, y2, visible], [a + 0.22, y2, visible]]);
  }
  // Columnas de la galería: gruesas y cortas, de la terraza al borde de la losa.
  const columnY = sy2 - 0.3;
  const spans = Math.round((bx2 - bx1) / 10);
  const columns = Array.from({ length: spans + 1 }, (_, index) => round(bx1 + ((bx2 - bx1) * index) / spans, 2));

  // Un pino o un arbusto: la forma de la vista, ubicada en su base y escalada a su tamaño.
  const plant = (item: Pine | Shrub, index: number, shape: string) => {
    const [x, y] = project(view, item.x, item.y);
    const lean = "lean" in item && item.lean ? ` rotate(${item.lean})` : "";
    const scale = "flip" in item && item.flip ? `${-item.size} ${item.size}` : `${item.size}`;
    return <g key={`${shape}${index}`} transform={`translate(${Math.round(x)} ${Math.round(y)})${lean} scale(${scale})`}>
      <use className={`is-${item.tier}`} href={`#rp-${shape}-${view}`} />
    </g>;
  };
  // Planta: de los pinos altos que quedan detrás de la losa solo se ve la copa, que monta apenas su borde norte.
  const overRoof = (item: Pine) => view === "plan" && item.kind === "tall" && item.back && item.x > sx1 && item.x < sx2;
  const pine = (item: Pine, index: number) => plant(item, index, item.blossom ? "pf" : `${overRoof(item) ? "c" : item.kind === "tall" ? "t" : "p"}${item.variant}`);
  const shrub = (item: Shrub, index: number) => plant(item, index, "sh");
  const block = (item: Block) => {
    const a = item.x, b = round(item.x + item.width, 2), c = item.y, d = round(item.y + item.height, 2), t = item.tall;
    const kind = item.kind === "perimeter" ? "hedge" : item.kind;
    return <g key={`b${a}-${c}`}>
      {view === "iso" && poly(`l-${kind}-west`, [[a, c], [a, d], [a, d, t], [a, c, t]])}
      {poly(`l-${kind}-south`, [[a, d], [b, d], [b, d, t], [a, d, t]])}
      {poly(`l-${kind}-top`, [[a, c, t], [b, c, t], [b, d, t], [a, d, t]])}
    </g>;
  };
  // Cada flor es un tramo de largo cero con extremos redondos: un punto, sin sumar un elemento por flor.
  const dots = (blooms: readonly Bloom[]) => blooms.map(([x, y, z]) => `M${project(view, x, y, z).map(Math.round).join(" ")}h0`).join("");
  // Isométrico: el cerco es una cara transparente con su baranda y sus postes; la puerta queda abierta al norte.
  const fence = ({ id, rect, height, gate, vine }: Fence) => {
    const fx = rect.x, fy = rect.y, fx2 = rect.x + rect.width, fy2 = rect.y + rect.height;
    const sides = [[[fx, fy], [gate[0], fy]], [[gate[1], fy], [fx2, fy]], [[fx2, fy], [fx2, fy2]], [[fx, fy], [fx, fy2]], [[fx, fy2], [fx2, fy2]]] as const;
    const faces = sides.map(([[ax, ay], [bx, by]]) => `M${at(ax, ay)}L${at(bx, by)}L${at(bx, by, height)}L${at(ax, ay, height)}Z`).join("");
    const wire = sides.map(([[ax, ay], [bx, by]]) => {
      const posts = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 5.25));
      const uprights = Array.from({ length: posts + 1 }, (_, index) => {
        const x = ax + ((bx - ax) * index) / posts, y = ay + ((by - ay) * index) / posts;
        return `M${at(x, y)}L${at(x, y, height)}`;
      }).join("");
      return `M${at(ax, ay, height)}L${at(bx, by, height)}${uprights}`;
    }).join("");
    // Jardín: sobre el cerco del este y del sur, un paño de enredadera (bajo al sur, para no tapar el pie de la cancha).
    const wall = (a: readonly [number, number], b: readonly [number, number], tall: number) => `M${at(a[0], a[1])}L${at(b[0], b[1])}L${at(b[0], b[1], tall)}L${at(a[0], a[1], tall)}Z`;
    return <g key={id} className="l-fence" data-court-id={id}>
      <path className="l-fence-face" d={faces} />
      <path className="l-fence-wire" d={wire} />
      {vine && <path className="l-vinewall" d={wall([fx2, fy], [fx2, fy2], vine.east) + wall([fx, fy2], [fx2, fy2], vine.south)} />}
    </g>;
  };

  return <>
    {/* Los pinos de atrás van primero: el pabellón los tapa hasta donde llega. */}
    <g className="l-scape">{scape.pines.filter((item) => item.back && !overRoof(item)).map(pine)}</g>
    {/* Terraza: frente oeste, piso, sombra de la losa sobre el piso y muro bajo con sus aberturas. */}
    {view === "iso" && poly("v-terrace-west", [[tx1, ty1], [tx1, ty2], [tx1, ty2, t], [tx1, ty1, t]])}
    {poly("v-terrace", [[tx1, ty1, t], [tx2, ty1, t], [tx2, ty2, t], [tx1, ty2, t]])}
    {poly("v-shade", [[sx1 + 0.5, y2, t], [sx2 + 0.9, y2, t], [sx2 + 0.9, sy2 + 1.1, t], [sx1 + 0.5, sy2 + 1.1, t]])}
    <path className="v-doorstep" d={faces([...doorstep, [[tx1, entryY - 1.7, t], [bx1, entryY - 1.7, t], [bx1, entryY + 1.7, t], [tx1, entryY + 1.7, t]]])} />
    {poly("v-terrace-south", [[tx1, ty2], [tx2, ty2], [tx2, ty2, t], [tx1, ty2, t]])}
    <path className="v-step" d={doors.map(([from, to]) => `M${at(from, ty2, t / 2)}L${at(to, ty2, t / 2)}`).join("")} />
    <path className="v-wall-top" d={faces(walls.map(([a, b]) => [[a, wallY, wallTop], [b, wallY, wallTop], [b, ty2, wallTop], [a, ty2, wallTop]]))} />
    <path className="v-wall" d={faces(walls.map(([a, b]) => [[a, ty2, t], [b, ty2, t], [b, ty2, wallTop], [a, ty2, wallTop]]))} />
    {view === "iso" && <path className="v-wall-west" d={faces(walls.map(([a]) => [[a, wallY, t], [a, ty2, t], [a, ty2, wallTop], [a, wallY, wallTop]]))} />}
    {/* Volumen vidriado, retirado bajo la losa. */}
    {view === "iso" && poly("v-west", [[bx1, y1, t], [bx1, y2, t], [bx1, y2, soffit], [bx1, y1, soffit]])}
    {view === "iso" && poly("v-door", [[bx1, entryY - 1.3, t], [bx1, entryY + 1.3, t], [bx1, entryY + 1.3, entryTop], [bx1, entryY - 1.3, entryTop]])}
    {view === "iso" && seg("v-mullion", [bx1, entryY, t], [bx1, entryY, entryTop])}
    {poly("v-glass", [[bx1, y2, t], [bx2, y2, t], [bx2, y2, soffit], [bx1, y2, soffit]])}
    <path className="v-glow" d={faces(glow)} />
    <path className="v-glow is-dim" d={faces(dim)} />
    <path className="v-door" d={faces(exit)} />
    <path className="v-timber" d={faces(timber)} />
    <path className="v-mullion" d={mullions.map(([a, b]) => `M${at(...a)}L${at(...b)}`).join("")} />
    {/* Sombra del vuelo sobre la fachada: la franja oscura que despega la losa. */}
    {poly("v-soffit", [[bx1, y2, visible - 0.7], [bx2, y2, visible - 0.7], [bx2, y2, soffit], [bx1, y2, soffit]])}
    {view === "iso" && poly("v-soffit", [[bx1, y1, soffit - BODY_INSET - ROOF_OVERHANG.sides - 0.7], [bx1, y2, soffit - BODY_INSET - ROOF_OVERHANG.sides - 0.7], [bx1, y2, soffit], [bx1, y1, soffit]])}
    {columns.map((x) => seg("v-col", [x, columnY, t], [x, columnY, soffit], `c${x}`))}
    {/* Losa: canto grueso al oeste y al sur, y cubierta limpia. */}
    {view === "iso" && poly("v-slabwest", [[sx1, sy1, soffit], [sx1, sy2, soffit], [sx1, sy2, top], [sx1, sy1, top]])}
    {poly("v-slabface", [[sx1, sy2, soffit], [sx2, sy2, soffit], [sx2, sy2, top], [sx1, sy2, top]])}
    {poly("v-roof", [[sx1, sy1, top], [sx2, sy1, top], [sx2, sy2, top], [sx1, sy2, top]])}
    {view === "iso" && paintedLabels().filter((item) => item.tone === "roof").map((item) => <Painted key={item.label} item={item} lifted />)}
    <g className="l-scape">
      {scape.pines.filter(overRoof).map(pine)}
    </g>
    <g className="l-scape">
      {scape.blocks.map(block)}
      <path className="l-tuft" d={dots(scape.tufts.dark)} />
      <path className="l-tuft is-lit" d={dots(scape.tufts.lit)} />
      {view === "iso" && scape.fences.map(fence)}
      {view === "iso" && <path className="l-vine" d={dots(scape.fenceVine.dark)} />}
      {view === "iso" && <path className="l-vine is-lit" d={dots(scape.fenceVine.lit)} />}
    </g>
    {/* El anillo de la cancha elegida es una señal, no un objeto: va por encima de setos y cercos. */}
    <g className="ronda-plan-rings" transform={groundTransform(view)}>
      {courts.map((court) => <g key={court.id} data-court-id={court.id}>
        <rect className="c-ring" x={court.x - 1.4} y={court.y - 1.4} width={court.width + 2.8} height={court.height + 2.8} />
        {/* El anillo de la cancha elegida se dibuja alrededor de ella al elegirla: una máscara con su mismo contorno
            lo descubre (ver .c-ring-reveal). El anillo conserva su grosor en pantalla; la máscara, no hace falta. */}
        <mask id={`ronda-ring-${view}-${court.id}`} maskUnits="userSpaceOnUse" x={court.x - 4} y={court.y - 4} width={court.width + 8} height={court.height + 8}>
          <rect className="c-ring-reveal" pathLength={1} x={court.x - 1.4} y={court.y - 1.4} width={court.width + 2.8} height={court.height + 2.8} />
        </mask>
        <rect className="c-ring-draw" mask={`url(#ronda-ring-${view}-${court.id})`} x={court.x - 1.4} y={court.y - 1.4} width={court.width + 2.8} height={court.height + 2.8} />
      </g>)}
    </g>
    {courts.map((court) => {
      // Los postes de la red quedan una unidad por fuera de las líneas de dobles.
      const { inner, net } = courtMarkings(court);
      const a = inner.x - 1, b = inner.x + inner.width + 1;
      return <g key={court.id}>
        {poly("v-net", [[a, net], [b, net], [b, net, HEIGHTS.net], [a, net, HEIGHTS.net]])}
        {seg("v-tape", [a, net, HEIGHTS.net], [b, net, HEIGHTS.net])}
      </g>;
    })}
    <g className="l-scape">
      {scape.shrubs.map(shrub)}
      {/* Flores sobre las matas de Jardín: casi todas blancas, pocas hortensias azules. */}
      <path className="l-bloom" d={dots(scape.blooms.large)} />
      <path className="l-bloom is-small" d={dots(scape.blooms.small)} />
      <path className="l-bloom is-deep" d={dots(scape.blooms.deep)} />
      {scape.pines.filter((item) => !item.back).map(pine)}
    </g>
  </>;
}

/** Planta: guía vertical desde el pie de cada cancha hasta su etiqueta (solo en la cancha elegida) y guía de «Acceso». */
function Leaders() {
  const bottom = viewBox("plan").y + viewBox("plan").height;
  const [from, to] = planAccessGuide();
  // La guía termina en punta de flecha, señalando la entrada.
  return <><path className="ronda-plan-access" d={`M${from[0] + 5} ${from[1]}H${from[0]}V${to[1]}m-5 -7l5 7l5 -7`} />{clubPlan.courts.map((court) => {
    const [x, y] = project("plan", court.x + court.width / 2, court.y + court.height);
    return <line key={court.id} className="ronda-plan-leader" data-court-id={court.id} x1={x} y1={y} x2={x} y2={round(bottom)} />;
  })}</>;
}

/**
 * Isométrico: línea de cada etiqueta, tendida sobre el suelo en el eje largo de la cancha. Siempre visible; con la
 * cancha elegida pasa a tinta y queda unida al anillo.
 */
function IsoLeads() {
  return <>{clubPlan.courts.map((court) => {
    const [from, to] = isoLead(court).map(([x, y]) => project("iso", x, y));
    return <line key={court.id} className="ronda-plan-lead" data-court-id={court.id} x1={round(from[0])} y1={round(from[1])} x2={round(to[0])} y2={round(to[1])} />;
  })}</>;
}

const surfaceOf = (id: string) => courtContent.find((court) => court.id === id)?.surface === "Dura" ? "hard" : "clay";

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
