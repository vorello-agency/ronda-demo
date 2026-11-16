import type { Metadata } from "next";
import { Suspense } from "react";
import { site } from "@/config/site";
import { BookingFooter, BookingHeader } from "@/components/booking/booking-header";
import { BookingIntro } from "@/components/booking/booking-intro";
import { BookingFlow } from "@/components/booking/booking-flow";
import { BookingSkeleton } from "@/components/booking/booking-skeleton";
import { ClubPlanArt } from "@/components/booking/club-plan-art";
import { ClubWayfindingArt } from "@/components/booking/club-wayfinding-art";
import "@/components/booking/booking.css";

// Título, descripción y canonical propios: `openGraph`, `robots` y el resto se heredan del layout raíz.
export const metadata: Metadata = {
  alternates: { canonical: "/reservar" },
  title: `Reservá tu cancha · ${site.name} · ${site.descriptor}`,
  description: `Demostración de reservas de ${site.name}: elegí cancha, día y horario con disponibilidad simulada. No se realizan reservas ni pagos reales. Proyecto conceptual de ${site.studio}.`,
};

export default function ReservarPage() {
  // Los dibujos y la apertura se renderizan una vez en el servidor y se pasan al esqueleto y al flujo: no viajan en el
  // JavaScript del cliente. La apertura va dentro del flujo porque la confirmación la reemplaza por su propio título.
  const art = <ClubPlanArt />;
  const intro = <BookingIntro />;
  const skeleton = <>{intro}<BookingSkeleton art={art} /></>;
  return <div className="ronda-booking">
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <BookingHeader />
    <main id="contenido" tabIndex={-1}>
      {/* useSearchParams en una ruta estática: el flujo se monta en el cliente y el esqueleto ocupa su lugar hasta entonces. */}
      <Suspense fallback={skeleton}>
        <BookingFlow art={art} intro={intro} wayfinding={<ClubWayfindingArt />} fallback={skeleton} />
      </Suspense>
    </main>
    <BookingFooter />
  </div>;
}
