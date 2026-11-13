import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COURT_IDS, demoUnit, freeCourtsAt, isFree } from "./availability.ts";
import { HOURS, defaultDate, horizonDates } from "./club-time.ts";
import { BOOKING_PATH, bookingHref, canonicalSearch, clubHref, parseSelection } from "./selection.ts";
import { FUTURE_DATES, NOW, contextAt, findScenario } from "./test-utils.ts";

const ctx = contextAt();
const parse = (query: string, nowMs: number = NOW) => parseSelection(new URLSearchParams(query), nowMs);
const freeSlot = () =>
  findScenario((date, hour) => {
    const court = freeCourtsAt(date, hour, ctx)[0];
    return court ? { date, hour, court } : null;
  });

describe("parseSelection · lectura de la URL", () => {
  it("sin parámetros usa la fecha por defecto y no corrige nada", () => {
    assert.deepEqual(parse(""), { selection: { date: "2026-11-06", court: null, hour: null }, corrections: [], dateExplicit: false });
  });

  it("sin parámetros, después de la última hora del día, abre mañana", () => {
    const night = Date.UTC(2026, 10, 7, 0, 30); // 21:30 del 6 en el club
    assert.deepEqual(parse("", night).selection, { date: "2026-11-07", court: null, hour: null });
  });

  it("lee una selección completa y válida", () => {
    const { date, hour, court } = freeSlot();
    assert.deepEqual(parse(`cancha=${court}&fecha=${date}&hora=${hour}`), { selection: { date, court, hour }, corrections: [], dateExplicit: true });
  });

  it("una cancha sola alcanza (así llegan los accesos de la landing)", () => {
    assert.deepEqual(parse("cancha=02"), { selection: { date: "2026-11-06", court: "02", hour: null }, corrections: [], dateExplicit: false });
  });

  it("una hora sin fecha se evalúa sobre la fecha por defecto", () => {
    const hour = 19;
    const expected = isFree("2026-11-06", "02", hour, ctx);
    assert.equal(parse(`cancha=02&hora=${hour}`).selection.hour, expected ? hour : null);
  });

  it("con parámetros repetidos gana el primero", () => {
    assert.equal(parse("cancha=01&cancha=02").selection.court, "01");
  });

  it("ignora parámetros desconocidos", () => {
    assert.deepEqual(parse("utm_source=x&cancha=03"), { selection: { date: "2026-11-06", court: "03", hour: null }, corrections: [], dateExplicit: false });
  });
});

describe("parseSelection · parámetros inválidos", () => {
  const fallback = { date: "2026-11-06", court: null, hour: null };

  it("fechas imposibles, pasadas o fuera del horizonte vuelven a la fecha por defecto", () => {
    const cases: [string, string][] = [
      ["fecha=2026-02-30", "date-invalid"],
      ["fecha=ayer", "date-invalid"],
      ["fecha=", "date-invalid"],
      ["fecha=2026-11-6", "date-invalid"],
      ["fecha=2020-01-01", "date-past"],
      ["fecha=2026-11-05", "date-past"],
      ["fecha=2026-11-20", "date-out-of-range"],
      ["fecha=2027-12-01", "date-out-of-range"],
    ];
    for (const [query, kind] of cases) {
      const { selection, corrections } = parse(query);
      assert.deepEqual(selection, fallback, query);
      assert.deepEqual(corrections.map((correction) => correction.kind), [kind], query);
    }
  });

  it("canchas inexistentes se descartan", () => {
    for (const query of ["cancha=04", "cancha=1", "cancha=00", "cancha=central", "cancha=", "cancha=02%20"]) {
      const { selection, corrections } = parse(query);
      assert.equal(selection.court, null, query);
      assert.deepEqual(corrections.map((correction) => correction.kind), ["court-invalid"], query);
    }
  });

  it("horas fuera de rango o mal escritas se descartan", () => {
    for (const query of ["hora=7", "hora=22", "hora=24", "hora=abc", "hora=19.5", "hora=-1", "hora=", "hora=019", "hora=%2019"]) {
      const { selection, corrections } = parse(query);
      assert.equal(selection.hour, null, query);
      assert.deepEqual(corrections.map((correction) => correction.kind), ["hour-invalid"], query);
    }
  });

  it("una hora que ya empezó hoy se descarta con el motivo «past»", () => {
    const { selection, corrections } = parse("fecha=2026-11-06&hora=9");
    assert.equal(selection.hour, null);
    assert.deepEqual(corrections, [{ kind: "hour-unavailable", hour: 9, court: null, reason: "past" }]);
  });

  it("una hora sin lugar en la cancha del enlace se descarta y conserva la cancha", () => {
    const { date, hour, court } = findScenario((day, h) => {
      const busy = COURT_IDS.find((id) => !isFree(day, id, h, ctx));
      return busy ? { date: day, hour: h, court: busy } : null;
    });
    const { selection, corrections } = parse(`cancha=${court}&fecha=${date}&hora=${hour}`);
    assert.deepEqual(selection, { date, court, hour: null });
    assert.deepEqual(corrections, [{ kind: "hour-unavailable", hour, court, reason: "unavailable" }]);
  });

  it("una hora completa se descarta aunque no haya cancha elegida", () => {
    const { date, hour } = findScenario((day, h) => (freeCourtsAt(day, h, ctx).length === 0 ? { date: day, hour: h } : null));
    const { selection, corrections } = parse(`fecha=${date}&hora=${hour}`);
    assert.equal(selection.hour, null);
    assert.equal(corrections[0].kind, "hour-unavailable");
  });

  it("todo inválido a la vez: selección por defecto y una corrección por parámetro", () => {
    const { selection, corrections } = parse("cancha=09&fecha=2020-01-01&hora=99");
    assert.deepEqual(selection, fallback);
    assert.deepEqual(corrections.map((correction) => correction.kind), ["date-past", "court-invalid", "hour-invalid"]);
  });

  it("nunca lanza, con entradas arbitrarias", () => {
    const junk = ["", "=", "&&&", "cancha", "cancha=%E0%A4%A", "fecha=%00", "hora=%f0%9f%8e%be", "a=b=c", "cancha=02&cancha&hora", "hora=1e1", "hora=0x13", "fecha=2026-11-06T10:00"];
    for (const query of junk) {
      const { selection } = parse(query);
      assert.ok(FUTURE_DATES.concat(["2026-11-06"]).includes(selection.date), query);
    }
  });
});

