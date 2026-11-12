import Image from "next/image";
import "./landing-close.css";

export function TournamentsSection() {
  return <section className="ronda-tournaments" id="torneos" tabIndex={-1} aria-labelledby="tournaments-title">
    <header className="tournaments-heading">
      <div className="tournaments-topline">
        <p className="eyebrow">Torneos y encuentros</p>
      </div>
      <h2 id="tournaments-title">Cada cruce,<br />otra historia<span className="accent" aria-hidden="true">.</span></h2>
    </header>
    <figure className="tournaments-photo">
      <div className="tournaments-photo-frame">
        <Image src="/images/tournaments/match.webp" width={1536} height={1024} alt="Dos jugadores disputan un punto en arcilla; el jugador más cercano prepara un golpe de derecha y su rival espera al otro lado de la red." sizes="100vw" quality={85} />
      </div>
      <figcaption><span>De un lado, las ganas.</span><span>Del otro, un nuevo desafío.</span></figcaption>
    </figure>
    <div className="tournaments-story">
      <p className="tournaments-manifesto">Hay puntos que se disputan.<br />Y partidos que nos acercan.</p>
      <dl className="tournaments-formats">
        <div>
          <dt>Torneos del club</dt>
          <dd>Probá tu juego en cruces con personas de un nivel similar.{" "}<span className="editorial-break">Competí, aprendé y volvé por la revancha.</span></dd>
        </div>
        <div>
          <dt>Encuentros de dobles</dt>
          <dd>Armá pareja, cambiá de compañero y encontrá el ritmo de jugar en equipo.{" "}<span className="editorial-break">El partido también se comparte.</span></dd>
        </div>
      </dl>
    </div>
  </section>;
}
