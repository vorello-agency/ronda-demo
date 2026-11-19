import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COURT_IDS, demoUnit, freeCourtsAt, freeHoursFor, isFree, nearestFreeHour } from "./availability.ts";
import { applyChange, revalidate, type Alternative } from "./conflicts.ts";
import { HOURS, addDays, horizonDates, type Hour, type IsoDate } from "./club-time.ts";
import { FUTURE_DATES, NOW, contextAt, findScenario } from "./test-utils.ts";
import type { CourtId, Selection } from "./types.ts";

const ctx = contextAt();
const TODAY = "2026-11-06";
const empty = (date: IsoDate): Selection => ({ date, court: null, hour: null });

/** Hora ocupada para una cancha, con otra cancha libre y con algún horario libre en esa cancha. */
const busyForCourt = () =>
  findScenario((date, hour) => {
    const court = COURT_IDS.find((id) => !isFree(date, id, hour, ctx) && freeHoursFor(date, id, ctx).length > 0);
    return court && freeCourtsAt(date, hour, ctx).length > 0 ? { date, hour, court } : null;
  });

const alternativesAreFree = (date: IsoDate, alternatives: Alternative[]) =>
  alternatives.every((alternative) => isFree(date, alternative.court, alternative.hour, ctx));

describe("applyChange · cancha y horario en cualquier orden", () => {
  it("con una hora elegida, elegir una cancha ocupada libera la hora y ofrece alternativas", () => {
    const { date, hour, court } = busyForCourt();
    const outcome = applyChange({ date, court: null, hour }, { type: "court", court }, ctx);
    assert.deepEqual(outcome.selection, { date, court, hour: null });
    assert.equal(outcome.notice?.kind, "court-busy");
    if (outcome.notice?.kind !== "court-busy") return;
    assert.deepEqual(outcome.notice.alternatives[0], { court, hour: nearestFreeHour(date, court, hour, ctx) });
    assert.deepEqual(outcome.notice.alternatives[1], { court: freeCourtsAt(date, hour, ctx)[0], hour });
    assert.ok(alternativesAreFree(date, outcome.notice.alternatives));
  });

  it("con una cancha elegida, activar una hora tachada no cambia nada, avisa y ofrece primero otra cancha", () => {
    const { date, hour, court } = busyForCourt();
    const selection = { date, court, hour: null };
    const outcome = applyChange(selection, { type: "hour", hour }, ctx);
    assert.equal(outcome.selection, selection);
    assert.equal(outcome.notice?.kind, "hour-busy");
    if (outcome.notice?.kind !== "hour-busy") return;
    assert.deepEqual(outcome.notice.alternatives[0], { court: freeCourtsAt(date, hour, ctx)[0], hour });
    assert.deepEqual(outcome.notice.alternatives[1], { court, hour: nearestFreeHour(date, court, hour, ctx) });
    assert.ok(alternativesAreFree(date, outcome.notice.alternatives));
  });

  it("«Todas» deja la cancha sin elegir y conserva la hora, sin avisos", () => {
    const { date, hour, court } = findScenario((day, h) => {
      const free = freeCourtsAt(day, h, ctx)[0];
      return free ? { date: day, hour: h, court: free } : null;
    });
    assert.deepEqual(applyChange({ date, court, hour }, { type: "court", court: null }, ctx), { selection: { date, court: null, hour }, notice: null });
  });

  it("si cancha y hora son compatibles, se conservan sin avisos, en cualquier orden", () => {
    const { date, hour, court } = findScenario((day, h) => {
      const free = freeCourtsAt(day, h, ctx)[0];
      return free ? { date: day, hour: h, court: free } : null;
    });
    const hourFirst = applyChange(applyChange(empty(date), { type: "hour", hour }, ctx).selection, { type: "court", court }, ctx);
    const courtFirst = applyChange(applyChange(empty(date), { type: "court", court }, ctx).selection, { type: "hour", hour }, ctx);
    assert.deepEqual(hourFirst, { selection: { date, court, hour }, notice: null });
    assert.deepEqual(courtFirst, { selection: { date, court, hour }, notice: null });
  });

  it("una hora donde no queda ninguna cancha no se puede elegir", () => {
    const { date, hour } = findScenario((day, h) => (freeCourtsAt(day, h, ctx).length === 0 ? { date: day, hour: h } : null));
    const selection = empty(date);
    const outcome = applyChange(selection, { type: "hour", hour }, ctx);
    assert.equal(outcome.selection, selection);
    assert.deepEqual(outcome.notice, { kind: "hour-full", hour });
  });

  it("una hora que ya empezó no se puede elegir", () => {
    const selection = empty(TODAY);
    const outcome = applyChange(selection, { type: "hour", hour: 9 }, ctx);
    assert.equal(outcome.selection, selection);
    assert.deepEqual(outcome.notice, { kind: "hour-expired", hour: 9, reason: "past" });
  });
});

