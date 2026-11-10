"use client";

import { useEffect, useRef, useState } from "react";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import { navigation, site } from "@/config/site";
import { containDialogFocus } from "@/lib/dialog";
import { useExperienceActions } from "./experience-actions";
import { ReserveLink } from "./reserve-link";

export function SiteHeader() {
  const menu = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const openNotice = useExperienceActions();

  function closeMenu() { menu.current?.close(); }

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onResize = () => {
      if (media.matches && menu.current?.open) {
        menu.current.close();
        document.querySelector<HTMLAnchorElement>(".brand")?.focus();
      }
    };
    media.addEventListener("change", onResize);
    return () => {
      media.removeEventListener("change", onResize);
      // Al navegar a otra ruta desde el menú, el header se desmonta antes de que llegue el evento `close`:
      // sin esto, `/reservar` quedaría con el scroll bloqueado.
      document.body.classList.remove("has-modal");
    };
  }, []);

  function navItems(mobile = false) {
    return navigation.map((item) => "href" in item
      ? <a key={item.label} href={item.href} onClick={() => {
          if (mobile) closeMenu();
          document.querySelector<HTMLElement>(item.href)?.focus({ preventScroll: true });
        }}>{item.label}</a>
      : <button key={item.label} onClick={(event) => {
          if (mobile) closeMenu();
          openNotice(item.topic, mobile ? toggle.current ?? undefined : event.currentTarget);
        }}>{item.label}</button>);
  }

  return <header className="site-header">
    <a className="brand" href="#inicio" aria-label={`${site.name} · ${site.descriptor}, inicio`}>
      <span className="wordmark">{site.name}</span>{" "}
      <span className="brand-descriptor">{site.descriptor}</span>
    </a>
    <nav className="desktop-nav" aria-label="Navegación principal">{navItems()}</nav>
    <ReserveLink className="header-reserve" arrow={false} />
    <button ref={toggle} id="menu-toggle" className="menu-toggle" aria-expanded={expanded} aria-controls="mobile-menu" aria-haspopup="dialog" onClick={() => {
      menu.current?.showModal();
      setExpanded(true);
      document.body.classList.add("has-modal");
    }}>Menú <ListIcon size={28} weight="light" aria-hidden="true" /></button>
    <dialog id="mobile-menu" ref={menu} className="mobile-menu" aria-labelledby="menu-title" onKeyDown={containDialogFocus} onClose={() => {
      setExpanded(false);
      // An information dialog may have opened immediately after selecting a menu item.
      if (!document.querySelector("dialog[open]")) document.body.classList.remove("has-modal");
    }} onClick={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
      <div className="mobile-menu-content">
        <div className="menu-topline">
          <span id="menu-title" className="eyebrow">{site.name} · {site.descriptor}</span>
          <button className="icon-button" aria-label="Cerrar menú" autoFocus onClick={closeMenu}><XIcon size={28} weight="light" aria-hidden="true" /></button>
        </div>
        <nav aria-label="Navegación móvil">{navItems(true)}</nav>
        <ReserveLink arrow={false} onClick={closeMenu} />
        <p className="menu-note">El juego tiene lugar.</p>
      </div>
    </dialog>
  </header>;
}
