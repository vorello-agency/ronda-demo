"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { clubHref } from "@/lib/booking/selection";

/**
 * «Volver al club» del header de reservas. Lee la cancha de la URL, que el flujo mantiene como espejo de la selección,
 * así que el destino acompaña cada cambio sin compartir estado con el flujo.
 */
export function BackToClub() {
  const court = useSearchParams().get("cancha");
  return <BackToClubLink href={clubHref(court)} />;
}

export function BackToClubLink({ href = "/" }: { href?: string }) {
  return <Link className="text-link ronda-booking-back" href={href}>
    Volver al club <ArrowRightIcon size={20} weight="light" aria-hidden="true" />
  </Link>;
}
