"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { ArrowUpRightIcon, XIcon } from "@phosphor-icons/react";
import { notices, type NoticeTopic } from "@/config/site";
import { containDialogFocus } from "@/lib/dialog";
import type { ReservationCourt } from "@/data/courts";

type OpenNotice = (topic: NoticeTopic, returnTo?: HTMLElement, court?: ReservationCourt) => void;
const ActionsContext = createContext<OpenNotice | null>(null);

export function useExperienceActions() {
  const context = useContext(ActionsContext);
  if (!context) throw new Error("ExperienceActions is required");
  return context;
}

export function ExperienceActions({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [notice, setNotice] = useState<{ topic: NoticeTopic; court?: ReservationCourt }>({ topic: "reservation" });
  const { topic, court } = notice;
  const destination = topic === "training" ? "entrenamiento" : court ? "canchas" : "el-club";

  const open: OpenNotice = (nextTopic, returnTo, selectedCourt) => {
    returnFocus.current = returnTo ?? (document.activeElement as HTMLElement);
    setNotice({ topic: nextTopic, court: nextTopic === "reservation" ? selectedCourt : undefined });
    dialog.current?.showModal();
    document.body.classList.add("has-modal");
  };

  const close = () => dialog.current?.close();

  return (
    <ActionsContext value={open}>
      {children}
      <dialog
        ref={dialog}
        className="notice-dialog"
        aria-labelledby="notice-title"
        aria-describedby="notice-description"
        onKeyDown={containDialogFocus}
        onClose={() => {
          document.body.classList.remove("has-modal");
          returnFocus.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <div className="notice-content">
          <button className="icon-button notice-close" onClick={close} aria-label="Cerrar aviso" autoFocus>
            <XIcon size={26} weight="light" aria-hidden="true" />
          </button>
          <p className="eyebrow">{notices[topic].eyebrow}</p>
          <h2 id="notice-title">{court ? `${court.id} · ${court.name}` : notices[topic].title}</h2>
          <p id="notice-description">{court && <span>Elegiste {court.name} ({court.surface.toLowerCase()}). </span>}{notices[topic].body}</p>
          <a className="button" href={`#${destination}`} onClick={() => {
            close();
            returnFocus.current = document.getElementById(destination);
          }}>{topic === "training" ? "Volver a entrenamiento" : court ? "Volver a las canchas" : "Conocer el club"} <ArrowUpRightIcon size={22} weight="light" aria-hidden="true" /></a>
        </div>
      </dialog>
    </ActionsContext>
  );
}

export function ReserveButton({ className = "", arrow = true, court }: { className?: string; arrow?: boolean; court?: ReservationCourt }) {
  const open = useExperienceActions();
  return <button className={`button ${className}`} aria-label={court ? `Reservar esta cancha: ${court.id} ${court.name}` : undefined} onClick={(event) => open("reservation", event.currentTarget, court)}>
    {court ? "Reservar esta cancha" : "Reservar cancha"}
    {arrow && <ArrowUpRightIcon size={24} weight="light" aria-hidden="true" />}
  </button>;
}

export function TrainingInfoButton({ className = "" }: { className?: string }) {
  const open = useExperienceActions();
  return <button className={`text-link ${className}`} onClick={(event) => open("training", event.currentTarget)}>
    Sobre las clases <ArrowUpRightIcon size={22} weight="light" aria-hidden="true" />
  </button>;
}