describe("applyChange · cambio de día", () => {
  const pair = () => {
    for (const first of FUTURE_DATES) for (const second of FUTURE_DATES) {
      if (first === second) continue;
      for (const hour of HOURS) for (const court of COURT_IDS) {
        if (isFree(first, court, hour, ctx) && !isFree(second, court, hour, ctx) && freeCourtsAt(second, hour, ctx).length > 0) return { first, second, hour, court };
      }
    }
    throw new Error("sin escenario");
  };

  it("conserva la cancha y libera la hora si ya no hay lugar el otro día", () => {
    const { first, second, hour, court } = pair();
    const outcome = applyChange({ date: first, court, hour }, { type: "date", date: second }, ctx);
    assert.deepEqual(outcome.selection, { date: second, court, hour: null });
    assert.deepEqual(outcome.notice, { kind: "date-no-room", date: second, hour, court, reason: "unavailable" });
  });

  it("conserva la hora si sigue habiendo lugar", () => {
    const { first, hour, court } = pair();
    const stillFree = FUTURE_DATES.find((date) => date !== first && isFree(date, court, hour, ctx));
    assert.ok(stillFree);
    const outcome = applyChange({ date: first, court, hour }, { type: "date", date: stillFree }, ctx);
    assert.deepEqual(outcome, { selection: { date: stillFree, court, hour }, notice: null });
  });

  it("sin cancha elegida, la hora se pierde solo si el otro día está completo", () => {
    const { date, hour } = findScenario((day, h) => (freeCourtsAt(day, h, ctx).length === 0 ? { date: day, hour: h } : null));
    const other = FUTURE_DATES.find((day) => day !== date && freeCourtsAt(day, hour, ctx).length > 0);
    assert.ok(other);
    const outcome = applyChange({ date: other, court: null, hour }, { type: "date", date }, ctx);
    assert.deepEqual(outcome.selection, { date, court: null, hour: null });
    assert.deepEqual(outcome.notice, { kind: "date-no-room", date, hour, court: null, reason: "unavailable" });
  });

  it("volver a hoy con una hora que ya empezó la libera con el motivo «past»", () => {
    const outcome = applyChange({ date: addDays(TODAY, 1), court: null, hour: 9 }, { type: "date", date: TODAY }, ctx);
    assert.deepEqual(outcome.selection, { date: TODAY, court: null, hour: null });
    assert.deepEqual(outcome.notice, { kind: "date-no-room", date: TODAY, hour: 9, court: null, reason: "past" });
  });

  it("ignora días fuera del horizonte", () => {
    const selection = empty(TODAY);
    for (const date of ["2026-11-05", "2026-11-20", "2027-01-01", "2020-01-01"]) {
      const outcome = applyChange(selection, { type: "date", date }, ctx);
      assert.equal(outcome.selection, selection, date);
      assert.equal(outcome.notice, null);
    }
  });
});

describe("applyChange · alternativas ofrecidas", () => {
  it("elegir una alternativa fija cancha y hora de una vez", () => {
    const { date, hour, court } = busyForCourt();
    const { notice } = applyChange({ date, court: null, hour }, { type: "court", court }, ctx);
    assert.equal(notice?.kind, "court-busy");
    if (notice?.kind !== "court-busy") return;
    const chosen = notice.alternatives[0];
    const outcome = applyChange({ date, court, hour: null }, { type: "pick", ...chosen }, ctx);
    assert.deepEqual(outcome, { selection: { date, court: chosen.court, hour: chosen.hour }, notice: null });
  });

  it("si la alternativa dejó de estar libre, avisa y no cambia nada", () => {
    const { date, hour, court } = busyForCourt();
    const selection = empty(date);
    const outcome = applyChange(selection, { type: "pick", court, hour }, ctx);
    assert.equal(outcome.selection, selection);
    assert.deepEqual(outcome.notice, { kind: "pick-unavailable", court, hour });
  });
});

