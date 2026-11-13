import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { ReservationCourt } from "@/data/courts";
import { bookingHref } from "@/lib/booking/selection";

type Props = { className?: string; arrow?: boolean; court?: ReservationCourt; onClick?: () => void };

/**
 * Acceso a la página de reservas. Es un enlace (no abre un aviso): con cancha, llega a `/reservar` con esa cancha
 * elegida. El nombre accesible de «Reservar esta cancha» nombra la cancha, como antes.
 */
export function ReserveLink({ className = "", arrow = true, court, onClick }: Props) {
  return <Link
    className={`button ${className}`}
    href={bookingHref(court?.id)}
    aria-label={court ? `Reservar esta cancha: ${court.id} ${court.name}` : undefined}
    onClick={onClick}
  >
    {court ? "Reservar esta cancha" : "Reservar cancha"}
    {arrow && <ArrowRightIcon size={24} weight="light" aria-hidden="true" />}
  </Link>;
}
