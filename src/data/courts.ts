export const courts = [
  {
    id: "01", name: "Central", anchor: "cancha-central",
    surface: "Dura", surfaceDetail: "Acrílica azul", lighting: "Iluminación LED", setting: "Al aire libre",
    character: "El punto, de frente.",
    description: ["Una superficie dura para buscar la línea y cambiar el ritmo.", "Un plano azul, espacio abierto y una vista franca al pabellón."],
    image: { src: "/images/courts/central.webp", width: 1586, height: 992, alt: "Cancha Central de superficie dura azul, con iluminación perimetral y el pabellón de hormigón y madera al fondo." },
  },
  {
    id: "02", name: "Jardín", anchor: "cancha-jardin",
    surface: "Arcilla", surfaceDetail: "Polvo de ladrillo", lighting: "Iluminación LED", setting: "Al aire libre",
    character: "Tiempo para construir.",
    description: ["Entre árboles y líneas blancas, un lugar para alargar el intercambio y encontrar tu propio ritmo. La arcilla invita a trabajar cada punto."],
    image: { src: "/images/hero-1536.webp", width: 1536, height: 1024, alt: "Dos jugadores intercambian un punto en Jardín, la cancha de arcilla frente al pabellón y los árboles." },
  },
  {
    id: "03", name: "Club", anchor: "cancha-club",
    surface: "Arcilla", surfaceDetail: "Polvo de ladrillo", lighting: "Iluminación LED", setting: "Al aire libre",
    character: "Cerca de todo.",
    description: ["La arcilla junto al pabellón. El juego a un paso de la galería, para volver a la cancha después de una pausa."],
    image: { src: "/images/courts/club.webp", width: 1122, height: 1402, alt: "Red y líneas blancas sobre la arcilla de Club, junto a la galería del pabellón y la vegetación." },
  },
] as const;

export type Court = (typeof courts)[number];
export type ReservationCourt = Pick<Court, "id" | "name" | "surface">;
