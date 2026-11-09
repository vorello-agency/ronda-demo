"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import type { Alternative, Notice } from "@/lib/booking/conflicts";
import { alternativeLabel, noticeText } from "@/lib/booking/copy";

/**
 * Aviso de conflicto con alternativas de un toque. No es una región viva: el anuncio sale de la región única
 * del flujo, para no leerlo dos veces.
 */
export function BookingNotice({ notice, onPick }: { notice: Notice; onPick: (alternative: Alternative) => void }) {
  const alternatives = "alternatives" in notice ? notice.alternatives : [];
  return <div className="ronda-booking-notice">
    <p>{noticeText(notice)}</p>
    {alternatives.length > 0 && <div className="ronda-booking-notice-options">
      {alternatives.map((alternative) => <button key={`${alternative.court}-${alternative.hour}`} type="button" onClick={() => onPick(alternative)}>
        {alternativeLabel(alternative)} <ArrowRightIcon size={18} weight="light" aria-hidden="true" />
      </button>)}
    </div>}
  </div>;
}
