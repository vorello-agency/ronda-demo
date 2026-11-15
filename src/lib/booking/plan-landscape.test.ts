import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clubPlan } from "../../data/club-plan.ts";
import { courts as courtContent } from "../../data/courts.ts";
import {
  FOREST_CLEARINGS, MIN_SIZE, MOBILE_SCALE, TALL_PINE, blockCells, blockZone, buildLandscape, keepOut, landscape, pineShape, shownScale, shrubShape, type Zone,
} from "./plan-landscape.ts";
import { PLAN_VIEWS, ROOF_OVERHANG, courtDoor, exterior, groundBounds, modelBase, project, roofHeight, unproject, viewBox, type PlanView, type Rect } from "./plan-projection.ts";

const east = (rect: Rect) => rect.x + rect.width;
const south = (rect: Rect) => rect.y + rect.height;
const hit = (a: Zone, b: Zone) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
const overlap = (a: Rect, b: Rect) => a.x < east(b) && b.x < east(a) && a.y < south(b) && b.y < south(a);
const inside = (view: PlanView, zone: Zone) => {
  const box = viewBox(view);
  return zone.x1 >= box.x && zone.y1 >= box.y && zone.x2 <= box.x + box.width && zone.y2 <= box.y + box.height;
};
const jardin = clubPlan.courts.find((court) => court.id === courtContent.find((item) => item.name === "Jardín")!.id)!;
const { pavilion, courts, paths } = clubPlan;

/** Rectángulos del dibujo de todo lo plantado, con el tamaño más grande con el que se llega a ver. */
const drawn = (view: PlanView): { what: string; zone: Zone }[] => {
  const scape = landscape(view);
  return [
    ...scape.pines.map((pine) => {
      const shape = pineShape(view, pine, shownScale(view, pine.tier));
      // De un pino alto que queda detrás de la losa solo se ve la copa: el tronco lo tapa el pabellón.
      const hidden = pine.back && pine.kind === "tall" && pine.x > pavilion.x - ROOF_OVERHANG.sides && pine.x < east(pavilion) + ROOF_OVERHANG.sides;
      return { what: `pino ${pine.x},${pine.y}`, zone: hidden ? { ...shape.zone, y2: shape.cy + shape.ry } : shape.zone };
    }),
    ...scape.shrubs.map((shrub) => ({ what: `arbusto ${shrub.x},${shrub.y}`, zone: shrubShape(view, shrub, shownScale(view, shrub.tier)).zone })),
    // Incluye el seto perimetral: también tiene que dejar libres los rótulos, las etiquetas y sus guías.
    ...scape.blocks.flatMap((block) => blockCells(block).map((cell) => ({ what: `${block.kind} ${block.x},${block.y}`, zone: blockZone(view, cell) }))),
  ];
};

