import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import { site } from "@/config/site";
import { VorelloLogo } from "./vorello-logo";
import "./studio-credit.css";

/**
 * Atribución del estudio, la misma que en el footer de Lift: etiqueta, logotipo y acceso al portfolio.
 * La comparten el footer de la home y el de reservas para que no vuelvan a separarse.
 */
/** `logo` elige la versión oficial del logotipo según el fondo del footer. */
export function StudioCredit({ className = "", logo = "light" }: { className?: string; logo?: "light" | "dark" }) {
  return <div className={`studio-credit ${className}`}>
    <p className="studio-credit-label">Diseñado y desarrollado por</p>
    <a className="studio-credit-logo" href={site.studioUrl} target="_blank" rel="noopener noreferrer" aria-label={`${site.studio}, sitio del estudio (se abre en una pestaña nueva)`}>
      <VorelloLogo version={logo} />
    </a>
    <a className="studio-credit-portfolio" href={site.studioUrl} target="_blank" rel="noopener noreferrer">
      Explorar portfolio del estudio <ArrowUpRightIcon size={14} weight="regular" aria-hidden="true" />
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  </div>;
}
