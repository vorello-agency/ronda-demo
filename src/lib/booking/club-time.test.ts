import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HORIZON_DAYS, addDays, bookableHours, clubClock, defaultDate, horizonDates, isHour, isWeekend, isWithinHorizon, parseIsoDate, slotStarted, today, weekday } from "./club-time.ts";
import { NOW } from "./test-utils.ts";

describe("clubClock", () => {
  it("convierte un instante a fecha y minutos de Montevideo", () => {
    assert.deepEqual(clubClock(NOW), { date: "2026-11-06", minutes: 10 * 60 + 40 });
  });

  it("respeta el cruce de medianoche UTC: a las 02:30 UTC todavía es el día anterior en el club", () => {
    assert.deepEqual(clubClock(Date.UTC(2026, 10, 7, 2, 30)), { date: "2026-11-06", minutes: 23 * 60 + 30 });
    assert.deepEqual(clubClock(Date.UTC(2026, 10, 7, 3, 0)), { date: "2026-11-07", minutes: 0 });
  });

  it("usa la misma diferencia en verano y en invierno (Uruguay no tiene horario de verano)", () => {
    assert.equal(clubClock(Date.UTC(2027, 0, 15, 15, 0)).minutes, 12 * 60);
    assert.equal(clubClock(Date.UTC(2027, 6, 15, 15, 0)).minutes, 12 * 60);
  });

  it("devuelve medianoche como 00:00 y nunca como 24:00", () => {
    assert.deepEqual(clubClock(Date.UTC(2026, 11, 31, 3, 0)), { date: "2026-12-31", minutes: 0 });
    assert.deepEqual(clubClock(Date.UTC(2028, 1, 29, 3, 0)), { date: "2028-02-29", minutes: 0 });
  });
});

describe("parseIsoDate", () => {
  it("acepta fechas reales, incluido el 29 de febrero bisiesto", () => {
    assert.equal(parseIsoDate("2026-11-06"), "2026-11-06");
    assert.equal(parseIsoDate("2028-02-29"), "2028-02-29");
  });

  it("rechaza lo que no es una fecha del calendario", () => {
    for (const value of ["2026-02-30", "2027-02-29", "2026-13-01", "2026-00-10", "2026-11-31", "2026-1-1", "26-11-06", "abc", "", " 2026-11-06", "2026-11-06T00:00", null, undefined]) {
      assert.equal(parseIsoDate(value), null, String(value));
    }
  });
});

describe("addDays, weekday y isWeekend", () => {
  it("suma días cruzando mes, año y bisiesto", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addDays("2027-02-28", 1), "2027-03-01");
    assert.equal(addDays("2026-11-06", -7), "2026-10-30");
    assert.equal(addDays("2026-11-06", 0), "2026-11-06");
  });

  it("calcula el día de la semana (0 = domingo)", () => {
    assert.equal(weekday("2026-11-06"), 5);
    assert.equal(weekday("2026-11-07"), 6);
    assert.equal(weekday("2026-11-08"), 0);
    assert.deepEqual(["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09"].map(isWeekend), [false, true, true, false]);
  });
});

describe("horizonte", () => {
  it("son 14 días consecutivos que empiezan hoy", () => {
    const dates = horizonDates(NOW);
    assert.equal(dates.length, HORIZON_DAYS);
    assert.equal(dates[0], "2026-11-06");
    assert.equal(dates[13], "2026-11-19");
    dates.forEach((date, index) => assert.equal(date, addDays("2026-11-06", index)));
  });

  it("incluye el último día y excluye el siguiente y el anterior a hoy", () => {
    assert.equal(isWithinHorizon("2026-11-19", NOW), true);
    assert.equal(isWithinHorizon("2026-11-20", NOW), false);
    assert.equal(isWithinHorizon("2026-11-05", NOW), false);
  });

  it("se desplaza con el reloj del club, no con el UTC", () => {
    const lateNightClub = Date.UTC(2026, 10, 7, 2, 30); // 23:30 del 6 en el club
    assert.equal(today(lateNightClub), "2026-11-06");
    assert.equal(horizonDates(lateNightClub)[0], "2026-11-06");
  });
});

describe("turnos", () => {
  it("un turno vence cuando empieza", () => {
    assert.equal(slotStarted("2026-11-06", 10, NOW), true);
    assert.equal(slotStarted("2026-11-06", 11, NOW), false);
    assert.equal(slotStarted("2026-11-06", 11, Date.UTC(2026, 10, 6, 14, 0)), true);
    assert.equal(slotStarted("2026-11-06", 11, Date.UTC(2026, 10, 6, 13, 59)), false);
  });

  it("los días pasados vencieron y los futuros no", () => {
    assert.equal(slotStarted("2026-11-05", 21, NOW), true);
    assert.equal(slotStarted("2026-11-07", 8, NOW), false);
  });

  it("lista los horarios que quedan", () => {
    assert.deepEqual(bookableHours("2026-11-06", NOW), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    assert.equal(bookableHours("2026-11-07", NOW).length, 14);
    assert.equal(bookableHours("2026-11-05", NOW).length, 0);
    assert.equal(bookableHours("2026-11-06", Date.UTC(2026, 10, 7, 0, 30)).length, 0); // 21:30 en el club
  });

  it("isHour acepta solo enteros del 8 al 21", () => {
    for (const value of [8, 14, 21]) assert.equal(isHour(value), true);
    for (const value of [7, 22, 19.5, -1, Number.NaN]) assert.equal(isHour(value), false);
  });
});

describe("defaultDate", () => {
  it("es hoy mientras queden turnos", () => {
    assert.equal(defaultDate(NOW), "2026-11-06");
    assert.equal(defaultDate(Date.UTC(2026, 10, 6, 23, 59)), "2026-11-06"); // 20:59 en el club
  });

  it("pasa a mañana cuando hoy ya no tiene turnos", () => {
    assert.equal(defaultDate(Date.UTC(2026, 10, 7, 0, 30)), "2026-11-07"); // 21:30 del 6 en el club
    assert.equal(defaultDate(Date.UTC(2026, 10, 7, 2, 59)), "2026-11-07"); // 23:59 del 6 en el club
  });

  it("vuelve a ser hoy pasada la medianoche del club", () => {
    assert.equal(defaultDate(Date.UTC(2026, 10, 7, 3, 30)), "2026-11-07"); // 00:30 del 7 en el club
  });
});
