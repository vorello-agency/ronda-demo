"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

/** Avisa al cambiar cada minuto (alineado al reloj) y al volver a la pestaña, por si quedó suspendida. */
function subscribe(notify: () => void) {
  let interval: ReturnType<typeof setInterval> | undefined;
  const timeout = setTimeout(() => {
    notify();
    interval = setInterval(notify, MINUTE);
  }, MINUTE - (Date.now() % MINUTE));
  const onVisible = () => { if (document.visibilityState === "visible") notify(); };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearTimeout(timeout);
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** El instante actual redondeado al minuto: estable entre lecturas, cambia una vez por minuto. */
const getSnapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;
/** En el servidor no hay «ahora» (la página es estática): el flujo muestra el esqueleto. */
const getServerSnapshot = () => null;

/** «Ahora» con resolución de minuto. Toda la lógica lo recibe como argumento; nada más lee el reloj. */
export function useClubNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