describe("canonicalSearch · URL canónica", () => {
  it("la selección por defecto no necesita parámetros", () => {
    assert.equal(canonicalSearch({ date: "2026-11-06", court: null, hour: null }, NOW), "");
  });

  it("incluye la cancha y, si no es la de por defecto, la fecha", () => {
    assert.equal(canonicalSearch({ date: "2026-11-06", court: "02", hour: null }, NOW), "cancha=02");
    assert.equal(canonicalSearch({ date: "2026-11-09", court: "02", hour: null }, NOW), "cancha=02&fecha=2026-11-09");
    assert.equal(canonicalSearch({ date: "2026-11-09", court: null, hour: null }, NOW), "fecha=2026-11-09");
  });

  it("con hora siempre incluye la fecha, para que el enlace no cambie de sentido otro día", () => {
    assert.equal(canonicalSearch({ date: "2026-11-06", court: "01", hour: 19 }, NOW), "cancha=01&fecha=2026-11-06&hora=19");
  });

  it("el orden es estable: cancha, fecha, hora", () => {
    assert.equal(canonicalSearch({ date: "2026-11-09", court: "03", hour: 8 }, NOW), "cancha=03&fecha=2026-11-09&hora=8");
  });

  it("si hoy ya no tiene turnos, la fecha por defecto es mañana y hoy sí se escribe", () => {
    const night = Date.UTC(2026, 10, 7, 0, 30);
    assert.equal(canonicalSearch({ date: "2026-11-07", court: null, hour: null }, night), "");
    assert.equal(canonicalSearch({ date: "2026-11-06", court: null, hour: null }, night), "fecha=2026-11-06");
  });
});

