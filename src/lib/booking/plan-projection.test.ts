import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { clubPlan } from "../../data/club-plan.ts";
import {
  PLAN_VIEWS, ROOF_OVERHANG, courtMarkings, courtTagAnchors, groundTransform, mapNotes,
  DOOR_WIDTH, EXTERIOR, GATE_WIDTH, courtDoor, courtRoute, exterior, groundBounds, isoBleed, isoLead, isoTagPoint, modelBase, paintedLabels, planAccessGuide, planAccessNote, points, project, roofHeight, toPercent, unproject, viewBox, viewBoxAttribute, type PlanView, type Vec2,
} from "./plan-projection.ts";

const inside = (view: PlanView, [x, y]: Vec2) => {
  const box = viewBox(view);
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
};
const corners = ({ x, y, width, height }: { x: number; y: number; width: number; height: number }, z = 0) =>
  [[x, y, z], [x + width, y, z], [x + width, y + height, z], [x, y + height, z]] as const;

describe("proyección del plano", () => {
  it("la planta conserva el norte arriba y el este a la derecha", () => {
    const [x1, y1] = project("plan", 10, 10);
    const [x2, y2] = project("plan", 20, 30);
    assert.ok(x2 > x1 && y2 > y1);
  });

  it("el encuadre sale del límite del terreno, no de los caminos", () => {
    // Las canchas conservan su tamaño aunque se saquen caminos: estos anchos son los de antes de quitar el del oeste y el del sur.
    assert.equal(viewBox("plan").width, 954);
    assert.equal(viewBox("iso").width, 1583.4);
  });

  it("la altura sube en pantalla en ambas vistas", () => {
    for (const view of PLAN_VIEWS) assert.ok(project(view, 40, 40, 5)[1] < project(view, 40, 40, 0)[1], view);
  });

  it("unproject devuelve el punto del suelo de una coordenada del dibujo", () => {
    for (const view of PLAN_VIEWS) {
      const [x, y] = unproject(view, ...project(view, 37.5, 61.25));
      assert.ok(Math.abs(x - 37.5) < 1e-9 && Math.abs(y - 61.25) < 1e-9, view);
    }
  });

  it("la transformación del suelo coincide con la proyección en z = 0", () => {
    for (const view of PLAN_VIEWS) {
      const [a, b, c, d] = groundTransform(view).slice(7, -1).split(" ").map(Number);
      const [px, py] = project(view, 30, 50);
      assert.ok(Math.abs(a * 30 + c * 50 - px) < 0.01 && Math.abs(b * 30 + d * 50 - py) < 0.01, view);
    }
  });
});

describe("encuadre", () => {
  for (const view of PLAN_VIEWS) {
    it(`${view}: todo lo dibujado entra en el viewBox`, () => {
      const { pavilion } = clubPlan;
      const roof = { x: pavilion.x - ROOF_OVERHANG.sides, y: pavilion.y - ROOF_OVERHANG.sides, width: pavilion.width + 2 * ROOF_OVERHANG.sides, height: pavilion.height + ROOF_OVERHANG.sides + ROOF_OVERHANG.south };
      const shapes = [
        ...clubPlan.courts.flatMap((court) => corners(court)),
        ...clubPlan.paths.flatMap((path) => corners(path)),
        ...corners(groundBounds(view)),
        ...corners(roof, roofHeight(view)),
      ];
      for (const [x, y, z] of shapes) assert.ok(inside(view, project(view, x, y, z)), `${view} (${x}, ${y}, ${z})`);
    });
  }

  it("el suelo dibujado contiene canchas, caminos y pabellón", () => {
    for (const view of PLAN_VIEWS) {
      const ground = groundBounds(view);
      for (const shape of [...clubPlan.courts, ...clubPlan.paths, clubPlan.pavilion]) {
        assert.ok(shape.x >= ground.x && shape.y >= ground.y && shape.x + shape.width <= ground.x + ground.width && shape.y + shape.height <= ground.y + ground.height, view);
      }
    }
  });

  it("la losa de cubierta cubre parte de la galería y deja libre su borde sur", () => {
    const gallery = clubPlan.paths.find((path) => path.id === "galeria-norte")!;
    const edge = clubPlan.pavilion.y + clubPlan.pavilion.height + ROOF_OVERHANG.south;
    assert.ok(edge > gallery.y && edge < gallery.y + gallery.height);
  });

  it("el atributo viewBox es estable y con un decimal", () => {
    for (const view of PLAN_VIEWS) {
      assert.match(viewBoxAttribute(view), /^-?\d+(\.\d)? -?\d+(\.\d)? \d+(\.\d)? \d+(\.\d)?$/);
      assert.equal(viewBoxAttribute(view), viewBoxAttribute(view));
    }
  });

  it("el isométrico es más ancho que alto y la planta casi cuadrada", () => {
    const iso = viewBox("iso");
    const plan = viewBox("plan");
    assert.ok(iso.width / iso.height > 1.5);
    assert.ok(plan.width / plan.height > 0.9 && plan.width / plan.height < 1.3);
  });
});

