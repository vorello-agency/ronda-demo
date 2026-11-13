"use client";

import { useEffect, useRef } from "react";
import { HEIGHTS, groundTransform, project } from "@/lib/booking/plan-projection";
import { COURT, KINDS, MARKS, ballAt, duration, makeShot, randomShot, type Point, type Shot } from "@/lib/rally";

/**
 * Peloteo en isométrico 2.5D, con la misma proyección que el plano de reservas. Dos jugadores pelotean a compás
 * y cada tiro es distinto (drive, globo, corta): «distintos niveles», una misma cancha. La lógica del peloteo
 * vive en `src/lib/rally.ts`. Es decorativo (aria-hidden). El primer cuadro se dibuja en el servidor y es también la versión fija para
 * `prefers-reduced-motion`.
 */
type Run = { from: Point; to: Point; start: number; duration: number };

const SLAB = 0.9; // espesor de la losa de la cancha
const TRAIL_FADE = 2.4;
const MARK_FADE = 5;
const TRAILS = 3;
const BOUNCE_MARKS = 4;
const HOME: readonly [Point, Point] = [{ x: 9, y: 3.4 }, { x: 9, y: 32.6 }];

const round = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const ease = (value: number) => value * value * (3 - 2 * value);
const screen = (x: number, y: number, z = 0) => project("iso", x, y, z).map(round) as [number, number];
const corners = (points: readonly (readonly [number, number, number])[]) => points.map((point) => screen(...point).join(",")).join(" ");

function trailPoints(shot: Shot, elapsed: number): string {
  const end = Math.min(elapsed, duration(shot));
  const steps = Math.max(1, Math.ceil(end / 0.05));
  const points: string[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const { x, y, z } = ballAt(shot, (end * step) / steps);
    points.push(screen(x, y, z).join(","));
  }
  return points.join(" ");
}

function runnerAt(run: Run, time: number): Point {
  const amount = ease(clamp((time - run.start) / run.duration, 0, 1));
  return { x: mix(run.from.x, run.to.x, amount), y: mix(run.from.y, run.to.y, amount) };
}

/** Quien recibe va al encuentro de la pelota (un paso al costado); quien pegó vuelve al centro. */
function runsFor(shot: Shot, positions: readonly [Point, Point]): [Run, Run] {
  const receiver = shot.hitter === 0 ? 1 : 0;
  const side = shot.to.x > COURT.width / 2 ? -1.1 : 1.1;
  const runs = [] as unknown as [Run, Run];
  runs[shot.hitter] = { from: positions[shot.hitter], to: HOME[shot.hitter], start: shot.start + 0.3, duration: 1.3 };
  runs[receiver] = { from: positions[receiver], to: { x: shot.to.x + side, y: shot.to.y }, start: shot.start + 0.1, duration: duration(shot) - 0.25 };
  return runs;
}

// Primer cuadro: un drive cruzado a mitad de camino.
const FIRST_SHOT = makeShot(0, { x: 6.5, y: 5.6 }, 1, { x: 11.6, y: 27.4 }, 2.6, KINDS.drive.flight, KINDS.drive.after, -0.6);
const FIRST_RUNS = runsFor(FIRST_SHOT, [{ x: 7.6, y: 5.6 }, HOME[1]]);
const FIRST_BALL = ballAt(FIRST_SHOT, -FIRST_SHOT.start);
const FIRST_PLAYERS = [runnerAt(FIRST_RUNS[0], 0), runnerAt(FIRST_RUNS[1], 0)];

