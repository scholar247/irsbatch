import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";
import { RulesGate } from "@/components/rules/rules-gate";

export const metadata = { title: "Rules & Regulations — IRS Batch 2007 Community" };

export default function RulesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1 py-20">
        <Container>
          <RulesGate />
        </Container>
      </main>
      <Footer />
    </div>
  );
}