describe("paisaje del plano", () => {
  for (const view of PLAN_VIEWS) {
    it(`${view}: el mismo dibujo en cada cálculo`, () => {
      assert.deepEqual(buildLandscape(view), buildLandscape(view));
      assert.deepEqual(buildLandscape(view), landscape(view));
    });

    it(`${view}: nada se dibuja fuera del encuadre`, () => {
      const scape = landscape(view);
      for (const { what, zone } of drawn(view)) assert.ok(inside(view, zone), what);
      for (const [x, y, z] of [...scape.blooms.large, ...scape.blooms.deep, ...scape.blooms.small, ...scape.tufts.dark, ...scape.tufts.lit, ...scape.fenceVine.dark, ...scape.fenceVine.lit]) {
        const [sx, sy] = project(view, x, y, z);
        assert.ok(inside(view, { x1: sx - 6, x2: sx + 6, y1: sy - 6, y2: sy + 6 }), `flor ${x},${y}`);
      }
      for (const fence of scape.fences) assert.ok(inside(view, blockZone(view, { ...fence.rect, tall: fence.height })), `cerco ${fence.id}`);
      const ground = groundBounds(view);
      assert.ok(view === "plan" || modelBase().x < ground.x);
      for (const lawn of scape.lawns) {
        assert.ok(lawn.width > 0 && lawn.height > 0);
        assert.ok(lawn.x >= ground.x && lawn.y >= ground.y && east(lawn) <= east(ground) + 1e-9 && south(lawn) <= south(ground) + 1e-9, "césped dentro del suelo dibujado");
        assert.ok(inside(view, blockZone(view, { ...lawn, tall: 0 })), "césped dentro del encuadre");
      }
    });

    it(`${view}: deja libres las etiquetas, los rótulos y la guía de la cancha elegida`, () => {
      const zones = keepOut(view);
      assert.ok(zones.length >= courts.length + 1);
      for (const { what, zone } of drawn(view)) assert.ok(!zones.some((free) => hit(free, zone)), what);
    });

    it(`${view}: ninguna copa ni arbusto queda sobre una cancha`, () => {
      const scape = landscape(view);
      const shapes = [
        ...scape.pines.map((pine) => pineShape(view, pine, shownScale(view, pine.tier))),
        ...scape.shrubs.map((shrub) => shrubShape(view, shrub, shownScale(view, shrub.tier))),
      ];
      for (const { cx, cy, rx, ry } of shapes) {
        for (let step = 0; step < 24; step++) {
          const angle = (step / 24) * Math.PI * 2;
          const [x, y] = unproject(view, cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
          for (const court of courts) assert.ok(!(x > court.x && x < east(court) && y > court.y && y < south(court)), `${view} copa sobre ${court.id}`);
        }
      }
    });

    it(`${view}: lo plantado no pisa canchas, caminos ni el pabellón`, () => {
      const scape = landscape(view);
      for (const block of scape.blocks) {
        for (const shape of [...courts, ...paths, pavilion]) assert.equal(overlap(block, shape), false, `${block.kind} ${block.x},${block.y}`);
      }
      for (const lawn of scape.lawns) for (const shape of [...courts, ...paths]) assert.equal(overlap(lawn, shape), false, "césped");
      for (const { x, y } of [...scape.pines, ...scape.shrubs]) {
        for (const shape of [...courts, ...paths, pavilion]) assert.ok(!(x > shape.x && x < east(shape) && y > shape.y && y < south(shape)), `base en ${x},${y}`);
      }
    });

    it(`${view}: detrás del pabellón, un pinar en el isométrico y nada en la planta`, () => {
      const behind = landscape(view).pines.filter((pine) => pine.back && pine.x > pavilion.x - ROOF_OVERHANG.sides && pine.x < east(pavilion) + ROOF_OVERHANG.sides);
      // En la planta (celular y tablet) la hilera empujaba las canchas hacia abajo: el dibujo arranca en el pabellón.
      assert.ok(view === "plan" ? behind.length === 0 : behind.length >= 18, `${behind.length} pinos`);
      assert.ok(behind.every((pine) => pine.kind === "tall"));
      const roof = roofHeight(view);
      for (const pine of behind.filter((item) => item.tier === "main")) {
        const { cx, cy } = pineShape(view, pine);
        // Borde norte de la cubierta en la misma vertical del dibujo que la copa.
        const edgeY = pavilion.y - ROOF_OVERHANG.sides;
        const edgeX = view === "iso" ? pine.x + pine.y - edgeY : pine.x;
        assert.ok(Math.abs(project(view, edgeX, edgeY, roof)[0] - cx) < 0.5);
        assert.ok(cy < project(view, edgeX, edgeY, roof)[1], `la copa de ${pine.x},${pine.y} asoma`);
      }
    });

    it(`${view}: el jardín ancho lleva árboles y la separación corta, un seto`, () => {
      const scape = landscape(view);
      const hedges = scape.blocks.filter((block) => block.kind === "hedge");
      courts.slice(1).forEach((court, index) => {
        const previous = courts[index];
        const between = (x: number) => x > east(previous) && x < court.x;
        if (court.x - east(previous) > 8) {
          assert.ok(scape.pines.filter((pine) => pine.zone === "garden" && between(pine.x) && pine.y > court.y && pine.y < south(court)).length >= 4);
          assert.equal(hedges.some((hedge) => between(hedge.x)), false);
        } else {
          assert.equal(hedges.filter((hedge) => between(hedge.x) && between(east(hedge))).length, 1);
          assert.equal(scape.pines.some((pine) => between(pine.x) && pine.y > court.y && pine.y < south(court)), false);
        }
      });
      assert.ok(hedges.some((hedge) => east(hedge) < courts[0].x && hedge.x > clubPlan.boundary.west), "seto al oeste de la primera cancha");
    });

    it(`${view}: los pinos altos van solo detrás del pabellón y en la arboleda del noreste`, () => {
      const { pines } = landscape(view);
      const tall = pines.filter((pine) => pine.kind === "tall");
      assert.ok(tall.length > 0 && tall.every((pine) => pine.zone === "treeline" || pine.zone === "grove"));
      assert.ok(tall.every((pine) => pine.y < south(pavilion)), "ninguno al sur de la fachada");
      assert.ok(pines.filter((pine) => pine.zone === "garden" || pine.zone === "east").every((pine) => pine.kind === "low"), "entre canchas, árboles bajos");
      assert.ok(tall.some((pine) => pine.zone === "grove"), "arboleda del noreste");
      if (view === "iso") {
        // Altura moderada: las copas quedan, en promedio, a alrededor de una vez y media la cubierta, y ninguna al doble.
        const heights = tall.filter((pine) => pine.zone === "treeline").map((pine) => (TALL_PINE.crown.iso * pine.size) / roofHeight("iso"));
        const mean = heights.reduce((sum, value) => sum + value, 0) / heights.length;
        assert.ok(mean > 1.1 && mean < 1.6, `promedio ${mean}`);
        assert.ok(Math.max(...heights) < 2, `máximo ${Math.max(...heights)}`);
        // Copas anchas: al menos la mitad del alto del árbol.
        const { rx, ry, base, cy } = pineShape("iso", { x: 40, y: 4, size: 1, kind: "tall" });
        assert.ok(rx * 2 >= (base[1] - (cy - ry)) / 2);
      }
    });

    it(`${view}: en cada cancha se alinean la abertura del cerco y el corte de la vegetación`, () => {
      const scape = landscape(view);
      for (const court of courts) {
        const [from, to] = courtDoor(court);
        assert.deepEqual(scape.fences.find((fence) => fence.id === court.id)!.gate, [from, to]);
        const beside = scape.blocks.filter((block) => block.kind === "thicket");
        assert.equal(beside.some((block) => block.x < to && east(block) > from), false, `vegetación en la puerta de ${court.id}`);
        // A cada lado de la puerta hay vegetación: la abertura se lee como un corte.
        assert.ok(beside.some((block) => east(block) <= from && from - east(block) < 0.6) && beside.some((block) => block.x >= to && block.x - to < 0.6), `corte de ${court.id}`);
      }
    });

    it(`${view}: la vegetación al pie de la terraza se abre frente a la puerta de cada cancha`, () => {
      const scape = landscape(view);
      const thickets = scape.blocks.filter((block) => block.kind === "thicket");
      const gallery = paths.find((path) => path.id === "galeria-norte")!;
      assert.ok(thickets.length >= courts.length);
      for (const thicket of thickets) assert.ok(thicket.y >= south(gallery) && south(thicket) < courts[0].y, "entre la terraza y el cerco");
      for (const fence of scape.fences) {
        const center = (fence.gate[0] + fence.gate[1]) / 2;
        assert.equal(thickets.some((thicket) => center > thicket.x && center < east(thicket)), false, `puerta de ${fence.id}`);
      }
      for (const [x, y] of [...scape.tufts.dark, ...scape.tufts.lit]) assert.ok(thickets.some((thicket) => x >= thicket.x && x <= east(thicket) && y >= thicket.y && y <= south(thicket)));
    });

    if (view === "iso") {
      const forest = () => landscape("iso").pines.filter((pine) => pine.zone === "treeline");

      it("iso: el pinar es una masa con unos pocos claros de cielo sobre la cubierta", () => {
        const crowns = forest().map((pine) => pineShape("iso", pine));
        const edge = pavilion.y - ROOF_OVERHANG.sides;
        // Se recorre el borde norte de la losa y se anota dónde asoma una copa y dónde se ve el cielo.
        const covered: boolean[] = [];
        for (let x = pavilion.x; x <= east(pavilion); x += 0.5) {
          const [sx, sy] = project("iso", x, edge, roofHeight("iso"));
          covered.push(crowns.some(({ cx, cy, rx, ry }) => Math.abs(sx - cx) < rx * 0.8 && cy - ry * 0.5 < sy));
        }
        const share = covered.filter(Boolean).length / covered.length;
        assert.ok(share > 0.75 && share < 0.97, `copas en el ${Math.round(share * 100)} % del frente`);
        const gaps = covered.filter((value, index) => !value && covered[index - 1] !== false).length;
        assert.ok(gaps >= 2 && gaps <= FOREST_CLEARINGS.length + 1, `${gaps} claros`);
      });

      it("iso: el pinar no repite un patrón: alturas, separación e inclinación irregulares", () => {
        const pines = forest();
        assert.ok(new Set(pines.map((pine) => pine.size)).size >= 12, "alturas");
        const xs = pines.map((pine) => pine.x).sort((a, b) => a - b);
        const gaps = xs.slice(1).map((x, index) => Math.round((x - xs[index]) * 10));
        assert.ok(new Set(gaps).size >= 10, "separación");
        const leaning = pines.filter((pine) => pine.lean);
        assert.ok(leaning.length >= 4 && leaning.length < pines.length / 2, `${leaning.length} inclinados`);
        assert.ok(leaning.every((pine) => Math.abs(pine.lean!) <= 7));
        assert.ok(new Set(pines.map((pine) => pine.variant)).size === 3 && pines.some((pine) => pine.flip) && pines.some((pine) => !pine.flip));
        // Dos o tres capas: bases repartidas en profundidad.
        const depths = pines.map((pine) => pine.y);
        assert.ok(Math.max(...depths) - Math.min(...depths) > 1.5);
      });

      it("iso: ninguna línea de etiqueta pisa el seto perimetral ni un arbusto", () => {
        const scape = landscape("iso");
        for (const court of courts) {
          const x = court.x + court.width / 2;
          for (const block of scape.blocks.filter((item) => item.kind === "perimeter" || item.kind === "hedge" || item.kind === "bed")) {
            assert.ok(!(x > block.x - 0.2 && x < east(block) + 0.2 && south(block) > south(court)), `${block.kind} bajo la línea de ${court.id}`);
          }
          for (const shrub of scape.shrubs.filter((item) => item.y > south(court))) assert.ok(Math.abs(shrub.x - x) > 0.8, `arbusto bajo la línea de ${court.id}`);
        }
      });
    }

    it(`${view}: el cerco perimetral es un seto con el portón en el acceso`, () => {
      const scape = landscape(view);
      const { hedge, gate, sidewalk } = exterior();
      const west = scape.blocks.filter((block) => block.kind === "perimeter" && east(block) <= hedge[1] + 0.3);
      assert.ok(west.length >= 2, "tramos al norte y al sur del portón");
      assert.equal(west.some((block) => block.y < gate[1] - 0.1 && south(block) > gate[0] + 0.1), false, "el portón queda abierto");
      // El portón está junto al extremo oeste del pabellón, y el seto sigue un buen tramo a cada lado.
      assert.ok(gate[0] > pavilion.y && gate[1] < south(pavilion));
      assert.ok(west.some((block) => south(block) <= gate[0] + 1e-6) && west.some((block) => block.y >= gate[1] - 1e-6 && block.height > 30));
      // Alrededor del ingreso no hay plantas: ni arbustos ni pinos al sur de la línea de árboles, entre el portón y el pabellón.
      const clear = (item: { x: number; y: number }) => !(item.x < pavilion.x && item.y > pavilion.y - 0.5 && item.y < south(pavilion) + 1 && item.x > hedge[1]);
      assert.ok([...scape.shrubs, ...scape.pines].every(clear), "ingreso despejado");
      const street = scape.pines.filter((pine) => pine.zone === "street");
      if (view === "plan") return assert.equal(street.length, 0, "en planta, solo el seto");
      // Árboles de calle: en la vereda, iguales y a distancia pareja.
      assert.ok(street.length >= 5);
      assert.ok(street.every((pine) => pine.x > sidewalk[0] && pine.x < sidewalk[1] && pine.kind === "low" && !pine.lean));
      assert.equal(new Set(street.map((pine) => pine.size)).size, 1);
      const ys = street.map((pine) => pine.y).sort((a, b) => a - b);
      assert.ok(ys.slice(1).every((y, index) => Math.round((y - ys[index]) * 10) % 80 === 0), "separación regular");
    });

    if (view === "iso") {
      it("iso: ninguna línea de etiqueta pisa el seto perimetral ni un arbusto", () => {
        const scape = landscape("iso");
        for (const court of courts) {
          const x = court.x + court.width / 2;
          for (const block of scape.blocks.filter((item) => item.kind === "perimeter" || item.kind === "hedge" || item.kind === "bed")) {
            assert.ok(!(x > block.x - 0.2 && x < east(block) + 0.2 && south(block) > south(court)), `${block.kind} bajo la línea de ${court.id}`);
          }
          for (const shrub of scape.shrubs.filter((item) => item.y > south(court))) assert.ok(Math.abs(shrub.x - x) > 0.8, `arbusto bajo la línea de ${court.id}`);
        }
      });
    }

    it(`${view}: en el borde sur solo hay arbustos bajos`, () => {
      const scape = landscape(view);
      // Sin paseo, el sur es el fondo de las canchas: césped de lado a lado y arbustos bajos.
      const border = south(courts[0]) + 2.5;
      assert.equal(scape.pines.some((pine) => pine.zone !== "street" && pine.y > border), false);
      assert.ok(scape.shrubs.filter((shrub) => shrub.y > border).length >= 6);
      const lawn = scape.lawns.find((item) => item.y > south(courts[0]) && item.width > 60);
      assert.ok(lawn && south(lawn) - lawn.y > 8, "césped al sur, de lado a lado");
      for (const shrub of scape.shrubs) assert.ok(shrub.size <= 1.4);
    });

    it(`${view}: cada cancha tiene su cerco, con la puerta del lado de la galería`, () => {
      const { fences } = landscape(view);
      assert.deepEqual(fences.map((fence) => fence.id), courts.map((court) => court.id));
      for (const fence of fences) {
        const court = courts.find((item) => item.id === fence.id)!;
        assert.ok(fence.rect.x < court.x && fence.rect.y < court.y && east(fence.rect) > east(court) && south(fence.rect) > south(court));
        // Entre la superficie y el anillo de la cancha elegida (1,4 unidades).
        assert.ok(court.x - fence.rect.x < 1.4);
        const [from, to] = fence.gate;
        assert.ok(from > fence.rect.x && to < east(fence.rect) && to > from);
        assert.ok(Math.abs((from + to) / 2 - (court.x + court.width / 2)) < 1e-9, "la puerta queda centrada, frente a la galería");
        assert.ok(fence.height > 0);
      }
    });

    it(`${view}: Jardín tiene canteros en tres lados, con matas de distintas alturas y flores casi todas blancas`, () => {
      const scape = landscape(view);
      const beds = scape.blocks.filter((block) => block.kind === "bed");
      assert.ok(beds.some((bed) => bed.x > east(jardin) && bed.y >= jardin.y && south(bed) <= south(jardin)), "cantero al este");
      assert.ok(beds.some((bed) => bed.y > south(jardin) && bed.x >= jardin.x && east(bed) <= east(jardin)), "cantero al sur");
      assert.ok(beds.some((bed) => bed.x > east(jardin) && south(bed) <= jardin.y + 0.1 && bed.x > east(pavilion)), "cantero en la esquina noreste, la que sobresale del pabellón");
      for (const bed of beds) assert.ok(bed.x >= jardin.x, "ningún cantero junto a otra cancha");
      const inBed = (x: number, y: number) => beds.some((bed) => x >= bed.x && x <= east(bed) && y >= bed.y && y <= south(bed));
      const mounds = scape.shrubs.filter((shrub) => inBed(shrub.x, shrub.y));
      assert.ok(mounds.length >= 12, `${mounds.length} matas`);
      assert.ok(new Set(mounds.map((mound) => mound.size)).size >= 6, "distintas alturas");
      // No en fila: las del cantero del este no comparten una misma x.
      const eastern = mounds.filter((mound) => mound.x > east(jardin) && mound.y > jardin.y);
      assert.ok(new Set(eastern.map((mound) => Math.round(mound.x * 2))).size >= 4, "repartidas a lo ancho");
      const white = scape.blooms.large.length + scape.blooms.small.length, blue = scape.blooms.deep.length;
      assert.ok(blue > 0 && white > blue * 2.5, `${white} blancas, ${blue} azules`);
      for (const [x, y] of [...scape.blooms.large, ...scape.blooms.deep, ...scape.blooms.small]) assert.ok(inBed(x, y) || mounds.some((mound) => Math.hypot(mound.x - x, mound.y - y) < 1), `flor ${x},${y}`);
    });

    it(`${view}: solo el cerco de Jardín lleva enredadera, al este y al sur, y su césped es más vivo`, () => {
      const scape = landscape(view);
      for (const fence of scape.fences) assert.equal(Boolean(fence.vine), fence.id === jardin.id, fence.id);
      const { vine, rect } = scape.fences.find((fence) => fence.id === jardin.id)!;
      assert.ok(vine!.south < vine!.east, "al sur es baja: no tapa el pie de la cancha");
      assert.ok(scape.fenceVine.dark.length > 20);
      for (const [x, y, z] of [...scape.fenceVine.dark, ...scape.fenceVine.lit]) {
        assert.ok(Math.abs(x - east(rect)) < 1e-9 || Math.abs(y - south(rect)) < 1e-9, "sobre el lado este o el sur");
        assert.ok(z > 0 && z <= vine!.east + 0.3);
      }
      const vivid = scape.lawns.filter((lawn) => lawn.vivid);
      assert.ok(vivid.length >= 1 && vivid.every((lawn) => east(lawn) > jardin.x && lawn.x >= jardin.x - 2), "césped vivo solo alrededor de Jardín");
      // En el borde este ya no hay fila de árboles: quedan uno o dos con flor.
      const trees = scape.pines.filter((pine) => pine.zone === "east");
      assert.ok(trees.length >= 1 && trees.length <= 2 && trees.every((pine) => pine.blossom && pine.kind === "low"));
    });

    it(`${view}: hay elementos principales y de relleno, y los pinos se achican cerca del borde`, () => {
      const scape = landscape(view);
      for (const items of [scape.pines.filter((pine) => pine.kind === "low"), scape.shrubs]) {
        assert.ok(items.some((item) => item.tier === "main") && items.some((item) => item.tier === "fill"));
      }
      for (const pine of scape.pines) assert.ok(pine.size >= MIN_SIZE[pine.kind] - 1e-9 && pine.size <= (pine.kind === "tall" ? 1.35 : 2.6));
      assert.ok(shownScale("plan", "main") === MOBILE_SCALE && shownScale("plan", "fill") === 1 && shownScale("iso", "main") === 1);
    });
  }

  it("la guía de la cancha elegida queda libre entre los canteros al pie de Jardín (planta)", () => {
    const foot = landscape("plan").blocks.filter((block) => block.kind === "bed" && block.y > south(jardin));
    assert.equal(foot.length, 2);
    const center = jardin.x + jardin.width / 2;
    assert.ok(foot.every((bed) => east(bed) < center || bed.x > center));
  });

  it("los pinos de atrás van ordenados de lejos a cerca", () => {
    for (const view of PLAN_VIEWS) {
      const depths = landscape(view).pines.map((pine) => project(view, pine.x, pine.y)[1]);
      assert.deepEqual(depths, [...depths].sort((a, b) => a - b), view);
    }
  });
});
