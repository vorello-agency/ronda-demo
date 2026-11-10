import { Fragment } from "react";
import Image from "next/image";
import { courts, type Court } from "@/data/courts";
import { ReserveLink } from "./reserve-link";
import "./courts-section.css";

function CourtDetails({ court }: { court: Court }) {
  return <div className="ronda-court-details">
    <div className="ronda-court-description">
      <h4>{court.character}</h4>
      <p>{court.description.map((line, index) => index === 0 ? line : <Fragment key={index}>{" "}<span className="editorial-break">{line}</span></Fragment>)}</p>
    </div>
    <dl className="ronda-court-specs">
      <div><dt>Superficie</dt><dd>{court.surface}<span>{court.surfaceDetail}</span></dd></div>
      <div><dt>El espacio</dt><dd>{court.setting}<span>{court.lighting}</span></dd></div>
    </dl>
    <ReserveLink className="ronda-court-reserve" court={{ id: court.id, name: court.name, surface: court.surface }} />
  </div>;
}

/** Image widths follow the layout: Central spans the page, the clay spread is a 1.5fr / 1fr grid. */
const imageSizes = {
  featured: "(min-width: 768px) 92vw, 100vw",
  wide: "(min-width: 768px) 55vw, 100vw",
  narrow: "(min-width: 768px) 34vw, 100vw",
};

function CourtArticle({ court, layout }: { court: Court; layout: keyof typeof imageSizes }) {
  const featured = layout === "featured";
  return <article className={`ronda-court ${featured ? "ronda-court-featured" : "ronda-court-secondary"}`} id={court.anchor} tabIndex={-1} aria-labelledby={`${court.anchor}-title`}>
    <header className="ronda-court-heading">
      <span className="ronda-court-index"><span className="sr-only">Cancha </span>{court.id}</span>
      <h3 id={`${court.anchor}-title`}>{court.name}</h3>
      <span className="ronda-court-surface">{court.surface}</span>
    </header>
    <div className="ronda-court-image">
      <Image src={court.image.src} width={court.image.width} height={court.image.height} alt={court.image.alt} sizes={imageSizes[layout]} quality={85} />
    </div>
    <CourtDetails court={court} />
  </article>;
}

/** Independent court entries stay usable when a future overview is added before them. */
export function CourtsSection() {
  const [central, ...clayCourts] = courts;
  return <section className="ronda-courts" id="canchas" tabIndex={-1} aria-labelledby="courts-title">
    <div className="ronda-courts-topline">
      <h2 className="eyebrow" id="courts-title">Las canchas · Elegí tu terreno</h2>
      <a className="text-link" href="#instalaciones">Conocé las instalaciones <span aria-hidden="true">↓</span></a>
    </div>
    <CourtArticle court={central} layout="featured" />
    <div className="ronda-clay-spread">{clayCourts.map((court, index) => <CourtArticle key={court.id} court={court} layout={index === 0 ? "wide" : "narrow"} />)}</div>
  </section>;
}