describe("etiquetas y rótulos", () => {
  const anchors = courtTagAnchors();

  it("hay una etiqueta por cancha, en el orden de courts.ts", () => {
    assert.deepEqual(anchors.map((anchor) => anchor.id), clubPlan.courts.map((court) => court.id));
  });

  it("caen dentro del dibujo y van de oeste a este", () => {
    for (const anchor of anchors) for (const value of [anchor.planX, anchor.isoX, anchor.isoY]) assert.ok(value > 0 && value < 100, `${anchor.id}: ${value}`);
    anchors.forEach((anchor, index) => {
      if (index === 0) return;
      assert.ok(anchor.planX > anchors[index - 1].planX);
      assert.ok(anchor.isoX > anchors[index - 1].isoX);
    });
  });

  it("en el isométrico, cada etiqueta queda por debajo del pie de su cancha", () => {
    for (const anchor of anchors) {
      const court = clubPlan.courts.find((item) => item.id === anchor.id)!;
      const [, foot] = toPercent("iso", project("iso", court.x + court.width / 2, court.y + court.height));
      assert.ok(anchor.isoY > foot, anchor.id);
    }
  });

  it("en el isométrico, la línea de cada etiqueta prolonga el eje de la cancha, baja hacia la derecha y mide lo mismo en las tres", () => {
    const { street, hedge } = exterior();
    const lengths = new Set<number>();
    for (const court of clubPlan.courts) {
      const [from, to] = isoLead(court);
      assert.equal(from[0], court.x + court.width / 2);
      assert.equal(to[0], from[0], "sigue el eje largo, de norte a sur");
      assert.ok(from[1] > court.y + court.height && to[1] > from[1]);
      const a = project("iso", ...from), b = project("iso", ...to);
      const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      assert.ok(Math.abs(angle - 30) < 0.01, `baja 30° hacia la derecha (${angle})`);
      lengths.add(Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 10));
      assert.deepEqual(isoTagPoint(court), b);
      // No pisa la calle ni el seto del oeste, y termina fuera de la base: la etiqueta no queda sobre el dibujo.
      assert.ok(from[0] > hedge[1] && from[0] > street[1]);
      const base = modelBase();
      assert.ok(to[1] > base.y + base.height + 4 && to[0] < base.x + base.width - 1);
      assert.ok(inside("iso", b));
    }
    assert.equal(lengths.size, 1);
  });

  it("puertas de cancha y recorrido salen de una misma referencia", () => {
    const { pavilionExit, paths } = clubPlan;
    const gallery = paths.find((path) => path.id === "galeria-norte")!;
    for (const court of clubPlan.courts) {
      const [from, to] = courtDoor(court);
      assert.ok(Math.abs(to - from - DOOR_WIDTH) < 1e-9);
      assert.ok(Math.abs((from + to) / 2 - (court.x + court.width / 2)) < 1e-9, "centrada en la cancha");
      const route = courtRoute(court);
      // Empieza en la salida del pabellón, sigue la galería y termina en la puerta.
      assert.deepEqual(route[0], [pavilionExit.x, pavilionExit.y]);
      const last = route[route.length - 1];
      assert.ok(last[0] > from && last[0] < to && last[1] === court.y);
      // Continuo y en ángulos rectos: cada tramo cambia una sola coordenada.
      route.slice(1).forEach(([x, y], index) => assert.ok(x === route[index][0] || y === route[index][1], `tramo ${index}`));
      for (const [x, y] of route.slice(1, -1)) assert.ok(y > gallery.y && y < gallery.y + gallery.height && x >= gallery.x && x <= gallery.x + gallery.width, "por la galería");
    }
  });

  it("en la planta «Acceso» va arriba, junto al extremo oeste del pabellón, con una guía corta al portón", () => {
    const [x, y] = planAccessNote();
    const [from, to] = planAccessGuide();
    assert.ok(inside("plan", [x, y]) && inside("plan", from) && inside("plan", to));
    // Fuera de la silueta: por encima del borde norte de la losa.
    assert.ok(y < project("plan", 0, clubPlan.pavilion.y - ROOF_OVERHANG.sides, roofHeight("plan"))[1]);
    const { gate } = exterior();
    assert.ok(to[1] >= project("plan", 0, gate[0])[1] && to[1] <= project("plan", 0, gate[1])[1], "la guía termina en el portón");
    const entry = clubPlan.paths.find((path) => path.id === "terraza-entrada")!;
    // En la mitad oeste de la terraza de entrada: cerca del portón, pero con aire respecto del borde del dibujo.
    assert.ok(from[0] === to[0] && from[0] > project("plan", entry.x + 1, 0)[0] && from[0] < project("plan", entry.x + entry.width / 2, 0)[0], "junto al portón, sobre la terraza de entrada");
    assert.ok(to[1] - from[1] < 190, "guía corta");
  });

  it("en la planta los rótulos son texto sobre el dibujo y quedan adentro", () => {
    const notes = mapNotes("plan");
    assert.deepEqual(notes.map((note) => note.label), ["Pabellón", "Acceso"]);
    for (const note of notes) assert.ok(note.x >= 0 && note.x <= 100 && note.y >= 0 && note.y <= 100, note.label);
    assert.deepEqual(mapNotes("iso"), []);
  });

  it("en el isométrico van pintados: sobre la losa y sobre el camino del acceso, de izquierda a derecha y en subida", () => {
    const labels = paintedLabels();
    assert.deepEqual(labels.map((item) => item.label), ["Pabellón", "Acceso"]);
    const { pavilion, paths } = clubPlan;
    for (const item of labels) {
      const start = project("iso", item.x - item.length / 2, item.y, item.z), end = project("iso", item.x + item.length / 2, item.y, item.z);
      assert.ok(end[0] > start[0] && end[1] < start[1], `${item.label}: se lee hacia la derecha y sube`);
      for (const point of [start, end]) assert.ok(inside("iso", point), item.label);
    }
    const [roof, access] = labels;
    assert.equal(roof.z, roofHeight("iso"));
    assert.ok(roof.x - roof.length / 2 > pavilion.x && roof.x + roof.length / 2 < pavilion.x + pavilion.width);
    assert.ok(roof.y - roof.size > pavilion.y - ROOF_OVERHANG.sides && roof.y < pavilion.y + pavilion.height + ROOF_OVERHANG.south);
    // «Acceso» queda contenido en el pavimento del umbral (vado, portón y terraza de entrada), separado del seto,
    // de la enredadera y del edificio.
    const entry = paths.find((path) => path.id === "terraza-entrada")!;
    const { apron, gate } = exterior();
    assert.ok(access.x - access.length / 2 >= apron && access.x + access.length / 2 <= entry.x + entry.width);
    assert.ok(access.y - access.size * 0.75 - gate[0] >= 0.5 && gate[1] - access.y >= 0.5, "aire a cada lado dentro del portón");
    assert.ok(pavilion.x - ROOF_OVERHANG.sides - (access.x + access.length / 2) >= 1, "separado de la losa y la enredadera");
  });

  it("el exterior queda al oeste del acceso, sobre la base, y el portón coincide con la entrada", () => {
    const { hedge, sidewalk, kerb, street, farKerb, farSidewalk, gate, edge, apron } = exterior();
    assert.ok(street[0] < street[1] && street[1] === kerb[0] && kerb[1] === sidewalk[0] && sidewalk[1] === hedge[0] && hedge[1] < edge);
    assert.ok(Math.abs(street[1] - street[0] - EXTERIOR.street) < 1e-9);
    // Calle completa en profundidad: cordón de los dos lados y una franja de la vereda de enfrente, hasta el borde de la base.
    assert.ok(farSidewalk[0] < farSidewalk[1] && farSidewalk[1] === farKerb[0] && farKerb[1] === street[0]);
    assert.ok(apron > street[0] && apron < kerb[0], "el vado termina dentro de la calzada; sigue la senda");
    const base = modelBase();
    assert.equal(base.x, farSidewalk[0]);
    assert.ok(isoBleed() < 0.065, "el plano no llega al borde de la ventana");
    for (const [x, y, z] of [[base.x, base.y, 0], [base.x, base.y + base.height, -EXTERIOR.base], [base.x + base.width, base.y + base.height, -EXTERIOR.base], [base.x + base.width, base.y, 0]]) {
      assert.ok(inside("iso", project("iso", x, y, z)), `base (${x}, ${y}, ${z})`);
    }
    // El portón está centrado en la entrada, sobre el límite oeste.
    const { entrance } = clubPlan;
    assert.ok(Math.abs((gate[0] + gate[1]) / 2 - entrance.y) < 1e-9 && entrance.x === edge);
    assert.ok(Math.abs(gate[1] - gate[0] - GATE_WIDTH) < 1e-9);
  });

  it("el isométrico sale hacia el margen lo mismo que dice el CSS, para no achicar las canchas", () => {
    const css = readFileSync(fileURLToPath(new URL("../../components/booking/booking.css", import.meta.url)), "utf8");
    const declared = Number(/--iso-bleed:\s*([\d.]+)%/.exec(css)?.[1]);
    assert.ok(Math.abs(declared - isoBleed() * 100) < 0.02, `CSS ${declared} % · geometría ${isoBleed() * 100} %`);
    assert.ok(isoBleed() > 0 && isoBleed() < 0.065);
  });
});

describe("dibujo de las canchas", () => {
  it("las marcas reglamentarias quedan centradas dentro de cada cancha", () => {
    for (const court of clubPlan.courts) {
      const { inner, singles, service, net, center } = courtMarkings(court);
      assert.ok(inner.x > court.x && inner.x + inner.width < court.x + court.width);
      assert.ok(inner.y > court.y && inner.y + inner.height < court.y + court.height);
      assert.ok(Math.abs(inner.x + inner.width / 2 - center) < 0.1);
      assert.ok(Math.abs(inner.y + inner.height / 2 - net) < 0.1);
      assert.ok(singles[0] > inner.x && singles[1] < inner.x + inner.width);
      assert.ok(service[0] > inner.y && service[1] < inner.y + inner.height);
    }
  });

  it("respetan la proporción de una cancha de dobles", () => {
    const { inner } = courtMarkings(clubPlan.courts[0]);
    assert.ok(Math.abs(inner.height / inner.width - 23.77 / 10.97) < 0.02);
  });

  it("points() redondea a un decimal", () => {
    assert.equal(points("plan", [[1.234, 2.345], [3, 4, 1]]), "12.3,23.5 30,27.5");
  });
});
