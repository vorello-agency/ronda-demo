import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COURT_IDS, hourAvailability, isFree } from "./availability.ts";
import { busyAttribute, planStateAttributes } from "./plan-state.ts";
import { NOW, contextAt, findScenario } from "./test-utils.ts";

const ctx = contextAt();

describe("planStateAttributes · contrato con los dibujos del servidor", () => {
  it("sin selección no escribe ningún atributo", () => {
    assert.deepEqual(planStateAttributes({ date: "2026-11-07", court: null, hour: null }, ctx), {});
  });

  it("con una cancha elegida escribe solo data-court", () => {
    assert.deepEqual(planStateAttributes({ date: "2026-11-07", court: "02", hour: null }, ctx), { "data-court": "02" });
  });

  it("con una hora elegida escribe las canchas sin lugar, en el orden del plano y separadas por espacios", () => {
    const { date, hour } = findScenario((day, h) => (hourAvailability(day, h, ctx).busy.length >= 2 ? { date: day, hour: h } : null));
    const attributes = planStateAttributes({ date, court: null, hour }, ctx);
    assert.equal(attributes["data-busy"], hourAvailability(date, hour, ctx).busy.join(" "));
    assert.ok(/^\d{2}( \d{2})*$/.test(attributes["data-busy"] ?? ""));
    assert.equal("data-court" in attributes, false);
  });

  it("omite data-busy cuando las tres canchas están libres", () => {
    const { date, hour } = findScenario((day, h) => (hourAvailability(day, h, ctx).busy.length === 0 ? { date: day, hour: h } : null));
    assert.deepEqual(planStateAttributes({ date, court: null, hour }, ctx), {});
  });

  it("incluye el turno propio entre las canchas sin lugar", () => {
    const { date, hour, court } = findScenario((day, h) => {
      const free = COURT_IDS.find((id) => isFree(day, id, h, ctx));
      return free ? { date: day, hour: h, court: free } : null;
    });
    const attributes = planStateAttributes({ date, court, hour }, contextAt(NOW, [{ date, court, hour }]));
    assert.equal(attributes["data-court"], court);
    assert.ok(attributes["data-busy"]?.split(" ").includes(court));
  });
});

describe("busyAttribute", () => {
  it("devuelve undefined para una lista vacía, así el atributo no se escribe", () => {
    assert.equal(busyAttribute([]), undefined);
    assert.equal(busyAttribute(["01"]), "01");
    assert.equal(busyAttribute(["01", "03"]), "01 03");
  });
});
