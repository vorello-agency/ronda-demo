import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COURT_IDS, freeCourtsAt, isFree, slotStatus } from "./availability.ts";
import { confirmSelection } from "./bookings.ts";
import { FUTURE_DATES, NOW, contextAt, findScenario } from "./test-utils.ts";

const ctx = contextAt();
const freeSlot = () =>
  findScenario((date, hour) => {
    const court = freeCourtsAt(date, hour, ctx)[0];
    return court ? { date, hour, court } : null;
  });

describe("confirmSelection", () => {
  it("confirma un turno libre y lo agrega a las reservas", () => {
    const { date, hour, court } = freeSlot();
    const result = confirmSelection({ date, court, hour }, ctx);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.booking, { date, court, hour });
    assert.deepEqual(result.bookings, [{ date, court, hour }]);
    assert.equal(result.repeated, false);
    assert.equal(slotStatus(date, court, hour, contextAt(NOW, result.bookings)), "yours");
  });

  it("es idempotente: confirmar dos veces no duplica la reserva", () => {
    const { date, hour, court } = freeSlot();
    const first = confirmSelection({ date, court, hour }, ctx);
    assert.ok(first.ok);
    const again = confirmSelection({ date, court, hour }, contextAt(NOW, first.bookings));
    assert.ok(again.ok);
    assert.equal(again.repeated, true);
    assert.equal(again.bookings, first.bookings, "mismo arreglo, sin copias");
    assert.equal(again.bookings.length, 1);
  });

  it("otro turno se suma a las reservas de la visita", () => {
    const first = freeSlot();
    const second = findScenario((date, hour) => {
      const court = freeCourtsAt(date, hour, ctx).find((id) => !(date === first.date && hour === first.hour && id === first.court));
      return court && !(date === first.date && hour === first.hour) ? { date, hour, court } : null;
    });
    const one = confirmSelection(first, ctx);
    assert.ok(one.ok);
    const two = confirmSelection(second, contextAt(NOW, one.bookings));
    assert.ok(two.ok);
    assert.equal(two.bookings.length, 2);
  });

  it("rechaza una selección incompleta", () => {
    const date = FUTURE_DATES[0];
    assert.deepEqual(confirmSelection({ date, court: null, hour: 12 }, ctx), { ok: false, reason: "incomplete" });
    assert.deepEqual(confirmSelection({ date, court: "02", hour: null }, ctx), { ok: false, reason: "incomplete" });
  });

  it("rechaza un turno que ya empezó", () => {
    assert.deepEqual(confirmSelection({ date: "2026-11-06", court: "02", hour: 9 }, ctx), { ok: false, reason: "past" });
  });

  it("rechaza un turno que dejó de estar libre", () => {
    const { date, hour, court } = findScenario((day, h) => {
      const taken = COURT_IDS.find((id) => !isFree(day, id, h, ctx));
      return taken ? { date: day, hour: h, court: taken } : null;
    });
    assert.deepEqual(confirmSelection({ date, court, hour }, ctx), { ok: false, reason: "unavailable" });
  });
});
