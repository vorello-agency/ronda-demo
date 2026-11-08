import type { CSSProperties } from "react";
import { clubPlan, type CourtId } from "@/data/club-plan";
import { courts as courtContent } from "@/data/courts";
import {
  HEIGHTS, ROOF_OVERHANG, courtMarkings, groundTransform, lightPoles, mapNotes, pavilionHeight, points, project,
  courtTagAnchors, viewBox, viewBoxAttribute, type PlanView,
} from "@/lib/booking/plan-projection";

const anchors = courtTagAnchors();

/**
 * Posición de la etiqueta de una cancha en ambas vistas, como variables CSS. La usan el esqueleto y,
 * desde E2, los botones de cancha: una sola capa de etiquetas sirve a los dos dibujos.
 */
export function courtTagStyle(id: CourtId): CSSProperties {
  const anchor = anchors.find((item) => item.id === id);
  if (!anchor) throw new Error(`Cancha sin posición en el plano: ${id}`);
  return { "--plan-x": `${anchor.planX}%`, "--iso-x": `${anchor.isoX}%`, "--iso-y": `${anchor.isoY}%` } as CSSProperties;
}

/**
 * Los dos dibujos del club (planta con volumen e isométrico 2.5D). Server Component sin estado: no recibe la
 * selección. El flujo del cliente escribe `data-court` y `data-busy` en el contenedor `.ronda-plan` y el CSS
 * reacciona sobre los elementos de cada cancha (`[data-court-id]`). Ambos dibujos están en el DOM; `@media`
 * muestra la planta por debajo de 1280 px y el isométrico desde 1280 px. Son decorativos: los controles
 * accesibles son las etiquetas de cancha, que viven fuera del SVG.
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
      </defs>
      <Ground view={view} />
      <g className="ronda-plan-volumes"><Volumes view={view} /></g>
      {view === "plan" && <Leaders />}
    </svg>
    {mapNotes(view).map((note) => <span
      key={note.label}
      className={`ronda-plan-note is-${note.placement} is-${note.tone}`}
      style={{ "--x": `${note.x}%`, "--y": `${note.y}%` } as CSSProperties}
      aria-hidden="true"
    >{note.label}{view === "plan" && note.label === "Acceso" && " ↑"}</span>)}
    {view === "plan" && <span className="ronda-plan-north" aria-hidden="true"><i />N</span>}
  </div>;
}

function Ground({ view }: { view: PlanView }) {
  const { pavilion, courts, paths } = clubPlan;
  return <g transform={groundTransform(view)}>
    {/* Franjas verdes del borde sur y este, y sombra del pabellón sobre la galería. */}
    <rect className="g-plant" x="3" y="76.6" width="90" height="3.2" rx="1.6" />
    <rect className="g-plant" x="90.6" y="20" width="3.4" height="54" rx="1.7" />
    {paths.map((path) => <rect key={path.id} className="g-pave" x={path.x} y={path.y} width={path.width} height={path.height} />)}
    <rect className="g-shadow" x={pavilion.x - 2} y={pavilion.y + pavilion.height} width={pavilion.width + 4} height="3.4" />
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
        <rect className="c-ring" x={court.x - 1.4} y={court.y - 1.4} width={court.width + 2.8} height={court.height + 2.8} />
      </g>;
    })}
  </g>;
}

