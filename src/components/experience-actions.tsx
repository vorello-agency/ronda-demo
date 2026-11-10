"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRightIcon, XIcon } from "@phosphor-icons/react";
import { notices, type NoticeTopic } from "@/config/site";
import { containDialogFocus } from "@/lib/dialog";

/** Avisos informativos de la landing (hoy, solo clases). Reservar ya no abre un aviso: lleva a `/reservar`. */
type OpenNotice = (topic: NoticeTopic, returnTo?: HTMLElement) => void;
const ActionsContext = createContext<OpenNotice | null>(null);

export function useExperienceActions() {
  const context = useContext(ActionsContext);
  if (!context) throw new Error("ExperienceActions is required");
  return context;
}

export function ExperienceActions({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [topic, setTopic] = useState<NoticeTopic>("training");
  const destination = "entrenamiento";

  // Si se navega a otra ruta con el aviso abierto, el body no queda bloqueado.
  useEffect(() => () => document.body.classList.remove("has-modal"), []);

  const open: OpenNotice = (nextTopic, returnTo) => {
    returnFocus.current = returnTo ?? (document.activeElement as HTMLElement);
    setTopic(nextTopic);
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
          <h2 id="notice-title">{notices[topic].title}</h2>
          <p id="notice-description">{notices[topic].body}</p>
          <a className="button" href={`#${destination}`} onClick={() => {
            close();
            returnFocus.current = document.getElementById(destination);
          }}>Volver a entrenamiento <ArrowUpRightIcon size={22} weight="light" aria-hidden="true" /></a>
        </div>
      </dialog>
    </ActionsContext>
  );
}

export function TrainingInfoButton({ className = "" }: { className?: string }) {
  const open = useExperienceActions();
  return <button className={`text-link ${className}`} onClick={(event) => open("training", event.currentTarget)}>
    Sobre las clases <ArrowUpRightIcon size={22} weight="light" aria-hidden="true" />
  </button>;
}
