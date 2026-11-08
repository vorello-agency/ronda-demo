import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { courts } from "../../data/courts.ts";
import { COURT_IDS, DEMO_SEED, busyRate, demoUnit, freeCourtsAt, freeHoursFor, hourAvailability, isFree, nearestFreeHour, slotStatus } from "./availability.ts";
import { HOURS, addDays, isWeekend } from "./club-time.ts";
import { FUTURE_DATES, NOW, contextAt, findScenario } from "./test-utils.ts";
import type { Booking } from "./types.ts";

const ctx = contextAt();
/** Un año y pico de días posteriores a hoy: sin turnos vencidos, solo importa la simulación. */
const YEAR = Array.from({ length: 400 }, (_, index) => addDays("2026-11-07", index));
const rate = (hits: number, total: number) => hits / total;

/** «.» libre, «x» ocupada, una columna por cancha (01 02 03). */
const grid = (date: string) =>
  HOURS.map((hour) => `${String(hour).padStart(2, "0")}:${COURT_IDS.map((court) => (slotStatus(date, court, hour, ctx) === "taken" ? "x" : ".")).join("")}`).join(" ");

describe("demoUnit", () => {
  it("es determinista y cae en [0, 1)", () => {
    assert.equal(demoUnit("ronda"), demoUnit("ronda"));
    for (const key of ["", "a", "ronda-demo-v1|2026-11-09|01|8", "ñ|ü|€"]) {
      const value = demoUnit(key);
      assert.ok(value >= 0 && value < 1, key);
    }
  });

  it("claves casi iguales dan valores distintos", () => {
    assert.notEqual(demoUnit("k|10"), demoUnit("k|11"));
    assert.notEqual(demoUnit("k|01"), demoUnit("k|02"));
  });
});

describe("disponibilidad simulada: contrato de la demo", () => {
  it("es estable: el mismo día siempre se ve igual", () => {
    assert.equal(DEMO_SEED, "ronda-demo-v1");
    assert.equal(grid("2026-11-09"), "08:... 09:x.x 10:... 11:... 12:..x 13:.x. 14:xx. 15:..x 16:.x. 17:... 18:xxx 19:xxx 20:..x 21:x.x");
    assert.equal(grid("2026-11-14"), "08:.xx 09:..x 10:xx. 11:... 12:.xx 13:... 14:..x 15:.xx 16:..x 17:xxx 18:x.x 19:... 20:... 21:x.x");
  });

  it("las tasas de ocupación siguen la franja del día", () => {
    const buckets = new Map<string, { busy: number; total: number; expected: number }>();
    for (const date of YEAR) {
      for (const hour of HOURS) {
        const weekend = isWeekend(date);
        const key = weekend ? (hour < 13 ? "fin de semana, mañana" : "fin de semana, tarde") : hour >= 17 ? "semana, noche" : "semana, día";
        const bucket = buckets.get(key) ?? { busy: 0, total: 0, expected: busyRate(date, hour) };
        for (const court of COURT_IDS) {
          bucket.total++;
          if (slotStatus(date, court, hour, ctx) === "taken") bucket.busy++;
        }
        buckets.set(key, bucket);
      }
    }
    assert.equal(buckets.size, 4);
    for (const [key, { busy, total, expected }] of buckets) {
      assert.ok(Math.abs(rate(busy, total) - expected) < 0.05, `${key}: ${rate(busy, total).toFixed(3)} vs ${expected}`);
    }
  });

  it("la ocupación global queda entre el 35 % y el 50 %", () => {
    let busy = 0;
    let total = 0;
    for (const date of YEAR) for (const hour of HOURS) for (const court of COURT_IDS) {
      total++;
      if (slotStatus(date, court, hour, ctx) === "taken") busy++;
    }
    assert.ok(rate(busy, total) > 0.35 && rate(busy, total) < 0.5, rate(busy, total).toFixed(3));
  });

  it("no hay rachas artificiales: las horas consecutivas y las canchas son independientes", () => {
    let pairs = 0;
    let both = 0;
    let courtPairs = 0;
    let courtBoth = 0;
    for (const date of YEAR) {
      if (isWeekend(date)) continue;
      for (const court of COURT_IDS) {
        for (const hour of [17, 18, 19, 20] as const) {
          if (slotStatus(date, court, hour, ctx) !== "taken") continue;
          pairs++;
          if (slotStatus(date, court, (hour + 1) as 18, ctx) === "taken") both++;
        }
      }
      for (const hour of [17, 18, 19, 20, 21] as const) {
        if (slotStatus(date, "01", hour, ctx) !== "taken") continue;
        courtPairs++;
        if (slotStatus(date, "02", hour, ctx) === "taken") courtBoth++;
      }
    }
    // Sin correlación, la probabilidad condicionada es la tasa de la franja (0,62).
    assert.ok(Math.abs(rate(both, pairs) - 0.62) < 0.07, `horas consecutivas: ${rate(both, pairs).toFixed(3)}`);
    assert.ok(Math.abs(rate(courtBoth, courtPairs) - 0.62) < 0.07, `canchas: ${rate(courtBoth, courtPairs).toFixed(3)}`);
  });

  it("todos los días muestran libres y ocupados, y hay horarios completos en cualquier quincena", () => {
    const fullPerDay: number[] = [];
    for (const date of YEAR) {
      let free = 0;
      let busy = 0;
      let full = 0;
      for (const hour of HOURS) {
        const availability = hourAvailability(date, hour, ctx);
        free += availability.free.length;
        busy += availability.busy.length;
        if (availability.free.length === 0) full++;
      }
      assert.ok(free >= 10, `${date}: solo ${free} turnos libres`);
      assert.ok(busy >= 5, `${date}: solo ${busy} turnos ocupados`);
      fullPerDay.push(full);
    }
    for (let start = 0; start + 14 <= fullPerDay.length; start++) {
      const inWindow = fullPerDay.slice(start, start + 14).reduce((sum, value) => sum + value, 0);
      assert.ok(inWindow >= 3, `ventana desde ${YEAR[start]}: ${inWindow} horarios completos`);
    }
  });
});

