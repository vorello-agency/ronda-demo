import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { CommunityIntro } from "@/components/community-intro";
import { CommunityStory } from "@/components/community-story";
import { CourtsTransition } from "@/components/courts-transition";
import { CourtsSection } from "@/components/courts-section";
import { ClubFacilities } from "@/components/club-facilities";
import { ExperienceActions } from "@/components/experience-actions";
import { site } from "@/config/site";

export default function Home() {
  return <ExperienceActions>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <div id="inicio" />
    <SiteHeader />
    <main id="contenido" tabIndex={-1}>
      <Hero />
      <CommunityIntro />
      <CommunityStory />
      <CourtsTransition />
      <CourtsSection />
      <ClubFacilities />
    </main>
    <footer className="concept-note"><span>{site.name} · {site.descriptor}</span><span>Proyecto conceptual de {site.studio}. Fotografías generadas con IA.</span></footer>
  </ExperienceActions>;
}
