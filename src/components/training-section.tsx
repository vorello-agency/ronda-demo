import Image from "next/image";
import { TennisBallIcon } from "@phosphor-icons/react/ssr";
import { TrainingInfoButton } from "@/components/experience-actions";
import { TrainingAccordion } from "./training-accordion";
import "./training-section.css";

const programs = [
  {
    id: "empezar",
    title: "Empezar",
    format: "Iniciación al tenis",
    description: "No necesitás haber jugado. Empezá por el agarre, el movimiento y esos primeros peloteos que dan ganas de seguir.",
    focus: "De tu primer golpe a tu primer intercambio.",
  },
  {
    id: "a-tu-medida",
    title: "A tu medida",
    format: "Clases individuales",
    description: "Dale tiempo a ese golpe que querés mejorar. Trabajá la técnica, los desplazamientos y las decisiones de juego con atención individual.",
    focus: "Un espacio para afinar tu juego, a tu ritmo.",
  },
  {
    id: "en-grupo",
    title: "En grupo",
    format: "Entrenamiento compartido",
    description: "Sumá ritmo con otras personas de un nivel similar. Ejercicios, peloteos y situaciones de partido para aprender también del otro lado de la red.",
    focus: "Más intercambio. Nuevas formas de jugar.",
  },
] as const;

export function TrainingSection() {
  return <section className="ronda-training" id="entrenamiento" tabIndex={-1} aria-labelledby="training-title">
    <header className="training-heading">
      <p className="eyebrow">Entrenamiento · Encontrá tu juego</p>
      <h2 id="training-title">El juego<br />se entrena<span className="accent" aria-hidden="true">.</span></h2>
      <div className="training-intro">
        <TennisBallIcon size={44} weight="light" aria-hidden="true" />
        <p>Tu primera vez con una raqueta.{" "}<span className="editorial-break">Ese golpe que querés mejorar.</span>{" "}<span className="editorial-break">Siempre hay un punto desde donde empezar.</span></p>
      </div>
    </header>

    <div className="training-main">
      <figure className="training-lesson">
        <div className="training-lesson-image">
          <Image src="/images/training/lesson.webp" width={1536} height={1024} alt="Una instructora muestra el agarre de la raqueta a una jugadora en la cancha de arcilla." sizes="(min-width: 1024px) 54vw, (min-width: 768px) 50vw, 100vw" quality={85} />
        </div>
        <figcaption><span>Aprender, de cerca.</span><span>Dentro de la cancha.</span></figcaption>
      </figure>

      <div className="training-programs">
        <p className="training-programs-label">Tres formas de entrar en juego</p>
        <TrainingAccordion programs={programs} />
        <TrainingInfoButton className="training-info" />
      </div>
    </div>

    <div className="training-practice">
      <div className="training-practice-copy">
        <p className="eyebrow">Del ejercicio al punto</p>
        <h3>Probá. Ajustá.<br />Volvé a jugar.</h3>
        <p>Mejorar también es darte espacio para probar.{" "}<span className="editorial-break">Entendé el gesto, practicalo y encontrá cómo llevarlo a tu juego.</span></p>
      </div>
      <figure className="training-action">
        <Image src="/images/training/practice.webp" width={1122} height={1402} alt="Una jugadora termina un golpe de derecha en movimiento sobre la arcilla, con otro jugador al fondo." sizes="(min-width: 1024px) 28vw, (min-width: 768px) 35vw, 50vw" quality={85} />
        <figcaption>Un golpe. Otra posibilidad.</figcaption>
      </figure>
    </div>
  </section>;
}
