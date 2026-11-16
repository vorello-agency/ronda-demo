"use client";

import { Fragment } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import type { Alternative, Notice } from "@/lib/booking/conflicts";
import { alternativeLabel, noticeText } from "@/lib/booking/copy";

/**
 * Aviso de conflicto con alternativas de un toque. No es una región viva: el anuncio sale de la región única
 * del flujo, para no leerlo dos veces.
 */
export function BookingNotice({ notice, onPick }: { notice: Notice; onPick: (alternative: Alternative) => void }) {
  const alternatives = "alternatives" in notice ? notice.alternatives : [];
  const text = noticeText(notice);
  const sentences = text.split(/(?<=\.)\s+/);
  const shortSentences = sentences.every((sentence) => sentence.length <= 50);
  return <div className="ronda-booking-notice">
    <p>{shortSentences ? sentences.map((sentence, index) => <Fragment key={index}>
      {index > 0 && <br />}{sentence}
    </Fragment>) : text}</p>
    {alternatives.length > 0 && <div className="ronda-booking-notice-options">
      {alternatives.map((alternative) => <button key={`${alternative.court}-${alternative.hour}`} type="button" onClick={() => onPick(alternative)}>
        {alternativeLabel(alternative)} <ArrowRightIcon size={18} weight="light" aria-hidden="true" />
      </button>)}
    </div>}
  </div>;
}