/** Pabellón de una planta con galería en pérgola, redes y columnas de luz. */
function Volumes({ view }: { view: PlanView }) {
  const { pavilion, courts } = clubPlan;
  const h = pavilionHeight(view);
  const top = h + HEIGHTS.slab;
  const x1 = pavilion.x, x2 = pavilion.x + pavilion.width, y1 = pavilion.y, y2 = pavilion.y + pavilion.height;
  const sx1 = x1 - ROOF_OVERHANG.sides, sx2 = x2 + ROOF_OVERHANG.sides, sy1 = y1 - ROOF_OVERHANG.sides, sy2 = y2 + ROOF_OVERHANG.south;
  const poly = (className: string, corners: readonly (readonly [number, number, number?])[], key?: string | number) =>
    <polygon key={key} className={className} points={points(view, corners)} />;
  const seg = (className: string, a: readonly [number, number, number], b: readonly [number, number, number], key?: string | number) => {
    const [ax, ay] = project(view, ...a);
    const [bx, by] = project(view, ...b);
    return <line key={key} className={className} x1={round(ax)} y1={round(ay)} x2={round(bx)} y2={round(by)} />;
  };

  // Fachada sur vidriada en módulos de 4,4, interrumpida por el muro de hormigón del acceso al pabellón.
  const entryWall = [x1 + 31.6, x1 + 39.4] as const;
  const panes: number[] = [];
  for (let x = x1 + 1.2; x < x2 - 1.5; x += 4.4) if (x <= entryWall[0] - 0.6 || x >= entryWall[1] - 0.4) panes.push(round(x, 2));
  const galleryY = [y2 + 1, clubPlan.paths[0].y + clubPlan.paths[0].height] as const;
  const galleryX = [clubPlan.paths[0].x, clubPlan.paths[0].x + clubPlan.paths[0].width] as const;
  const columns: number[] = [];
  for (let x = galleryX[0]; x <= galleryX[1]; x += 8) columns.push(x);
  const slats: number[] = [];
  for (let x = galleryX[0]; x <= galleryX[1] + 0.1; x += 2.5) slats.push(round(x, 2));
  const g = HEIGHTS.gallery;

  return <>
    {view === "iso" && poly("v-west", [[x1, y1], [x1, y2], [x1, y2, h], [x1, y1, h]])}
    {poly("v-face", [[x1, y2], [x2, y2], [x2, y2, h], [x1, y2, h]])}
    {poly("v-band", [[x1, y2, h - 0.85], [x2, y2, h - 0.85], [x2, y2, h], [x1, y2, h]])}
    {panes.map((x) => poly("v-glass", [[x, y2, 0.35], [x + 3.5, y2, 0.35], [x + 3.5, y2, h - 1.1], [x, y2, h - 1.1]], x))}
    {poly("v-band", [[entryWall[0], y2], [entryWall[1], y2], [entryWall[1], y2, h - 0.85], [entryWall[0], y2, h - 0.85]])}
    {view === "iso" && poly("v-slabwest", [[sx1, sy1, h], [sx1, sy2, h], [sx1, sy2, top], [sx1, sy1, top]])}
    {poly("v-slabface", [[sx1, sy2, h], [sx2, sy2, h], [sx2, sy2, top], [sx1, sy2, top]])}
    {poly("v-roof", [[sx1, sy1, top], [sx2, sy1, top], [sx2, sy2, top], [sx1, sy2, top]])}
    {poly("v-parapet", [[x1 + 1, y1 + 1, top], [x2 - 1, y1 + 1, top], [x2 - 1, y2 - 1, top], [x1 + 1, y2 - 1, top]])}
    {[10, 22, 48, 60].map((offset) => poly("v-sky", [[x1 + offset, y1 + 3.2, top], [x1 + offset + 5, y1 + 3.2, top], [x1 + offset + 5, y1 + 6.8, top], [x1 + offset, y1 + 6.8, top]], offset))}
    {columns.map((x) => seg("v-col", [x, galleryY[1], 0], [x, galleryY[1], g], `c${x}`))}
    {slats.map((x) => seg("v-slat", [x, galleryY[0], g], [x, galleryY[1], g], `s${x}`))}
    {seg("v-col", [galleryX[0], galleryY[0], g], [galleryX[1], galleryY[0], g])}
    {seg("v-col", [galleryX[0], galleryY[1], g], [galleryX[1], galleryY[1], g])}
    {courts.map((court) => {
      // Los postes de la red quedan una unidad por fuera de las líneas de dobles.
      const { inner, net } = courtMarkings(court);
      const a = inner.x - 1, b = inner.x + inner.width + 1;
      return <g key={court.id}>
        {poly("v-net", [[a, net], [b, net], [b, net, HEIGHTS.net], [a, net, HEIGHTS.net]])}
        {seg("v-tape", [a, net, HEIGHTS.net], [b, net, HEIGHTS.net])}
      </g>;
    })}
    {lightPoles().map(([x, y]) => {
      const [tx, ty] = project(view, x, y, HEIGHTS.lightPole);
      return <g key={`${x}-${y}`}>
        {seg("v-pole", [x, y, 0], [x, y, HEIGHTS.lightPole])}
        <rect className="v-led" x={round(tx - 7)} y={round(ty - 2)} width="14" height="3" />
      </g>;
    })}
  </>;
}

/** Planta: guía vertical desde el pie de cada cancha hasta su etiqueta. Visible solo en la cancha elegida. */
function Leaders() {
  const bottom = viewBox("plan").y + viewBox("plan").height;
  return <>{clubPlan.courts.map((court) => {
    const [x, y] = project("plan", court.x + court.width / 2, court.y + court.height);
    return <line key={court.id} className="ronda-plan-leader" data-court-id={court.id} x1={x} y1={y} x2={x} y2={round(bottom)} />;
  })}</>;
}

const surfaceOf = (id: string) => courtContent.find((court) => court.id === id)?.surface === "Dura" ? "hard" : "clay";

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
