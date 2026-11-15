import { clubPlan } from "@/data/club-plan";
import { landscape, pineShape } from "@/lib/booking/plan-landscape";
import { PLAN_VIEWS, courtRoute, points, project, roofHeight, type PlanView } from "@/lib/booking/plan-projection";

/**
 * Plano chico de «Cómo llegar» para la confirmación: pabellón, canchas y el recorrido desde la salida del pabellón,
 * por la galería, hasta la puerta de la cancha (`courtRoute`, el mismo trazado del plano principal).
 * Se dibuja en el servidor con la misma geometría que el plano principal; el cliente solo escribe `data-court`
 * en el contenedor y el CSS resalta la cancha y su recorrido. Planta por debajo de 1280 px, isométrico desde ahí.
 * Del paisaje solo queda una insinuación: el contorno de algunos pinos detrás del pabellón y junto a la última cancha.
 */
export function ClubWayfindingArt() {
  return <>{PLAN_VIEWS.map((view) => <WayfindingView key={view} view={view} />)}</>;
}

const PAD = 14;

/** Unos pocos pinos principales del fondo y del borde este, como contorno. */
const hints = (view: PlanView) => landscape(view).pines
  .filter((pine) => pine.tier === "main" && (pine.zone === "treeline" || pine.zone === "east"))
  // El pinar del isométrico tiene muchos más pinos: se toma uno de cada seis.
  .filter((_, index) => index % (view === "iso" ? 6 : 2) === 0)
  .map((pine) => pineShape(view, pine));

function frame(view: PlanView): string {
  const { pavilion, courts } = clubPlan;
  const top = roofHeight(view);
  const corners = [
    project(view, pavilion.x, pavilion.y, top), project(view, pavilion.x + pavilion.width, pavilion.y, top),
    project(view, pavilion.x, pavilion.y + pavilion.height), project(view, clubPlan.pavilionExit.x, clubPlan.pavilionExit.y),
    ...courts.flatMap((court) => [project(view, court.x + court.width, court.y), project(view, court.x + court.width, court.y + court.height), project(view, court.x, court.y + court.height)]),
    ...hints(view).flatMap(({ zone }) => [[zone.x1, zone.y1], [zone.x2, zone.y2]] as const),
  ];
  const xs = corners.map(([x]) => x), ys = corners.map(([, y]) => y);
  const x = Math.min(...xs) - PAD, y = Math.min(...ys) - PAD;
  return [x, y, Math.max(...xs) + PAD - x, Math.max(...ys) + PAD - y].map((value) => Math.round(value * 10) / 10).join(" ");
}

function WayfindingView({ view }: { view: PlanView }) {
  const { pavilion, courts } = clubPlan;
  const h = roofHeight(view);
  const x1 = pavilion.x, x2 = pavilion.x + pavilion.width, y1 = pavilion.y, y2 = pavilion.y + pavilion.height;
  const r = (value: number) => Math.round(value * 10) / 10;
  return <svg className={`ronda-wayfinding-view ronda-wayfinding-view--${view}`} viewBox={frame(view)} aria-hidden="true" focusable="false">
    {/* Van antes que el pabellón, que tiene relleno y tapa los troncos que quedan detrás. */}
    <path className="w-pines" d={hints(view).map(({ base, cx, cy, rx, ry }) =>
      `M${r(base[0])} ${r(base[1])}V${r(cy + ry)}M${r(cx - rx)} ${r(cy)}a${r(rx)} ${r(ry)} 0 1 0 ${r(rx * 2)} 0a${r(rx)} ${r(ry)} 0 1 0 ${r(-rx * 2)} 0`).join("")} />
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
    {courts.map((court) => <polyline key={court.id} className="w-route" data-court-id={court.id} points={points(view, courtRoute(court))} />)}
  </svg>;
}