export function CommunityRally() {
  const root = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = root.current;
    if (!svg) return;
    const all = <T extends SVGElement>(selector: string) => Array.from(svg.querySelectorAll<T>(selector));
    const bodies = all<SVGLineElement>(".rally-player");
    const playerShadows = all<SVGCircleElement>(".rally-player-shadow");
    const balls = all<SVGCircleElement>(".rally-ball");
    const ballShadow = svg.querySelector<SVGCircleElement>(".rally-ball-shadow");
    const trails = all<SVGPolylineElement>(".rally-trail");
    const marks = all<SVGCircleElement>(".rally-mark");
    if (!ballShadow) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let time = 0;
    let previousFrame = 0;
    let frame = 0;
    let visible = false;
    let shot = FIRST_SHOT;
    let runs = FIRST_RUNS;
    let bounced = false;
    let trail = 0;
    let mark = 0;
    const trailEnds: number[] = Array(TRAILS).fill(-Infinity);
    const markBirths: number[] = Array(BOUNCE_MARKS).fill(-Infinity);
    trailEnds[0] = Infinity;

    const draw = (now: number) => {
      // Tope de 50 ms por cuadro: al volver de una pestaña en segundo plano no hay saltos.
      time += Math.min(0.05, (now - previousFrame) / 1000);
      previousFrame = now;

      if (!bounced && time >= shot.start + shot.flight) {
        bounced = true;
        mark = (mark + 1) % BOUNCE_MARKS;
        markBirths[mark] = time;
        marks[mark].setAttribute("cx", String(round(shot.bounce.x)));
        marks[mark].setAttribute("cy", String(round(shot.bounce.y)));
      }
      if (time >= shot.start + duration(shot)) {
        const positions: [Point, Point] = [runnerAt(runs[0], time), runnerAt(runs[1], time)];
        trails[trail].setAttribute("points", trailPoints(shot, duration(shot)));
        trailEnds[trail] = time;
        trail = (trail + 1) % TRAILS;
        trailEnds[trail] = Infinity;
        shot = randomShot(shot, shot.start + duration(shot));
        runs = runsFor(shot, positions);
        bounced = false;
      }

      runs.forEach((run, index) => {
        const { x, y } = runnerAt(run, time);
        const [fx, fy] = screen(x, y, 0.35);
        const [hx, hy] = screen(x, y, 1.75);
        bodies[index].setAttribute("x1", String(fx));
        bodies[index].setAttribute("y1", String(fy));
        bodies[index].setAttribute("x2", String(hx));
        bodies[index].setAttribute("y2", String(hy));
        playerShadows[index].setAttribute("cx", String(round(x)));
        playerShadows[index].setAttribute("cy", String(round(y)));
      });

      const elapsed = time - shot.start;
      const ball = ballAt(shot, elapsed);
      const [bx, by] = screen(ball.x, ball.y, ball.z);
      const near = ball.y > MARKS.net ? 1 : 0;
      balls.forEach((element, index) => {
        element.setAttribute("cx", String(bx));
        element.setAttribute("cy", String(by));
        element.style.opacity = index === near ? "1" : "0";
      });
      ballShadow.setAttribute("cx", String(round(ball.x)));
      ballShadow.setAttribute("cy", String(round(ball.y)));

      trails.forEach((element, index) => {
        if (index === trail) element.setAttribute("points", trailPoints(shot, elapsed));
        element.style.opacity = String(round(0.8 * clamp(1 - (time - trailEnds[index]) / TRAIL_FADE, 0, 1) * 100) / 100);
      });
      marks.forEach((element, index) => {
        element.style.opacity = String(round(0.75 * clamp(1 - (time - markBirths[index]) / MARK_FADE, 0, 1) * 100) / 100);
      });
      frame = requestAnimationFrame(draw);
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      if (!visible || reduced.matches) return;
      previousFrame = performance.now();
      frame = requestAnimationFrame(draw);
    };

    // Solo anima mientras se ve.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(svg);
    reduced.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      cancelAnimationFrame(frame);
    };
  }, []);

  const { inner, singles, service, center, centerMark, net } = MARKS;
  const posts = [inner.x - 1, inner.x + inner.width + 1] as const;
  const [ballX, ballY] = screen(FIRST_BALL.x, FIRST_BALL.y, FIRST_BALL.z);
  const firstNear = FIRST_BALL.y > net ? 1 : 0;
  const player = (index: number) => {
    const { x, y } = FIRST_PLAYERS[index];
    const [fx, fy] = screen(x, y, 0.35);
    const [hx, hy] = screen(x, y, 1.75);
    return <line className="rally-player" x1={fx} y1={fy} x2={hx} y2={hy} />;
  };
  const ball = (index: number) => <circle className="rally-ball" cx={ballX} cy={ballY} r={4} style={{ opacity: index === firstNear ? 1 : 0 }} />;

  return (
    <svg ref={root} className="community-rally" viewBox="-10 -104 488 304" aria-hidden="true" focusable="false">
      <polygon className="rally-side-west" points={corners([[0, 0, 0], [0, COURT.height, 0], [0, COURT.height, -SLAB], [0, 0, -SLAB]])} />
      <polygon className="rally-side-south" points={corners([[0, COURT.height, 0], [COURT.width, COURT.height, 0], [COURT.width, COURT.height, -SLAB], [0, COURT.height, -SLAB]])} />
      <g transform={groundTransform("iso")}>
        <rect className="rally-out" width={COURT.width} height={COURT.height} />
        <rect className="rally-in" x={inner.x} y={inner.y} width={inner.width} height={inner.height} />
        <g className="rally-lines">
          <rect x={inner.x} y={inner.y} width={inner.width} height={inner.height} />
          {singles.map((x) => <line key={x} x1={x} y1={inner.y} x2={x} y2={inner.y + inner.height} />)}
          {service.map((y) => <line key={y} x1={singles[0]} y1={y} x2={singles[1]} y2={y} />)}
          <line x1={center} y1={service[0]} x2={center} y2={service[1]} />
          <line x1={center} y1={inner.y} x2={center} y2={inner.y + centerMark} />
          <line x1={center} y1={inner.y + inner.height} x2={center} y2={inner.y + inner.height - centerMark} />
        </g>
        {Array.from({ length: BOUNCE_MARKS }, (_, index) => <circle key={index} className="rally-mark" r={0.42} style={{ opacity: 0 }} />)}
        {FIRST_PLAYERS.map(({ x, y }, index) => <circle key={index} className="rally-player-shadow" cx={round(x)} cy={round(y)} r={0.85} />)}
        <circle className="rally-ball-shadow" cx={round(FIRST_BALL.x)} cy={round(FIRST_BALL.y)} r={0.4} />
      </g>
      {Array.from({ length: TRAILS }, (_, index) => (
        <polyline key={index} className="rally-trail" points={index === 0 ? trailPoints(FIRST_SHOT, -FIRST_SHOT.start) : undefined} style={{ opacity: index === 0 ? 0.8 : 0 }} />
      ))}
      {player(0)}
      {ball(0)}
      <polygon className="rally-net" points={corners([[posts[0], net, 0], [posts[1], net, 0], [posts[1], net, HEIGHTS.net], [posts[0], net, HEIGHTS.net]])} />
      <polyline className="rally-tape" points={corners([[posts[0], net, HEIGHTS.net], [posts[1], net, HEIGHTS.net]])} />
      {player(1)}
      {ball(1)}
    </svg>
  );
}
