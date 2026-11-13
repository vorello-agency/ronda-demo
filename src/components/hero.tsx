import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { ReserveLink } from "./reserve-link";

export function Hero() {
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-copy">
      <h1 id="hero-title" className="hero-title">
        <span>El juego</span>{" "}<span>Tiene lugar<span className="accent" aria-hidden="true">.</span></span>
      </h1>
      <p className="hero-description">Canchas para jugar.<br />Un club para volver.</p>
      <ReserveLink className="hero-reserve" />
      <a className="text-link hero-tour" href="#el-club">Recorré el club <ArrowRightIcon size={22} weight="light" aria-hidden="true" /></a>
    </div>
    <figure className="hero-figure">
      <picture className="hero-photo">
        {/* Una sola foto en todos los anchos: en celular se muestra entera (3:2) en lugar de una franja recortada. */}
        <img src="/images/hero-1536.webp" srcSet="/images/hero-960.webp 960w, /images/hero-1536.webp 1536w" sizes="(min-width: 768px) 72vw, 100vw" width={1536} height={1024} alt="Dos jugadores en una cancha de arcilla, frente al pabellón de hormigón y madera del club." fetchPriority="high" loading="eager" />
      </picture>
      <figcaption className="court-caption" id="cancha-02" tabIndex={-1}>
        <span className="court-line" aria-hidden="true" />
        <span className="court-number"><span className="sr-only">Cancha </span>02</span>
        <span className="court-name">Central <span className="court-surface-desktop">/ Polvo de ladrillo</span><span className="court-surface-mobile">· Arcilla</span></span>
        <a className="text-link mobile-tour" href="#el-club">Recorré el club <ArrowRightIcon size={21} weight="light" aria-hidden="true" /></a>
      </figcaption>
    </figure>
  </section>;
}
