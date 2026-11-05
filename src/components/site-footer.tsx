import { ArrowUpIcon } from "@phosphor-icons/react/ssr";
import { ReserveButton } from "@/components/experience-actions";
import { footerNavigation, site } from "@/config/site";
import "./landing-close.css";

export function SiteFooter() {
  return <footer className="ronda-footer" aria-label={`${site.name} · ${site.descriptor}`}>
    <div className="footer-top">
      <div className="footer-intro">
        <p className="eyebrow">{site.name} · {site.descriptor}</p>
        <p>El juego nos trae.<br />La ronda sigue.</p>
      </div>
      <nav aria-labelledby="footer-nav-title">
        <p className="eyebrow" id="footer-nav-title">Recorré {site.name}</p>
        <div className="footer-section-links">
          {footerNavigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </div>
      </nav>
      <div className="footer-actions">
        <ReserveButton className="footer-reserve" />
        <a className="footer-top-link" href="#inicio">Volver arriba <ArrowUpIcon size={20} weight="light" aria-hidden="true" /></a>
      </div>
    </div>
    <p className="footer-wordmark" aria-hidden="true">{site.name}</p>
    <div className="footer-bottom">
      <p>Diseño y desarrollo<br /><span>{site.studio}</span></p>
      <p>Proyecto conceptual. El club, las instalaciones y las actividades son ficticios. Fotografías generadas con IA.</p>
    </div>
  </footer>;
}
