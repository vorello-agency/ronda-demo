import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COURT_IDS, freeCourtsAt, hourAvailability, isFree } from "./availability.ts";
import { HORIZON_DAYS, HOURS, today, type Hour, type IsoDate } from "./club-time.ts";
import { applyChange, type Notice } from "./conflicts.ts";
import {
  SLOT_LENGTH_TEXT, changeAnnouncement, clubTimeNote, courtName, courtOptionLabel, courtStatusText, hourCountText, hourNoteText,
  hourOptionLabel, noticeAnnouncement,
} from "./copy.ts";
import { courtOptions, dayOptions, hourNote, hourPeriods, monthsLabel, noticeOrigin } from "./flow-view.ts";
import { NOW, contextAt, findScenario } from "./test-utils.ts";
import type { CourtId, Selection } from "./types.ts";

const ctx = contextAt();
const hoursOf = (selection: Selection) => hourPeriods(selection, ctx).flatMap((period) => period.options);

describe("cinta de días", () => {
  it("muestra el horizonte completo, con hoy primero", () => {
    const days = dayOptions(NOW);
    assert.equal(days.length, HORIZON_DAYS);
    assert.equal(days[0].date, today(NOW));
    assert.ok(days[0].isToday && days.slice(1).every((day) => !day.isToday));
  });

  it("hoy deja de ser reservable cuando empezó su último turno", () => {
    assert.equal(dayOptions(NOW)[0].bookable, true);
    const late = Date.UTC(2026, 10, 7, 0, 30); // viernes 6, 21:30 en Montevideo
    const days = dayOptions(late);
    assert.equal(days[0].bookable, false);
    assert.ok(days.slice(1).every((day) => day.bookable));
  });

  it("marca sábados y domingos", () => {
    const weekend = dayOptions(NOW).filter((day) => day.isWeekend).map((day) => day.date);
    assert.deepEqual(weekend.slice(0, 2), ["2026-11-07", "2026-11-08"]);
  });

  it("nombra el mes, o los dos si el horizonte los cruza", () => {
    assert.equal(monthsLabel(["2026-11-06", "2026-11-19"]), "Noviembre");
    assert.equal(monthsLabel(["2026-11-25", "2026-12-08"]), "Noviembre – Diciembre");
  });
});

describe("horarios", () => {
  it("oculta los que ya empezaron y las franjas vacías", () => {
    const options = hoursOf({ date: today(NOW), court: null, hour: null });
    assert.ok(options.every((option) => option.hour >= 11), "a las 10:40 el primero es las 11");
    const periods = hourPeriods({ date: today(NOW), court: null, hour: null }, ctx);
    assert.ok(periods.every((period) => period.options.length > 0));
  });

  it("en un día futuro muestra las 14 horas en tres franjas", () => {
    const periods = hourPeriods({ date: "2026-11-09", court: null, hour: null }, ctx);
    assert.deepEqual(periods.map((period) => period.label), ["Mañana", "Tarde", "Noche"]);
    assert.deepEqual(periods.flatMap((period) => period.options.map((option) => option.hour)), [...HOURS]);
  });

  it("sin cancha: se puede elegir si alguna tiene lugar; «sin lugar» si ninguna", () => {
    for (const option of hoursOf({ date: "2026-11-09", court: null, hour: null })) {
      assert.equal(option.tone, option.free.length === 0 ? "none" : "free");
      assert.deepEqual([...option.free, ...option.busy].sort(), [...COURT_IDS].sort());
    }
  });

  it("con cancha: solo dos estados, según esa cancha", () => {
    for (const court of COURT_IDS) {
      for (const option of hoursOf({ date: "2026-11-09", court, hour: null })) {
        assert.equal(option.tone, option.free.includes(court) ? "free" : "none");
        assert.equal(hourCountText(option), option.tone === "none" ? "sin lugar" : "");
      }
    }
  });

  it("con cancha ocupada y otra libre: tachada, y la etiqueta dice dónde hay lugar", () => {
    const { date, court, hour } = findScenario((date, hour) => {
      const { free, busy } = hourAvailability(date, hour, ctx);
      return free.length === 1 && busy.length > 0 ? { date, court: busy[0], hour } : null;
    });
    const option = hoursOf({ date, court, hour: null }).find((item) => item.hour === hour)!;
    assert.equal(option.tone, "none");
    assert.equal(hourCountText(option), "sin lugar");
    assert.match(hourOptionLabel(option, court), /^\d\d:00 a \d\d:00\. Sin lugar en \S+\. Libre en \S+\.$/);
  });

  it("sin lugar en ninguna cancha: tachada con o sin cancha elegida", () => {
    const { date, hour } = findScenario((date, hour) => (freeCourtsAt(date, hour, ctx).length === 0 ? { date, hour } : null));
    for (const court of [null, "02"] as const) {
      const option = hoursOf({ date, court, hour: null }).find((item) => item.hour === hour)!;
      assert.equal(option.tone, "none");
      assert.equal(hourCountText(option), "sin lugar");
      assert.match(hourOptionLabel(option, court), court === null ? /\. Todas, sin lugar en ninguna cancha\.$/ : /\. Sin lugar en ninguna cancha\.$/);
    }
  });

  it("con lugar: sin texto visible; la etiqueta nombra las canchas libres", () => {
    const option = hoursOf({ date: "2026-11-09", court: null, hour: null }).find((item) => item.free.length === 2)
      ?? hoursOf({ date: "2026-11-10", court: null, hour: null }).find((item) => item.free.length === 2)!;
    assert.equal(hourCountText(option), "");
    assert.match(hourOptionLabel(option, null), /^\d\d:00 a \d\d:00\. Todas, libre en \S+ y \S+\.$/);
    const court = option.free[0];
    assert.match(hourOptionLabel({ ...option, tone: "free" }, court), new RegExp(`\\. Libre en ${courtName(court)}\\.$`));
  });
});

