import { clubPlan } from "@/data/club-plan";
import { HEIGHTS, PLAN_VIEWS, pavilionHeight, points, project, type PlanView } from "@/lib/booking/plan-projection";

/**
 * Plano chico de «Cómo llegar» para la confirmación: pabellón, canchas y el recorrido desde el acceso oeste.
 * Se dibuja en el servidor con la misma geometría que el plano principal; el cliente solo escribe `data-court`
 * en el contenedor y el CSS resalta la cancha y su recorrido. Planta por debajo de 1280 px, isométrico desde ahí.
 */
export function ClubWayfindingArt() {
  return <>{PLAN_VIEWS.map((view) => <WayfindingView key={view} view={view} />)}</>;
}

const ACCESS_X = 7;
const GALLERY_Y = 20;
const PAD = 14;

/** Recorrido de una cancha: del acceso al norte por el camino oeste, al este por la galería y hasta la cancha. */
const route = (court: (typeof clubPlan.courts)[number]) =>
  [[clubPlan.entrance.x, clubPlan.entrance.y], [ACCESS_X, GALLERY_Y], [court.x + court.width / 2, GALLERY_Y], [court.x + court.width / 2, court.y]] as const;

function frame(view: PlanView): string {
  const { pavilion, courts, entrance } = clubPlan;
  const top = pavilionHeight(view) + HEIGHTS.slab;
  const corners = [
    project(view, pavilion.x, pavilion.y, top), project(view, pavilion.x + pavilion.width, pavilion.y, top),
    project(view, pavilion.x, pavilion.y + pavilion.height), project(view, entrance.x, entrance.y),
    ...courts.flatMap((court) => [project(view, court.x + court.width, court.y), project(view, court.x + court.width, court.y + court.height), project(view, court.x, court.y + court.height)]),
  ];
  const xs = corners.map(([x]) => x), ys = corners.map(([, y]) => y);
  const x = Math.min(...xs) - PAD, y = Math.min(...ys) - PAD;
  return [x, y, Math.max(...xs) + PAD - x, Math.max(...ys) + PAD - y].map((value) => Math.round(value * 10) / 10).join(" ");
}

function WayfindingView({ view }: { view: PlanView }) {
  const { pavilion, courts } = clubPlan;
  const h = pavilionHeight(view);
  const x1 = pavilion.x, x2 = pavilion.x + pavilion.width, y1 = pavilion.y, y2 = pavilion.y + pavilion.height;
  return <svg className={`ronda-wayfinding-view ronda-wayfinding-view--${view}`} viewBox={frame(view)} aria-hidden="true" focusable="false">
    <g className="w-pavilion">
      {view === "iso" && <polygon points={points(view, [[x1, y1], [x1, y2], [x1, y2, h], [x1, y1, h]])} />}
      <polygon points={points(view, [[x1, y2], [x2, y2], [x2, y2, h], [x1, y2, h]])} />
      <polygon points={points(view, [[x1, y1, h], [x2, y1, h], [x2, y2, h], [x1, y2, h]])} />
    </g>
    {courts.map((court) => <polygon
      key={court.id}
      className="w-court"
      data-court-id={court.id}
      points={points(view, [[court.x, court.y], [court.x + court.width, court.y], [court.x + court.width, court.y + court.height], [court.x, court.y + court.height]])}
    />)}
    {courts.map((court) => <polyline key={court.id} className="w-route" data-court-id={court.id} points={points(view, route(court))} />)}
  </svg>;
}