describe("slotStatus", () => {
  it("los turnos que ya empezaron figuran como pasados", () => {
    assert.equal(slotStatus("2026-11-06", "02", 10, ctx), "past");
    assert.notEqual(slotStatus("2026-11-06", "02", 11, ctx), "past");
    assert.equal(slotStatus("2026-11-05", "01", 20, ctx), "past");
  });

  it("un turno propio figura como «yours», incluso si la simulación lo daba por ocupado", () => {
    const taken = findScenario((date, hour) => COURT_IDS.filter((court) => slotStatus(date, court, hour, ctx) === "taken").map((court) => ({ date, hour, court }))[0]);
    const mine: Booking = { date: taken.date, court: taken.court, hour: taken.hour };
    assert.equal(slotStatus(taken.date, taken.court, taken.hour, contextAt(NOW, [mine])), "yours");
    assert.equal(isFree(taken.date, taken.court, taken.hour, contextAt(NOW, [mine])), false);
  });

  it("reservar un turno libre lo saca de la lista de libres", () => {
    const free = findScenario((date, hour) => COURT_IDS.filter((court) => isFree(date, court, hour, ctx)).map((court) => ({ date, hour, court }))[0]);
    const withBooking = contextAt(NOW, [{ date: free.date, court: free.court, hour: free.hour }]);
    assert.ok(freeHoursFor(free.date, free.court, ctx).includes(free.hour));
    assert.ok(!freeHoursFor(free.date, free.court, withBooking).includes(free.hour));
  });
});

describe("consultas de disponibilidad", () => {
  it("COURT_IDS sale de courts.ts y respeta el orden del plano", () => {
    assert.deepEqual([...COURT_IDS], courts.map((court) => court.id));
  });

  it("hourAvailability reparte las tres canchas en libres y ocupadas, en orden", () => {
    for (const date of FUTURE_DATES) {
      for (const hour of HOURS) {
        const { free, busy } = hourAvailability(date, hour, ctx);
        assert.deepEqual([...free, ...busy].sort(), [...COURT_IDS]);
        assert.deepEqual(free, COURT_IDS.filter((court) => free.includes(court)));
        assert.deepEqual(freeCourtsAt(date, hour, ctx), free);
      }
    }
  });

  it("los turnos propios cuentan como ocupados para el plano", () => {
    const { date, hour, court } = findScenario((day, h) => (isFree(day, "02", h, ctx) ? { date: day, hour: h, court: "02" as const } : null));
    assert.ok(!hourAvailability(date, hour, contextAt(NOW, [{ date, court, hour }])).free.includes(court));
    assert.ok(hourAvailability(date, hour, contextAt(NOW, [{ date, court, hour }])).busy.includes(court));
  });

  it("nearestFreeHour elige el horario libre más cercano y, ante empate, el más temprano", () => {
    const date = FUTURE_DATES[0];
    const free = freeHoursFor(date, "02", ctx);
    assert.ok(free.length > 2);
    const target = HOURS.find((hour) => !free.includes(hour));
    assert.ok(target !== undefined);
    const nearest = nearestFreeHour(date, "02", target, ctx);
    assert.ok(nearest !== null);
    const best = Math.min(...free.map((hour) => Math.abs(hour - target)));
    assert.equal(Math.abs(nearest - target), best);
    assert.equal(nearest, Math.min(...free.filter((hour) => Math.abs(hour - target) === best)));
  });

  it("nearestFreeHour devuelve null si la cancha no tiene ningún horario libre", () => {
    const date = FUTURE_DATES[0];
    const all: Booking[] = HOURS.map((hour) => ({ date, court: "01", hour }));
    assert.equal(nearestFreeHour(date, "01", 12, contextAt(NOW, all)), null);
    assert.deepEqual(freeHoursFor(date, "01", contextAt(NOW, all)), []);
  });
});
