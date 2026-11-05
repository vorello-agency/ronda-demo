/** Provisional identity. Change the name here; components derive it from this source. */
export const site = {
  name: "Ronda",
  descriptor: "Club de Tenis",
  title: "El juego tiene lugar.",
  description: "Canchas para jugar. Un club para volver.",
  studio: "Vorello Agency",
} as const;

export const navigation: readonly ({ label: string; href: string } | { label: string; topic: NoticeTopic })[] = [
] as const;

export const notices = {
  reservation: {
    eyebrow: "Proyecto conceptual",
    title: "Nos vemos en la cancha.",
    body: "Esta es una experiencia de demostración. Las reservas todavía no están habilitadas y no se realizan reservas ni pagos reales.",
  },
} as const;
export type NoticeTopic = keyof typeof notices;
