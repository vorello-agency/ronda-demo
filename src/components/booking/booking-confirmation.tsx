"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { courts } from "@/data/courts";
import { confirmationScore, wayfindingText } from "@/lib/booking/copy";
import { clubHref } from "@/lib/booking/selection";
import type { Booking } from "@/lib/booking/types";

type Props = { booking: Booking; wayfinding: ReactNode; titleRef: Ref<HTMLHeadingElement>; onAgain: () => void };

/**
 * Confirmación de la reserva simulada (diseño aprobado). Reemplaza la apertura y el flujo; el foco va al título.
 * La fotografía se carga recién acá, cuando hay una cancha confirmada. «Atrás» sale de la página: la confirmación
 * es estado en memoria y no deja entradas en el historial.
 */
export function BookingConfirmation({ booking, wayfinding, titleRef, onAgain }: Props) {
  const court = courts.find((item) => item.id === booking.court) ?? courts[0];
  return <section className="ronda-confirm" aria-labelledby="ronda-confirm-title">
    <div className="ronda-confirm-head">
      <p className="eyebrow">Reserva simulada · confirmada</p>
      <h1 className="ronda-confirm-title" id="ronda-confirm-title" tabIndex={-1} ref={titleRef}>
        Nos vemos en la cancha<span className="ronda-booking-dot" aria-hidden="true">.</span>
      </h1>
    </div>

    <figure className="ronda-confirm-photo">
      <div className="ronda-confirm-image">
        <Image src={court.image.src} alt={court.image.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" quality={85} />
      </div>
      <figcaption><span className="ronda-confirm-badge">{court.id}</span> {court.name} · {court.surface === "Arcilla" ? court.surface : court.surfaceDetail}</figcaption>
    </figure>

    <div className="ronda-confirm-rest">
      <dl className="ronda-confirm-score">
        {confirmationScore(booking).map((item) => <div key={item.label}>
          <dt>{item.label}</dt>
          <dd><strong>{item.value}</strong> <span>{item.detail}</span></dd>
        </div>)}
      </dl>

      <div className="ronda-confirm-way">
        <div className="ronda-wayfinding" data-court={booking.court}>{wayfinding}</div>
        <div>
          <h2 className="eyebrow">Cómo llegar</h2>
          <p>{wayfindingText(booking.court)}</p>
        </div>
      </div>

      <p className="ronda-confirm-note">Esta confirmación es parte de una demostración: no se reservó ninguna cancha ni se procesó un pago.</p>

      <div className="ronda-confirm-actions">
        <button type="button" className="button" onClick={onAgain}>
          Hacer otra reserva <ArrowRightIcon size={20} weight="light" aria-hidden="true" />
        </button>
        <Link className="text-link" href={clubHref(booking.court)}>
          Volver al club <ArrowRightIcon size={20} weight="light" aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>;
}
