"use client";

import { useState, type FocusEvent, type KeyboardEvent } from "react";

const MOVES: Record<string, (index: number, last: number) => number> = {
  ArrowRight: (index) => index + 1,
  ArrowDown: (index) => index + 1,
  ArrowLeft: (index) => index - 1,
  ArrowUp: (index) => index - 1,
  Home: () => 0,
  End: (_, last) => last,
};

/**
 * Grupo de botones con una sola parada de Tab y flechas para recorrerlo («roving tabindex»).
 * La activación es manual (Enter o Espacio): recorrer las canchas no las elige ni dispara conflictos.
 * Al volver con Tab, el foco cae en el elemento elegido; mientras se recorre, en el último enfocado.
 */
export function useRoving<K extends string | number>(keys: readonly K[], preferred: K | null) {
  const [focused, setFocused] = useState<K | null>(null);
  const active = focused !== null && keys.includes(focused) ? focused : preferred !== null && keys.includes(preferred) ? preferred : keys[0];

  const itemProps = (key: K) => ({
    tabIndex: key === active ? 0 : -1,
    onFocus: () => setFocused(key),
    "data-roving-item": "",
  });

  const groupProps = {
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const move = MOVES[event.key];
      if (!move) return;
      const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-roving-item]")];
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (index < 0) return;
      event.preventDefault();
      const next = items[(move(index, items.length - 1) + items.length) % items.length];
      next.focus();
      next.scrollIntoView({ block: "nearest", inline: "nearest" });
    },
    onBlur(event: FocusEvent<HTMLElement>) {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(null);
    },
  };

  return { itemProps, groupProps };
}
