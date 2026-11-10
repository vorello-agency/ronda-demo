import { ArrowUpIcon } from "@phosphor-icons/react/ssr";
import { ReserveLink } from "@/components/reserve-link";
import { StudioCredit } from "@/components/studio-credit";
import { conceptNotice, footerNavigation, site } from "@/config/site";
import { HOURS } from "@/lib/booking/club-time";
import "./landing-close.css";

/** Horario de la simulación de reservas: el primer turno empieza a las 08 y el último termina a las 22. */
const openingHours = `Todos los días · ${String(HOURS[0]).padStart(2, "0")} a ${HOURS[HOURS.length - 1] + 1} h`;

export function SiteFooter() {
  return <footer className="ronda-footer" aria-label={`${site.name} · ${site.descriptor}`}>
    <div className="footer-top">
      <div className="footer-intro">
        <p className="eyebrow">{site.name} · {site.descriptor}</p>
        <p className="footer-tagline">El juego nos trae.<br />La ronda sigue.</p>
        <p className="footer-hours">{openingHours}</p>
      </div>
      <nav aria-labelledby="footer-nav-title">
        <p className="eyebrow" id="footer-nav-title">Recorré {site.name}</p>
        <div className="footer-section-links">
          {footerNavigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </div>
      </nav>
      <div className="footer-actions">
        <ReserveLink className="footer-reserve" />
        <a className="footer-top-link" href="#inicio">Volver arriba <ArrowUpIcon size={20} weight="light" aria-hidden="true" /></a>
      </div>
    </div>
    <p className="footer-wordmark" aria-hidden="true">{site.name}</p>
    <div className="footer-bottom">
      <StudioCredit />
      <p className="footer-notice">{conceptNotice}</p>
    </div>
  </footer>;
}
