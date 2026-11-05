import Image from "next/image";
import { ArrowDownRightIcon } from "@phosphor-icons/react/dist/ssr";
import { site } from "@/config/site";

export function CommunityIntro() {
  return <section className="community-intro" id="el-club" tabIndex={-1} aria-labelledby="community-title">
    <div className="community-copy">
      <p className="eyebrow">La vida en {site.name}</p>
      <h2 id="community-title">El partido sigue<br className="mobile-break" /> fuera de la cancha<span className="accent" aria-hidden="true">.</span></h2>
    </div>
    <figure className="community-figure">
      <div className="community-photo">
      <Image src="/images/community-crop-1499.webp" alt="Dos socios conversan con sus raquetas junto al pabellón después de jugar." width={1499} height={849} sizes="(min-width: 768px) 46vw, 100vw" quality={85} />
      </div>
      <figcaption className="community-caption"><span>Al otro lado de la red</span><span>El encuentro continúa</span></figcaption>
    </figure>
    <div className="club-description">
      <p className="club-lead">La cancha es el punto de partida.</p>
      <p>Un pabellón abierto al juego. Hormigón, madera y vidrio entre el verde y la arcilla. Un lugar pensado para pasar de la intensidad del partido a la calma de una charla.</p>
      <a className="text-link club-community-link" href="#comunidad">Seguí la ronda <ArrowDownRightIcon size={24} weight="light" aria-hidden="true" /></a>
    </div>
  </section>;
}
