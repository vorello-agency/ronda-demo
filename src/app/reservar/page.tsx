import type { Metadata } from "next";
import { site } from "@/config/site";
import { BookingFooter, BookingHeader } from "@/components/booking/booking-header";
import { BookingIntro } from "@/components/booking/booking-intro";
import { BookingSkeleton } from "@/components/booking/booking-skeleton";
import "@/components/booking/booking.css";

// Solo título y descripción: `openGraph`, `robots` y el resto se heredan del layout raíz.
export const metadata: Metadata = {
  title: `Reservá tu cancha · ${site.name} · ${site.descriptor}`,
  description: `Demostración de reservas de ${site.name}: elegí cancha, día y horario con disponibilidad simulada. No se realizan reservas ni pagos reales. Proyecto conceptual de ${site.studio}.`,
};

export default function ReservarPage() {
  return <div className="ronda-booking">
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <BookingHeader />
    <main id="contenido" tabIndex={-1}>
      <BookingIntro />
      <BookingSkeleton />
    </main>
    <BookingFooter />
  </div>;
}
