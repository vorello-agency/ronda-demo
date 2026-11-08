import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { clubPlan } from "./club-plan.ts";
import { courts } from "./courts.ts";

const { site, pavilion, courts: plan, paths, entrance } = clubPlan;
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

  it("hay un solo pabellón de una planta, al norte de las tres canchas", () => {
    assert.equal(pavilion.levels, 1);
    for (const court of plan) assert.ok(pavilion.y + pavilion.height < court.y);
  });

  it("todo cabe en el terreno y el acceso queda al sudoeste", () => {
    for (const element of [pavilion, ...plan, ...paths]) assert.ok(inside(element), "dentro del terreno");
    assert.ok(entrance.x < plan[0].x);
    assert.ok(entrance.y > plan[0].y + plan[0].height);
    assert.ok(entrance.x <= site.width && entrance.y <= site.height);
  });

  const jsonPath = fileURLToPath(new URL("../../docs/exploracion/refinamiento-b/geometria-club.json", import.meta.url));
  // La referencia es obligatoria: si el archivo se mueve o se borra, la prueba falla en lugar de omitirse.
  it("coincide con docs/exploracion/refinamiento-b/geometria-club.json", () => {
    assert.ok(existsSync(jsonPath), `No se encontró la referencia espacial en ${jsonPath}. Si se movió, actualizá la ruta en esta prueba.`);
    const reference = JSON.parse(readFileSync(jsonPath, "utf8"));
    // Un elemento espacial nuevo en el JSON (otra cancha, una piscina…) tiene que revisarse acá y en club-plan.ts.
    const spatial = ["site", "pavilion", "courts", "paths", "entrance"];
    const descriptive = ["status", "units", "coordinates", "selectedCourt", "viewpoints", "invariants"];
    assert.deepEqual(Object.keys(reference).filter((key) => ![...spatial, ...descriptive].includes(key)), [], "el JSON tiene claves nuevas sin contemplar");
    assert.deepEqual(site, { width: reference.site.width, height: reference.site.height });
    assert.deepEqual(pavilion, { x: reference.pavilion.x, y: reference.pavilion.y, width: reference.pavilion.width, height: reference.pavilion.height, levels: reference.pavilion.levels });
    assert.deepEqual(plan, reference.courts.map(({ id, x, y, width, height }: Record<string, unknown>) => ({ id, x, y, width, height })));
    assert.deepEqual(reference.courts.map((court: { name: string }) => court.name), courts.map((court) => court.name));
    assert.deepEqual(paths, reference.paths);
    assert.deepEqual(entrance, { x: reference.entrance.x, y: reference.entrance.y });
  });
});