describe("fecha explícita al compartir el enlace", () => {
  const DEFAULT = "2026-11-06"; // fecha por defecto en NOW
  const rewrite = (query: string, nowMs: number = NOW) => {
    const parsed = parseSelection(new URLSearchParams(query), nowMs);
    return canonicalSearch(parsed.selection, nowMs, { pinDate: parsed.dateExplicit });
  };

  it("la fecha es explícita solo si la URL trae una fecha válida", () => {
    assert.equal(parse(`fecha=${DEFAULT}`).dateExplicit, true);
    assert.equal(parse("fecha=2026-11-09").dateExplicit, true);
    for (const query of ["", "cancha=02", "fecha=2026-02-30", "fecha=2020-01-01", "fecha=2027-12-01", "fecha="]) {
      assert.equal(parse(query).dateExplicit, false, query);
    }
  });

  it("una fecha explícita igual a la de por defecto se conserva al reescribir la URL", () => {
    assert.equal(rewrite(`cancha=02&fecha=${DEFAULT}`), `cancha=02&fecha=${DEFAULT}`);
    assert.equal(rewrite(`fecha=${DEFAULT}`), `fecha=${DEFAULT}`);
  });

  it("el enlace relativo de la landing sigue siendo relativo", () => {
    assert.equal(rewrite("cancha=02"), "cancha=02");
    assert.equal(rewrite(""), "");
  });

  it("una fecha elegida por la persona se fija con pinDate, aunque sea la de por defecto", () => {
    assert.equal(canonicalSearch({ date: DEFAULT, court: "02", hour: null }, NOW, { pinDate: true }), `cancha=02&fecha=${DEFAULT}`);
    assert.equal(canonicalSearch({ date: DEFAULT, court: null, hour: null }, NOW, { pinDate: true }), `fecha=${DEFAULT}`);
    assert.equal(canonicalSearch({ date: DEFAULT, court: "02", hour: null }, NOW, { pinDate: false }), "cancha=02");
  });

  it("toda fecha válida de la URL sobrevive a leer y reescribir, con cualquier otro parámetro", () => {
    for (const date of horizonDates(NOW)) {
      for (const extra of ["", "&cancha=01", "&cancha=03&hora=abc", "&hora=99", "&cancha=09", "&utm_source=x"]) {
        const search = rewrite(`fecha=${date}${extra}`);
        assert.equal(new URLSearchParams(search).get("fecha"), date, `fecha=${date}${extra} → ${search}`);
      }
    }
  });

  it("reescribir es estable: una segunda pasada no cambia la URL", () => {
    for (const query of ["", "cancha=02", `fecha=${DEFAULT}`, `cancha=02&fecha=${DEFAULT}`, "fecha=2026-11-09&hora=12", "cancha=09&fecha=2020-01-01&hora=99"]) {
      const once = rewrite(query);
      assert.equal(rewrite(once), once, query);
    }
  });

  it("abierto otro día, un enlace con fecha avisa que pasó; uno relativo se mueve con el día", () => {
    const shared = canonicalSearch({ date: DEFAULT, court: "02", hour: null }, NOW, { pinDate: true });
    const nextDay = Date.UTC(2026, 10, 7, 13, 40); // sábado 7, 10:40 en el club
    const pinned = parseSelection(new URLSearchParams(shared), nextDay);
    assert.deepEqual(pinned.corrections.map((correction) => correction.kind), ["date-past"]);
    assert.equal(pinned.selection.date, "2026-11-07");
    const relative = parseSelection(new URLSearchParams("cancha=02"), nextDay);
    assert.deepEqual(relative.corrections, []);
    assert.equal(relative.selection.date, "2026-11-07");
  });
});

describe("ida y vuelta entre selección y URL", () => {
  it("leer la URL canónica de una selección devuelve la misma selección, sin correcciones", () => {
    for (let step = 0; step < 400; step++) {
      const date = FUTURE_DATES[Math.floor(demoUnit(`rt|date|${step}`) * FUTURE_DATES.length)];
      const court = demoUnit(`rt|court|${step}`) < 0.2 ? null : COURT_IDS[Math.floor(demoUnit(`rt|court|${step}`) * COURT_IDS.length)];
      const candidate = HOURS[Math.floor(demoUnit(`rt|hour|${step}`) * HOURS.length)];
      const works = court ? isFree(date, court, candidate, ctx) : freeCourtsAt(date, candidate, ctx).length > 0;
      const hour = demoUnit(`rt|hasHour|${step}`) < 0.3 || !works ? null : candidate;
      const selection = { date, court, hour };
      const parsed = parse(canonicalSearch(selection, NOW));
      assert.deepEqual(parsed.selection, selection, JSON.stringify(selection));
      assert.deepEqual(parsed.corrections, []);
    }
  });

  it("es idempotente: normalizar dos veces da lo mismo, también con entradas inválidas", () => {
    const inputs = ["cancha=09&fecha=2020-01-01&hora=99", "cancha=02&hora=19", "fecha=2026-11-12&hora=12", "hora=abc", "cancha=01&cancha=03", ""];
    for (const input of inputs) {
      const once = parse(input).selection;
      const twice = parse(canonicalSearch(once, NOW));
      assert.deepEqual(twice.selection, once, input);
      assert.deepEqual(twice.corrections, [], input);
    }
  });

  it("la URL canónica solo usa los tres parámetros conocidos", () => {
    const search = canonicalSearch({ date: "2026-11-09", court: "02", hour: 19 }, NOW);
    assert.deepEqual([...new URLSearchParams(search).keys()], ["cancha", "fecha", "hora"]);
    assert.equal(search.includes("?"), false);
  });
});

describe("bookingHref", () => {
  it("apunta a /reservar y deja la cancha elegida cuando se la indica", () => {
    assert.equal(BOOKING_PATH, "/reservar");
    assert.equal(bookingHref(), "/reservar");
    assert.equal(bookingHref("01"), "/reservar?cancha=01");
    for (const court of COURT_IDS) assert.equal(parse(bookingHref(court).split("?")[1]).selection.court, court);
  });

  it("la fecha por defecto coincide con la de la selección inicial", () => {
    assert.equal(parse("").selection.date, defaultDate(NOW));
  });
});

describe("clubHref", () => {
  it("vuelve a la sección de la cancha elegida en la home", () => {
    assert.equal(clubHref("01"), "/#cancha-club");
    assert.equal(clubHref("02"), "/#cancha-central");
    assert.equal(clubHref("03"), "/#cancha-jardin");
  });

  it("sin cancha, o con una que no existe, vuelve al inicio", () => {
    assert.equal(clubHref(null), "/");
    assert.equal(clubHref(undefined), "/");
    assert.equal(clubHref("09"), "/");
  });
});