describe("nota bajo los horarios", () => {
  const day = (date: IsoDate, court: CourtId | null) => hourPeriods({ date, court, hour: null }, ctx);

  it("sin cancha elegida no hay nota", () => {
    assert.equal(hourNote(day("2026-11-09", null), null), null);
  });

  it("con cancha elegida, avisa si alguna hora tachada tiene lugar en otra cancha", () => {
    for (const date of ["2026-11-09", "2026-11-10", "2026-11-11"] as const) {
      for (const court of COURT_IDS) {
        const periods = day(date, court);
        const options = periods.flatMap((period) => period.options);
        const struck = options.filter((option) => option.tone === "none");
        const note = hourNote(periods, court);
        assert.equal(note !== null, struck.some((option) => option.free.length > 0));
        if (note?.kind === "all") assert.ok(struck.every((option) => option.free.length > 0));
        if (note?.kind === "some") assert.ok(struck.some((option) => option.free.length === 0));
      }
    }
  });

  it("los textos de la nota", () => {
    assert.equal(hourNoteText({ kind: "all", court: "02" }), "Las horas tachadas tienen lugar en otras canchas.");
    assert.equal(hourNoteText({ kind: "some", court: "02" }), "Algunas horas tachadas tienen lugar en otras canchas.");
  });

  it("si la cancha no tiene lugar en todo el día, lo dice con su nombre", () => {
    const option = (hour: number, free: CourtId[]) => ({ hour: hour as Hour, free, busy: COURT_IDS.filter((id) => !free.includes(id)), tone: "none" as const });
    const periods = [{ label: "Noche", options: [option(20, ["01"]), option(21, [])] }];
    assert.deepEqual(hourNote(periods, "02"), { kind: "day", court: "02" });
    assert.equal(hourNoteText({ kind: "day", court: "02" }), "Central no tiene lugar este día.");
  });
});

describe("canchas en el plano", () => {
  it("sin horario muestran superficie y turnos del día", () => {
    const options = courtOptions({ date: "2026-11-09", court: null, hour: null }, ctx);
    assert.deepEqual(options.map((option) => option.id), [...COURT_IDS]);
    for (const option of options) {
      assert.equal(option.state, "idle");
      assert.match(courtStatusText(option), /^(Dura|Arcilla) · \d+ turnos?$/);
      assert.match(courtOptionLabel(option, null), /, cancha 0\d, (dura|arcilla)\. \d+ turnos? disponibles?\.$/);
    }
  });

  it("con horario dicen si están libres u ocupadas a esa hora", () => {
    const { date, hour } = findScenario((date, hour) => {
      const { free, busy } = hourAvailability(date, hour, ctx);
      return free.length > 0 && busy.length > 0 ? { date, hour } : null;
    });
    for (const option of courtOptions({ date, court: null, hour }, ctx)) {
      assert.equal(option.state, isFree(date, option.id, hour, ctx) ? "free" : "taken");
      assert.equal(courtStatusText(option), option.state === "free" ? "Libre" : "Ocupada");
      assert.match(courtOptionLabel(option, hour), option.state === "free" ? /Libre a las \d\d:00\.$/ : /Ocupada a las \d\d:00\.$/);
    }
  });

  it("la elegida lo dice primero, en texto y en su nombre accesible", () => {
    const option = courtOptions({ date: "2026-11-09", court: "02", hour: null }, ctx).find((item) => item.id === "02")!;
    assert.equal(courtStatusText(option), "Elegida");
    assert.match(courtOptionLabel(option, null), /^Central, cancha 02, arcilla\. Elegida\. /);
  });
});

