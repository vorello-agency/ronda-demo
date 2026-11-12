import { ArrowDownRightIcon } from "@phosphor-icons/react/dist/ssr";
import { site } from "@/config/site";

export function CommunityStory() {
  return (
    <section className="community-story" id="comunidad" tabIndex={-1} aria-labelledby="community-story-title">
      <div className="community-story-heading">
        <p className="eyebrow">Comunidad · A nuestro ritmo</p>
        <h2 id="community-story-title">Distintos niveles.<br />Un mismo club.</h2>
        <div className="community-court-mark" aria-hidden="true"><span /></div>
      </div>
      <div className="community-story-copy">
        <p className="community-manifesto">Venís por el tenis.<br />Volvés por lo que se arma alrededor.</p>
        <p>En {site.name} imaginamos el club como un punto de encuentro.</p>
        <p className="editorial-continuation">Para quienes cuentan cada punto y para quienes están encontrando su juego. Con ganas de competir, de compartir y de volver a cruzarse.</p>
        <dl className="community-moments">
          <div><dt>En la cancha</dt><dd>Un singles, un dobles. El desafío de jugar con alguien más.</dd></div>
          <div><dt>Entre partidos</dt><dd>Bajar un cambio, comentar ese punto y hacer lugar a la próxima charla.</dd></div>
        </dl>
        <a className="text-link community-next" href="#hacia-las-canchas">De vuelta al juego <ArrowDownRightIcon size={24} weight="light" aria-hidden="true" /></a>
      </div>
    </section>
  );
}
