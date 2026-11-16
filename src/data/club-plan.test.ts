import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clubPlan } from "./club-plan.ts";
import { courts } from "./courts.ts";

const { site, pavilion, courts: plan, paths, entrance, pavilionExit, boundary } = clubPlan;
const inside = (rect: { x: number; y: number; width: number; height: number }) =>
  rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= site.width && rect.y + rect.height <= site.height;
const overlaps = (a: typeof plan[number], b: typeof plan[number]) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe("geometría del club", () => {
  it("tiene exactamente las tres canchas de courts.ts, en el mismo orden", () => {
    assert.deepEqual(plan.map((court) => court.id), courts.map((court) => court.id));
    assert.deepEqual(plan.map((court) => court.id), ["01", "02", "03"]);
  });

  it("las canchas son paralelas, de igual huella y sin superponerse", () => {
    assert.equal(new Set(plan.map((court) => court.y)).size, 1);
    assert.equal(new Set(plan.map((court) => court.width)).size, 1);
    assert.equal(new Set(plan.map((court) => court.height)).size, 1);
    for (const court of plan) assert.ok(court.height > court.width, "el eje largo va de norte a sur");
    plan.forEach((court, index) => {
      if (index > 0) assert.ok(court.x > plan[index - 1].x, "de oeste a este");
      plan.slice(index + 1).forEach((other) => assert.equal(overlaps(court, other), false));
    });
  });

  it("un jardín ancho separa la primera cancha; las otras dos quedan a un seto de distancia", () => {
    const gaps = plan.slice(1).map((court, index) => court.x - (plan[index].x + plan[index].width));
    assert.deepEqual(gaps, [12, 6]);
  });

  it("Jardín sobresale del pabellón hacia el este; las demás quedan frente a él", () => {
    const pavilionEast = pavilion.x + pavilion.width;
    for (const court of plan) {
      const { name } = courts.find((item) => item.id === court.id)!;
      assert.ok(court.x >= pavilion.x, `${name} no empieza antes que el pabellón`);
      if (name === "Jardín") assert.equal(court.x + court.width - pavilionEast, 6);
      else assert.ok(court.x + court.width <= pavilionEast, `${name} queda frente al pabellón`);
    }
  });

  it("la galería norte cubre las tres canchas y no quedan otros caminos que la terraza de entrada", () => {
    assert.deepEqual(paths.map((path) => path.id), ["galeria-norte", "terraza-entrada"]);
    const gallery = paths[0];
    assert.ok(gallery.x < Math.min(...plan.map((court) => court.x)) && gallery.x + gallery.width > Math.max(...plan.map((court) => court.x + court.width)));
    assert.ok(gallery.y >= pavilion.y + pavilion.height && gallery.y + gallery.height <= plan[0].y, "entre el pabellón y las canchas");
  });

  it("hay un solo pabellón de una planta, al norte de las tres canchas", () => {
    assert.equal(pavilion.levels, 1);
    for (const court of plan) assert.ok(pavilion.y + pavilion.height < court.y);
  });

  it("todo cabe en el terreno, dentro de su límite", () => {
    for (const element of [pavilion, ...plan, ...paths]) {
      assert.ok(inside(element), "dentro del terreno");
      assert.ok(element.x >= boundary.west && element.x + element.width <= boundary.east, "dentro del límite");
    }
  });

  it("recorrido único: portón junto al extremo oeste del pabellón, terraza de entrada, pabellón y salida a la galería", () => {
    const entry = paths.find((path) => path.id === "terraza-entrada")!;
    const gallery = paths.find((path) => path.id === "galeria-norte")!;
    // El portón está en el límite oeste, a la altura del pabellón, y da a la terraza de entrada.
    assert.equal(entrance.x, boundary.west);
    assert.ok(entrance.y > pavilion.y && entrance.y < pavilion.y + pavilion.height);
    assert.equal(entry.x, boundary.west);
    assert.ok(entrance.y > entry.y && entrance.y < entry.y + entry.height);
    assert.ok(entry.x + entry.width <= pavilion.x && pavilion.x - (entry.x + entry.width) <= 2, "la terraza llega al pabellón");
    // La salida a la galería es otro punto: está en la fachada sur, en el extremo oeste, antes de la primera cancha.
    assert.equal(pavilionExit.y, pavilion.y + pavilion.height);
    assert.ok(pavilionExit.x > pavilion.x && pavilionExit.x < plan[0].x + plan[0].width / 2);
    assert.ok(pavilionExit.x > gallery.x && pavilionExit.x < gallery.x + gallery.width);
    assert.notDeepEqual(entrance, pavilionExit);
  });
});
