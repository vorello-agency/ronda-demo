import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { freeCourtsAt } from "./availability.ts";
import { confirmSelection } from "./bookings.ts";
import { applyChange } from "./conflicts.ts";
import { today } from "./club-time.ts";
import { barText, confirmFailedText, confirmationScore, courtOptionLabel, courtStatusText, noticeText, wayfindingText } from "./copy.ts";
import { courtOptions } from "./flow-view.ts";
import { FUTURE_DATES, NOW, contextAt, findScenario } from "./test-utils.ts";

const ctx = contextAt();
const freeSlot = () => findScenario((date, hour) => {
  const court = freeCourtsAt(date, hour, ctx)[0];
  return court ? { date, hour, court } : null;
});

describe("reservas de la visita en el plano", () => {
  it("la cancha reservada figura como «Tu reserva» a esa hora, no como ocupada", () => {
    const slot = freeSlot();
    const result = confirmSelection(slot, ctx);
    assert.ok(result.ok);
    const after = contextAt(NOW, result.bookings);
    const option = courtOptions({ date: slot.date, court: null, hour: slot.hour }, after).find((item) => item.id === slot.court)!;
    assert.equal(option.state, "yours");
    assert.equal(courtStatusText(option), "Tu reserva");
    assert.match(courtOptionLabel(option, slot.hour), /Tu reserva a las \d\d:00\.$/);
  });

  it("después de reservar, ese turno deja de contarse como libre en la cancha", () => {
    const slot = freeSlot();
    const before = courtOptions({ date: slot.date, court: null, hour: null }, ctx).find((item) => item.id === slot.court)!;
    const result = confirmSelection(slot, ctx);
    assert.ok(result.ok);
    const after = courtOptions({ date: slot.date, court: null, hour: null }, contextAt(NOW, result.bookings)).find((item) => item.id === slot.court)!;
    assert.equal(after.freeHours, before.freeHours - 1);
  });
});

describe("barra fija", () => {
  const date = FUTURE_DATES[0];
  it("con cancha y hora resume el turno; si falta algo, lo dice", () => {
    assert.equal(barText({ date, court: "02", hour: 19 }, NOW), "Central · Sáb 07 · 19:00");
    assert.equal(barText({ date: today(NOW), court: "02", hour: 19 }, NOW), "Central · Hoy · 19:00");
    assert.equal(barText({ date, court: "01", hour: null }, NOW), "Club · falta la hora");
    assert.equal(barText({ date, court: null, hour: 9 }, NOW), "09:00 · falta la cancha");
  });

  it("sin nada elegido queda vacía y no se muestra", () => {
    assert.equal(barText({ date, court: null, hour: null }, NOW), "");
  });
});

describe("confirmación", () => {
  it("el marcador muestra cancha, día y hora con su detalle", () => {
    assert.deepEqual(confirmationScore({ date: "2026-11-06", court: "02", hour: 19 }), [
      { label: "Cancha", value: "Central", detail: "02 · Arcilla" },
      { label: "Día", value: "Vie 06", detail: "noviembre" },
      { label: "Hora", value: "19:00", detail: "hasta 20:00" },
    ]);
  });

  it("«Cómo llegar» cuenta las canchas desde el acceso oeste, en el orden del plano", () => {
    assert.match(wayfindingText("01"), /Club es la primera cancha desde el acceso\.$/);
    assert.match(wayfindingText("02"), /Central es la segunda cancha desde el acceso\.$/);
    assert.match(wayfindingText("03"), /Jardín es la tercera cancha desde el acceso\.$/);
    assert.match(wayfindingText("02"), /^Entrá por el acceso oeste y seguí la galería del pabellón\./);
  });

  it("si el turno dejó de estar disponible al confirmar, lo explica", () => {
    assert.equal(confirmFailedText({ date: FUTURE_DATES[0], court: "02", hour: 19 }), "El turno de las 19:00 ya no está disponible. Elegí otro horario.");
  });
});

describe("elegir otra vez un turno propio", () => {
  const slot = freeSlot();
  const booked = confirmSelection(slot, ctx);
  assert.ok(booked.ok);
  const after = contextAt(NOW, booked.bookings);

  it("eligiendo la cancha con la hora ya puesta: «Ya reservaste…» y pide otro horario", () => {
    const outcome = applyChange({ date: slot.date, court: null, hour: slot.hour }, { type: "court", court: slot.court }, after);
    assert.equal(outcome.notice?.kind, "court-busy");
    assert.ok(outcome.notice && "yours" in outcome.notice && outcome.notice.yours);
    assert.match(noticeText(outcome.notice!), /^Ya reservaste \S+ a las \d\d:00\. Elegí otro horario para \S+\.$/);
  });

  it("eligiendo la hora con la cancha ya puesta: «Ya reservaste…» y pide otra cancha", () => {
    const outcome = applyChange({ date: slot.date, court: slot.court, hour: null }, { type: "hour", hour: slot.hour }, after);
    if (outcome.notice?.kind !== "hour-busy") return; // si ninguna otra cancha tiene lugar, el aviso es «completo»
    assert.ok(outcome.notice.yours);
    assert.match(noticeText(outcome.notice), /^Ya reservaste \S+ a las \d\d:00\. Elegí otra cancha para ese horario\.$/);
  });

  it("una cancha ocupada por otros sigue diciendo «está ocupada»", () => {
    const busy = findScenario((date, hour) => {
      const free = freeCourtsAt(date, hour, ctx);
      const other = (["01", "02", "03"] as const).find((id) => !free.includes(id));
      return other && free.length > 0 ? { date, hour, court: other } : null;
    });
    const outcome = applyChange({ date: busy.date, court: null, hour: busy.hour }, { type: "court", court: busy.court }, ctx);
    assert.ok(outcome.notice && !("yours" in outcome.notice));
    assert.match(noticeText(outcome.notice!), /está ocupada a las/);
  });
});