describe("avisos y anuncios", () => {
  it("el aviso de una cancha ocupada va donde se eligió la cancha (plano o «Ver horarios de»); el resto, junto a los horarios", () => {
    const busy: Notice = { kind: "court-busy", court: "01", hour: 19, alternatives: [] };
    assert.equal(noticeOrigin(busy, "court"), "court");
    assert.equal(noticeOrigin(busy, "hour"), "hour");
    assert.equal(noticeOrigin({ kind: "hour-busy", court: "01", hour: 19, alternatives: [] }, "court"), "hour");
    assert.equal(noticeOrigin({ kind: "pick-unavailable", court: "01", hour: 19 }, "court"), "court");
    assert.equal(noticeOrigin({ kind: "hour-full", hour: 19 }, "court"), "hour");
  });

  it("el anuncio de un conflicto incluye las alternativas", () => {
    const text = noticeAnnouncement({ kind: "court-busy", court: "01", hour: 19, alternatives: [{ court: "01", hour: 20 }, { court: "02", hour: 19 }] });
    assert.equal(text, "Club está ocupada a las 19:00. Elegí otro horario para Club. Alternativas: Club a las 20:00 o Central a las 19:00.");
    assert.match(noticeAnnouncement({ kind: "hour-busy", court: "01", hour: 19, alternatives: [{ court: "02", hour: 19 }] }), /Alternativa: Central a las 19:00\.$/);
  });

  it("cada cambio sin conflicto tiene su anuncio", () => {
    const base: Selection = { date: "2026-11-09", court: null, hour: null };
    const free = findScenario((date, hour) => (date === "2026-11-09" && freeCourtsAt(date, hour, ctx).length > 0 ? hour : null));
    assert.equal(changeAnnouncement({ type: "date", date: "2026-11-10" }, applyChange(base, { type: "date", date: "2026-11-10" }, ctx)), "Disponibilidad del martes 10 de noviembre.");
    assert.equal(changeAnnouncement({ type: "court", court: "02" }, applyChange(base, { type: "court", court: "02" }, ctx)), "Central elegida.");
    const withCourt: Selection = { ...base, court: "02" };
    assert.equal(changeAnnouncement({ type: "court", court: null }, applyChange(withCourt, { type: "court", court: null }, ctx), withCourt), "Horarios de todas las canchas. Central ya no está elegida.");
    assert.equal(changeAnnouncement({ type: "court", court: null }, applyChange(base, { type: "court", court: null }, ctx), base), "Horarios de todas las canchas.");
    assert.equal(changeAnnouncement({ type: "hour", hour: free }, applyChange(base, { type: "hour", hour: free }, ctx)), `Horario de las ${String(free).padStart(2, "0")}:00 elegido.`);
  });

  it("un cambio con aviso anuncia el aviso", () => {
    const { date, court, hour } = findScenario((date, hour) => {
      const { free, busy } = hourAvailability(date, hour, ctx);
      return free.length > 0 && busy.length > 0 ? { date, court: busy[0], hour } : null;
    });
    const outcome = applyChange({ date, court: null, hour }, { type: "court", court }, ctx);
    assert.equal(changeAnnouncement({ type: "court", court }, outcome), noticeAnnouncement(outcome.notice!));
  });
});

describe("hora del club", () => {
  // 13:40 UTC: 10:40 en Montevideo y en Buenos Aires (UTC−3), 14:40 en Madrid (UTC+1 en noviembre).
  const at = Date.UTC(2026, 10, 6, 13, 40);

  it("no dice nada si quien visita tiene la misma hora que el club", () => {
    assert.equal(clubTimeNote(at, "America/Montevideo"), null);
    assert.equal(clubTimeNote(at, "America/Argentina/Buenos_Aires"), null);
  });

  it("da la hora del club si quien visita está en otra zona", () => {
    assert.equal(clubTimeNote(at, "Europe/Madrid"), "En el club son las 10:40");
    assert.equal(clubTimeNote(at, "UTC"), "En el club son las 10:40");
  });

  it("sin zona conocida o con una inválida, no dice nada", () => {
    assert.equal(clubTimeNote(at, undefined), null);
    assert.equal(clubTimeNote(at, "Marte/Olympus"), null);
  });

  it("la duración del turno no menciona la zona horaria", () => {
    assert.equal(SLOT_LENGTH_TEXT, "Turnos de 60 minutos");
  });
});
