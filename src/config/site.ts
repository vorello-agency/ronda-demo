/** Provisional identity. Change the name here; components derive it from this source. */
export const site = {
  name: "Ronda",
  descriptor: "Club de Tenis",
  title: "El juego tiene lugar.",
  description: "Canchas para jugar. Un club para volver.",
  studio: "Vorello Agency",
} as const;

export const navigation: readonly ({ label: string; href: string } | { label: string; topic: NoticeTopic })[] = [
  { label: "El club", href: "#el-club" },
  { label: "Canchas", href: "#canchas" },
  { label: "Entrenamiento", href: "#entrenamiento" },
  { label: "Comunidad", href: "#comunidad" },
] as const;

export const footerNavigation = [
  ...navigation.flatMap((item) => "href" in item ? [item] : []),
  { label: "Torneos y encuentros", href: "#torneos" },
  { label: "Instalaciones", href: "#instalaciones" },
] as const;

export const notices = {
  reservation: {
    eyebrow: "Proyecto conceptual",
    title: "Nos vemos en la cancha.",
    body: "Esta es una experiencia de demostración. Las reservas todavía no están habilitadas y no se realizan reservas ni pagos reales.",
  },
  training: {
    eyebrow: "Entrenamiento",
    title: "Tu punto de partida.",
    body: "Estas modalidades forman parte de un proyecto conceptual. No hay inscripciones, horarios ni clases disponibles para contratar. Podés recorrer la propuesta y explorar distintas formas de entrenar.",
  },
} as const;
export type NoticeTopic = keyof typeof notices;
