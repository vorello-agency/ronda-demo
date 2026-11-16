import { courts } from "@/data/courts";

/** Transición editorial hacia la sección de canchas: enlaza a cada cancha. */
export function CourtsTransition() {
  return (
    <aside className="courts-transition" id="hacia-las-canchas" tabIndex={-1} aria-labelledby="courts-transition-title">
      <div className="courts-transition-heading">
        <p className="eyebrow">Canchas · El próximo punto</p>
        <h2 id="courts-transition-title">Elegí dónde<br />jugar.</h2>
      </div>
      <div className="courts-transition-copy">
        <p>Del pabellón a la línea de fondo.{" "}<span className="editorial-break">Tres canchas, distintas superficies y el mismo impulso: salir a jugar.</span></p>
        <p className="courts-index">{courts.map(court => <a key={court.id} href={`#${court.anchor}`}><b>{court.id}</b> {court.name}</a>)}</p>
      </div>
    </aside>
  );
}
