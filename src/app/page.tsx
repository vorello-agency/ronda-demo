import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { CommunityIntro } from "@/components/community-intro";
import { CommunityStory } from "@/components/community-story";
import { CourtsTransition } from "@/components/courts-transition";
import { CourtsSection } from "@/components/courts-section";
import { ClubFacilities } from "@/components/club-facilities";
import { TrainingSection } from "@/components/training-section";
import { TournamentsSection } from "@/components/tournaments-section";
import { FinalCta } from "@/components/final-cta";
import { SiteFooter } from "@/components/site-footer";
import { ExperienceActions } from "@/components/experience-actions";

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
      <TrainingSection />
      <TournamentsSection />
      <FinalCta />
    </main>
    <SiteFooter />
  </ExperienceActions>;
}
