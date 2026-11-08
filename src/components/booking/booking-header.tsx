import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { site } from "@/config/site";

/** Header de la página de reservas: la marca y un único regreso al club, sin la navegación de la landing. */
export function BookingHeader() {
  return <header className="site-header ronda-booking-header">
    <Link className="brand" href="/" aria-label={`${site.name} · ${site.descriptor}, volver al club`}>
      <span className="wordmark">{site.name}</span>{" "}
      <span className="brand-descriptor">{site.descriptor}</span>
    </Link>
    <Link className="text-link ronda-booking-back" href="/">
      Volver al club <ArrowRightIcon size={20} weight="light" aria-hidden="true" />
    </Link>
  </header>;
}

/** Pie con los avisos obligatorios del proyecto conceptual. */
export function BookingFooter() {
  return <footer className="ronda-booking-footer">
    <p>Diseño y desarrollo · <span>{site.studio}</span></p>
    <p>Proyecto conceptual. El club, las instalaciones y las actividades son ficticios. Fotografías generadas con IA.</p>
  </footer>;
}
