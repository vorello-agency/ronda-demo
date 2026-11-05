import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { ExperienceActions } from "@/components/experience-actions";
import { site } from "@/config/site";

export default function Home() {
  return <ExperienceActions>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <div id="inicio" />
    <SiteHeader />
    <main id="contenido" tabIndex={-1}>
      <Hero />
    </main>
    <footer className="concept-note"><span>{site.name} · {site.descriptor}</span><span>Proyecto conceptual de {site.studio}. Fotografías generadas con IA.</span></footer>
  </ExperienceActions>;
}
