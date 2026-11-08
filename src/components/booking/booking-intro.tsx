/** Apertura de la página: título y aviso de demostración, siempre visibles antes del flujo. */
export function BookingIntro() {
  return <div className="ronda-booking-intro">
    <h1 className="ronda-booking-title" id="ronda-booking-title">
      <span>Reservá</span> <span>tu cancha<span className="ronda-booking-dot" aria-hidden="true">.</span></span>
    </h1>
    <p className="ronda-booking-demo">
      <strong>Demostración</strong>{" "}
      Disponibilidad simulada. No se realizan reservas ni pagos reales.
    </p>
  </div>;
}