describe("revalidate · la página queda abierta", () => {
  it("si nada cambió devuelve la misma selección", () => {
    const { date, hour, court } = findScenario((day, h) => {
      const free = freeCourtsAt(day, h, ctx)[0];
      return free ? { date: day, hour: h, court: free } : null;
    });
    const selection: Selection = { date, court, hour };
    const outcome = revalidate(selection, ctx);
    assert.equal(outcome.selection, selection);
    assert.equal(outcome.notice, null);
  });

  it("si el turno elegido empieza, se libera la hora", () => {
    const later = contextAt(Date.UTC(2026, 10, 6, 14, 5)); // 11:05 en el club
    const outcome = revalidate({ date: TODAY, court: null, hour: 11 }, later);
    assert.deepEqual(outcome.selection, { date: TODAY, court: null, hour: null });
    assert.deepEqual(outcome.notice, { kind: "hour-expired", hour: 11, reason: "past" });
  });

  it("si el día elegido ya pasó, pasa a la fecha por defecto y conserva la cancha", () => {
    const outcome = revalidate({ date: "2026-11-05", court: "02", hour: 9 }, ctx);
    assert.deepEqual(outcome.selection, { date: TODAY, court: "02", hour: null });
    assert.deepEqual(outcome.notice, { kind: "date-expired", date: "2026-11-05" });
  });

  it("después de la última hora del día, la fecha por defecto es mañana", () => {
    const night = contextAt(Date.UTC(2026, 10, 7, 0, 30)); // 21:30 del 6 en el club
    const outcome = revalidate({ date: "2026-11-05", court: null, hour: null }, night);
    assert.equal(outcome.selection.date, "2026-11-07");
  });

  it("si el turno pasó a ser propio, ya no está libre", () => {
    const { date, hour, court } = findScenario((day, h) => {
      const free = freeCourtsAt(day, h, ctx)[0];
      return free ? { date: day, hour: h, court: free } : null;
    });
    const booked = contextAt(NOW, [{ date, court, hour }]);
    const outcome = revalidate({ date, court, hour }, booked);
    assert.deepEqual(outcome.selection, { date, court, hour: null });
    assert.deepEqual(outcome.notice, { kind: "hour-expired", hour, reason: "unavailable" });
  });
});

describe("invariantes bajo cambios arbitrarios", () => {
  it("después de cualquier secuencia de cambios la selección es válida y las alternativas están libres", () => {
    const dates = horizonDates(NOW);
    const pick = <T,>(items: readonly T[], step: number, salt: string): T => items[Math.floor(demoUnit(`fuzz|${salt}|${step}`) * items.length)];
    let selection = empty(TODAY);
    const seen = new Set<string>();
    for (let step = 0; step < 3000; step++) {
      const kind = pick(["date", "court", "hour", "pick"] as const, step, "kind");
      const date = pick(dates.concat(["2026-11-05", "2026-11-20"]), step, "date");
      const court: CourtId = pick(COURT_IDS, step, "court");
      const hour: Hour = pick(HOURS, step, "hour");
      // A veces la cancha es «Todas» (null): el control sobre la grilla puede dejarla sin elegir.
      const filter: CourtId | null = pick([...COURT_IDS, null], step, "filter");
      const change = kind === "date" ? { type: kind, date } : kind === "court" ? { type: kind, court: filter } : kind === "hour" ? { type: kind, hour } : { type: kind, court, hour };
      const outcome = applyChange(selection, change, ctx);
      selection = outcome.selection;
      if (outcome.notice) seen.add(outcome.notice.kind);

      assert.ok(dates.includes(selection.date), `día fuera del horizonte: ${selection.date}`);
      if (selection.hour !== null) {
        const works = selection.court ? isFree(selection.date, selection.court, selection.hour, ctx) : freeCourtsAt(selection.date, selection.hour, ctx).length > 0;
        assert.ok(works, `selección inválida en el paso ${step}: ${JSON.stringify(selection)}`);
      }
      if (outcome.notice && "alternatives" in outcome.notice) assert.ok(alternativesAreFree(selection.date, outcome.notice.alternatives));
      assert.equal(revalidate(selection, ctx).selection, selection, "una selección válida no cambia al revalidar");
    }
    // Que la prueba no pase en vacío: tiene que haber provocado los conflictos principales.
    for (const kind of ["court-busy", "hour-busy", "date-no-room", "pick-unavailable", "hour-full", "hour-expired"]) assert.ok(seen.has(kind), `la secuencia nunca produjo «${kind}»`);
  });
});
