"use client";

/**
 * Barra fija en celular: repite la selección mientras «Tu turno» queda fuera de la pantalla. Su botón siempre se ve:
 * con la selección completa lleva a confirmar («Revisar»); si falta algo, lleva a elegirlo.
 * Oculta, se corre hacia abajo y queda con `visibility: hidden`, así sale del orden de tabulación y de los lectores
 * de pantalla, que ya tienen el resumen. Por encima de 767 px no se muestra.
 */
export function BookingBar({ text, visible, missing, onReview }: { text: string; visible: boolean; missing: "court" | "hour" | null; onReview: () => void }) {
  return <div className="ronda-booking-bar" data-visible={visible && text !== "" ? "true" : "false"}>
    <p className="ronda-booking-bar-text">{text}</p>
    <button type="button" className="button" onClick={onReview}>
      {missing === "court" ? "Elegir cancha" : missing === "hour" ? "Elegir hora" : <>Revisar<span className="sr-only"> tu turno</span></>}
    </button>
  </div>;
}
