import { TennisBallIcon } from "@phosphor-icons/react/ssr";
import { ReserveLink } from "@/components/reserve-link";
import "./landing-close.css";

export function FinalCta() {
  return <section className="ronda-final-cta" id="tu-proxima-ronda" tabIndex={-1} aria-labelledby="final-cta-title">
    <p className="eyebrow">Tu próxima ronda</p>
    <div className="final-cta-layout">
      <h2 id="final-cta-title">¿Jugamos<br />otra?</h2>
      <div className="final-cta-action">
        <TennisBallIcon className="final-cta-ball" size={100} weight="light" aria-hidden="true" />
        <p>Elegí tu cancha.<br />Traé ganas de jugar.</p>
        <ReserveLink className="final-reserve" />
      </div>
    </div>
  </section>;
}
