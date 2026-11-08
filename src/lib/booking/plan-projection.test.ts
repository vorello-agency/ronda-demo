import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clubPlan } from "../../data/club-plan.ts";
import {
  HEIGHTS, PLAN_VIEWS, ROOF_OVERHANG, courtMarkings, courtTagAnchors, groundTransform, lightPoles, mapNotes,
  points, project, roofHeight, toPercent, viewBox, viewBoxAttribute, type PlanView, type Vec2,
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

  it("en el isométrico el acceso al sudoeste queda más abajo que cualquier cancha", () => {
    const [, entrance] = project("iso", clubPlan.entrance.x, clubPlan.entrance.y);
    for (const court of clubPlan.courts) for (const [x, y] of corners(court)) assert.ok(project("iso", x, y)[1] < entrance, court.id);
  });

  it("la altura sube en pantalla en ambas vistas", () => {
    for (const view of PLAN_VIEWS) assert.ok(project(view, 40, 40, 5)[1] < project(view, 40, 40, 0)[1], view);
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
        ...corners(roof, roofHeight(view)),
        ...lightPoles().map(([x, y]) => [x, y, HEIGHTS.lightPole] as const),
      ];
      for (const [x, y, z] of shapes) assert.ok(inside(view, project(view, x, y, z)), `${view} (${x}, ${y}, ${z})`);
    });
  }

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

  it("los rótulos quedan dentro del dibujo en ambas vistas", () => {
    for (const view of PLAN_VIEWS) {
      const notes = mapNotes(view);
      assert.deepEqual(notes.map((note) => note.label), ["Pabellón", "Acceso"]);
      for (const note of notes) assert.ok(note.x >= 0 && note.x <= 100 && note.y >= 0 && note.y <= 100, `${view} ${note.label}`);
    }
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

  it("hay columnas de luz a los lados de cada cancha, sin pisarlas", () => {
    const poles = lightPoles();
    assert.equal(poles.length, (clubPlan.courts.length + 1) * 2);
    for (const [x, y] of poles) {
      for (const court of clubPlan.courts) assert.ok(!(x > court.x && x < court.x + court.width && y > court.y && y < court.y + court.height));
    }
  });

  it("points() redondea a un decimal", () => {
    assert.equal(points("plan", [[1.234, 2.345], [3, 4, 1]]), "12.3,23.5 30,27.5");
  });
});
