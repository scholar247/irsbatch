import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { Stats } from "@/components/marketing/stats";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Benefits } from "@/components/marketing/benefits";
import { Faq } from "@/components/marketing/faq";
import { CtaSection } from "@/components/marketing/cta-section";
import { Footer } from "@/components/marketing/footer";
import { getPublicStats } from "@/lib/reports/public-stats";

export default async function Home() {
  const stats = await getPublicStats();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Hero totalContributed={stats.totalContributed} />
        <Stats stats={stats} />
        <HowItWorks />
        <Benefits />
        <Faq />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
