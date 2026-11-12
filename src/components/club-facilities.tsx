import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { bookingHref } from "@/lib/booking/selection";

export function ClubFacilities() {
  return <section className="ronda-facilities" id="instalaciones" tabIndex={-1} aria-labelledby="facilities-title">
    <header className="ronda-facilities-heading">
      <p className="eyebrow">Instalaciones · El pabellón</p>
      <h2 id="facilities-title">Entre punto<br />y punto.</h2>
      <p>Hormigón, madera y vidrio.{" "}<span className="editorial-break">Una arquitectura abierta al tenis, con lugar para prepararte, descansar y seguir el partido desde afuera.</span></p>
    </header>
    <div className="ronda-facilities-layout">
      <figure className="ronda-facilities-photo">
        <Image src="/images/courts/pavilion.webp" width={1586} height={992} alt="Galería cubierta del pabellón, con bancos y mesas de madera junto a la cancha de arcilla." sizes="(min-width: 1024px) 65vw, 100vw" quality={85} />
        <figcaption>El pabellón · Siempre cerca del juego</figcaption>
      </figure>
      <div className="ronda-facilities-side">
        <dl className="ronda-facilities-list">
          <div><dt>Galería cubierta</dt><dd>Una pausa a la sombra, con el juego a la vista.</dd></div>
          <div><dt>Terraza junto a las canchas</dt><dd>Mesas, bancos y una charla que puede durar otro set.</dd></div>
          <div><dt>Vestuarios y duchas</dt><dd>Un espacio para cambiarte antes de entrar y después de jugar.</dd></div>
        </dl>
        <Link className="text-link" href={bookingHref()}>Reservá tu cancha <ArrowRightIcon size={20} weight="light" aria-hidden="true" /></Link>
      </div>
    </div>
  </section>;
}
