import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { courts } from "../../data/courts.ts";
import { HOUR_PERIODS, alternativeLabel, correctionText, courtName, dayLabel, formatHour, formatRange, joinList, slotEndText, longDayLabel, noticeText } from "./copy.ts";
import type { Notice } from "./conflicts.ts";
import type { Correction } from "./selection.ts";
import { HOURS } from "./club-time.ts";
import { NOW } from "./test-utils.ts";

describe("formatos", () => {
  it("formatea horas y rangos de 60 minutos", () => {
    assert.equal(formatHour(8), "08:00");
    assert.equal(formatHour(19), "19:00");
    assert.equal(formatRange(8), "08:00 a 09:00");
    assert.equal(formatRange(21), "21:00 a 22:00");
    assert.equal(slotEndText(8), "Hasta las 09:00");
    assert.equal(slotEndText(21), "Hasta las 22:00");
  });

  it("nombra los días: «Hoy» para el actual y «Vie 06» para el resto", () => {
    assert.equal(dayLabel("2026-11-06", NOW), "Hoy");
    assert.equal(dayLabel("2026-11-07", NOW), "Sáb 07");
    assert.equal(dayLabel("2026-11-15", NOW), "Dom 15");
    assert.equal(longDayLabel("2026-11-06"), "viernes 6 de noviembre");
    assert.equal(longDayLabel("2026-12-01"), "martes 1 de diciembre");
  });

  it("une listas con coma y «y»", () => {
    assert.equal(joinList([]), "");
    assert.equal(joinList(["Central"]), "Central");
    assert.equal(joinList(["Central", "Club"]), "Central y Club");
    assert.equal(joinList(["Central", "Jardín", "Club"]), "Central, Jardín y Club");
  });

  it("las franjas de horarios cubren todas las horas, en orden y una sola vez", () => {
    assert.deepEqual(HOUR_PERIODS.flatMap((period) => period.hours), [...HOURS]);
    assert.deepEqual(HOUR_PERIODS.map((period) => period.label), ["Mañana", "Tarde", "Noche"]);
  });

  it("los nombres de cancha salen de courts.ts", () => {
    for (const court of courts) assert.equal(courtName(court.id), court.name);
    assert.equal(alternativeLabel({ court: "02", hour: 19 }), "Central a las 19:00");
  });
});

describe("textos de avisos y correcciones", () => {
  const notices: Notice[] = [
    { kind: "court-busy", court: "01", hour: 19, alternatives: [] },
    { kind: "hour-busy", court: "01", hour: 19, alternatives: [] },
    { kind: "hour-full", hour: 18 },
    { kind: "date-no-room", date: "2026-11-09", hour: 19, court: "02", reason: "unavailable" },
    { kind: "date-no-room", date: "2026-11-09", hour: 19, court: null, reason: "unavailable" },
    { kind: "date-no-room", date: "2026-11-06", hour: 9, court: null, reason: "past" },
    { kind: "pick-unavailable", court: "03", hour: 20 },
    { kind: "date-expired", date: "2026-11-05" },
    { kind: "hour-expired", hour: 11, reason: "past" },
    { kind: "hour-expired", hour: 11, reason: "unavailable" },
  ];
  const corrections: Correction[] = [
    { kind: "date-invalid", value: "x" },
    { kind: "date-past", value: "2020-01-01" },
    { kind: "date-out-of-range", value: "2027-01-01" },
    { kind: "court-invalid", value: "09" },
    { kind: "hour-invalid", value: "99" },
    { kind: "hour-unavailable", hour: 19, court: "01", reason: "unavailable" },
    { kind: "hour-unavailable", hour: 9, court: null, reason: "past" },
  ];

  it("cada aviso tiene un texto completo, con punto final y sin valores sin resolver", () => {
    for (const notice of notices) {
      const text = noticeText(notice);
      assert.ok(text.length > 15 && text.endsWith("."), JSON.stringify(notice));
      assert.ok(!/undefined|null|NaN|\[object/.test(text), text);
    }
  });

  it("cada corrección tiene un texto completo", () => {
    for (const correction of corrections) {
      const text = correctionText(correction);
      assert.ok(text.length > 15 && text.endsWith("."), JSON.stringify(correction));
      assert.ok(!/undefined|null|NaN|\[object/.test(text), text);
    }
  });

  it("los avisos de conflicto dicen qué se conservó y qué se liberó", () => {
    assert.equal(noticeText(notices[0]), "Club está ocupada a las 19:00. Elegí otro horario para Club.");
    assert.equal(noticeText(notices[1]), "Club está ocupada a las 19:00. Elegí otra cancha para ese horario.");
  });
});
