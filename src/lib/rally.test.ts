import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HEIGHTS } from "./booking/plan-projection.ts";
import { COURT, KINDS, MARKS, NET_CLEARANCE, ballAt, duration, makeShot, randomShot, type Shot } from "./rally.ts";

/** Generador determinista (mulberry32): las pruebas recorren siempre el mismo peloteo. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rally(length: number, seed = 7): Shot[] {
  const random = seeded(seed);
  const shots = [makeShot(0, { x: 6.5, y: 5.6 }, 1, { x: 11.6, y: 27.4 }, 2.6, KINDS.drive.flight, KINDS.drive.after, 0)];
  while (shots.length < length) {
    const previous = shots[shots.length - 1];
    shots.push(randomShot(previous, previous.start + duration(previous), random));
  }
  return shots;
}

const SHOTS = rally(5000);
const { inner, singles, net } = MARKS;
const EPSILON = 1e-9;

describe("peloteo de Comunidad", () => {
  it("los jugadores se alternan y cada uno pega desde su lado", () => {
    SHOTS.forEach((shot, index) => {
      if (index > 0) assert.notEqual(shot.hitter, SHOTS[index - 1].hitter);
      assert.ok(shot.hitter === 0 ? shot.from.y < net : shot.from.y > net);
    });
  });

  it("cada tiro sale de donde terminó el anterior, a la misma altura", () => {
    SHOTS.slice(1).forEach((shot, index) => {
      const previous = SHOTS[index];
      assert.deepEqual(shot.from, previous.to);
      assert.equal(shot.fromHeight, previous.after.height);
      assert.ok(Math.abs(shot.start - (previous.start + duration(previous))) < EPSILON);
    });
  });

  it("la pelota pica dentro de la cancha de singles, del lado contrario", () => {
    for (const shot of SHOTS) {
      assert.ok(shot.bounce.x > singles[0] && shot.bounce.x < singles[1]);
      if (shot.hitter === 0) assert.ok(shot.bounce.y > net && shot.bounce.y < inner.y + inner.height);
      else assert.ok(shot.bounce.y < net && shot.bounce.y > inner.y);
    }
  });

  it("pasa la red con margen", () => {
    for (const shot of SHOTS) {
      const atNet = ((net - shot.from.y) / (shot.bounce.y - shot.from.y)) * shot.flight;
      const ball = ballAt(shot, atNet);
      assert.ok(Math.abs(ball.y - net) < 1e-6);
      assert.ok(ball.z >= HEIGHTS.net + NET_CLEARANCE - 1e-6, `altura en la red: ${ball.z}`);
    }
  });

  it("pica una sola vez: toca el piso solo en el pique", () => {
    for (const shot of SHOTS) {
      for (let step = 1; step < 100; step += 1) {
        const elapsed = (duration(shot) * step) / 100;
        if (Math.abs(elapsed - shot.flight) < 0.02) continue;
        assert.ok(ballAt(shot, elapsed).z > 0);
      }
      const bounce = ballAt(shot, shot.flight);
      assert.ok(Math.abs(bounce.z) < EPSILON);
      assert.ok(Math.abs(bounce.x - shot.bounce.x) < EPSILON && Math.abs(bounce.y - shot.bounce.y) < EPSILON);
    }
  });

  it("quien recibe espera la pelota sobre la losa, sin cruzar la red", () => {
    for (const shot of SHOTS) {
      assert.ok(shot.to.x >= 1 - EPSILON && shot.to.x <= COURT.width - 1 + EPSILON);
      assert.ok(shot.to.y >= 1 - EPSILON && shot.to.y <= COURT.height - 1 + EPSILON);
      assert.ok(shot.hitter === 0 ? shot.to.y > shot.bounce.y : shot.to.y < shot.bounce.y);
      const arrival = ballAt(shot, duration(shot));
      assert.ok(Math.abs(arrival.z - shot.after.height) < EPSILON);
    }
  });

  it("después del pique la pelota sigue en la misma dirección", () => {
    for (const shot of SHOTS) {
      const flight = [shot.bounce.x - shot.from.x, shot.bounce.y - shot.from.y];
      const after = [shot.to.x - shot.bounce.x, shot.to.y - shot.bounce.y];
      assert.ok(Math.abs(flight[0] * after[1] - flight[1] * after[0]) < 1e-6);
      assert.ok(flight[0] * after[0] + flight[1] * after[1] > 0);
    }
  });

  it("el globo rebota alto y se devuelve más arriba y más atrás que un drive", () => {
    const lobs = SHOTS.filter((shot) => shot.after === KINDS.lob.after);
    assert.ok(lobs.length > 500);
    for (const shot of lobs) {
      let peak = 0;
      for (let step = 0; step <= 50; step += 1) peak = Math.max(peak, ballAt(shot, shot.flight + (shot.after.time * step) / 50).z);
      assert.ok(peak > 3, `rebote del globo: ${peak}`);
      assert.ok(shot.after.height > KINDS.drive.after.height);
      // Quien recibe la espera detrás de la línea de fondo.
      assert.ok(shot.hitter === 0 ? shot.to.y > inner.y + inner.height : shot.to.y < inner.y);
    }
  });
});
