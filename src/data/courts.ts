export const courts = [
  {
    id: "01", name: "Club", anchor: "cancha-club",
    surface: "Dura", surfaceDetail: "Acrílica azul", lighting: "Iluminación LED", setting: "Al aire libre",
    character: "Cerca de todo.",
    description: ["La primera cancha al llegar. Una superficie dura para buscar la línea y cambiar el ritmo.", "Un plano azul, con el pabellón de frente."],
    image: { src: "/images/courts/central.webp", width: 1586, height: 992, alt: "Cancha Club de superficie dura azul, con red, cerco perimetral y el pabellón de hormigón y madera al fondo." },
  },
  {
    id: "02", name: "Central", anchor: "cancha-central",
    surface: "Arcilla", surfaceDetail: "Polvo de ladrillo", lighting: "Iluminación LED", setting: "Al aire libre",
    character: "En el centro del juego.",
    description: ["La arcilla del medio, frente al pabellón.", "Un lugar para sostener el peloteo, variar las alturas y elegir cuándo atacar."],
    image: { src: "/images/hero-1536.webp", width: 1536, height: 1024, alt: "Dos jugadores disputan un punto en Central, la cancha de arcilla frente al pabellón de hormigón y madera y los pinos." },
  },
  {
    id: "03", name: "Jardín", anchor: "cancha-jardin",
    surface: "Arcilla", surfaceDetail: "Polvo de ladrillo", lighting: "Iluminación LED", setting: "Al aire libre",
    character: "Tiempo para construir.",
    description: ["Entre árboles y líneas blancas, un lugar para alargar el intercambio y encontrar tu propio ritmo. La arcilla invita a trabajar cada punto."],
    image: { src: "/images/courts/club.webp", width: 1122, height: 1402, alt: "Red y líneas blancas sobre la arcilla de Jardín, con el pabellón a la izquierda y pinos al fondo." },
  },
] as const;

export type Court = (typeof courts)[number];
export type ReservationCourt = Pick<Court, "id" | "name" | "surface">;
