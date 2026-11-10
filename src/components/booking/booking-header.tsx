import Link from "next/link";
import { Suspense } from "react";
import { StudioCredit } from "@/components/studio-credit";
import { conceptNotice, site } from "@/config/site";
import { BackToClub, BackToClubLink } from "./back-to-club";

/** Header de la página de reservas: la marca y un único regreso al club, sin la navegación de la landing. */
export function BookingHeader() {
  return <header className="site-header ronda-booking-header">
    <Link className="brand" href="/" aria-label={`${site.name} · ${site.descriptor}, volver al club`}>
      <span className="wordmark">{site.name}</span>{" "}
      <span className="brand-descriptor">{site.descriptor}</span>
    </Link>
    {/* La cancha llega por la URL: en el HTML estático el regreso apunta al inicio hasta que el cliente la lee. */}
    <Suspense fallback={<BackToClubLink />}><BackToClub /></Suspense>
  </header>;
}

/** Pie sobrio de una página de tarea: la atribución del estudio y los avisos obligatorios del proyecto conceptual. */
export function BookingFooter() {
  return <footer className="ronda-booking-footer">
    <StudioCredit />
    <p className="ronda-booking-footer-notice">{conceptNotice}</p>
  </footer>;
}
